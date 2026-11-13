import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

import { Moto, Rtm, Soat } from '../models/models';
import { documentoVigente, fechaLocal, formatoFecha } from '@shared/utils/garaje.util';

/** Dias antes del vencimiento en que se avisa (0 = el mismo dia). */
export const DIAS_RECORDATORIO = [30, 7, 1, 0] as const;

/** Hora local a la que salen los recordatorios. */
const HORA_AVISO = 9;

/** iOS no admite mas de 64 notificaciones pendientes por app. */
const MAX_PENDIENTES = 60;

const CANAL_ID = 'vencimientos';
const PREF_ACTIVO = 'rodapp.recordatorios.vencimientos';

export type EstadoPermiso = 'concedido' | 'denegado' | 'pendiente' | 'no-disponible';

/**
 * Recordatorios LOCALES de vencimiento de SOAT y RTM
 * (`@capacitor/local-notifications`).
 *
 * El propio telefono programa los avisos 30, 7 y 1 dia antes y el dia del
 * vencimiento, a las 9:00. No necesita servidor ni internet, pero solo
 * existen en el dispositivo donde se programaron.
 *
 * Estrategia: cada vez que cambian los datos del garaje se llama
 * `sincronizar()`, que cancela lo pendiente y vuelve a programar segun los
 * documentos vigentes (asi un documento editado o eliminado no deja avisos
 * huerfanos). Si nada cambio, no toca el sistema.
 *
 * En web no hace nada: el navegador no puede avisar con la pestana cerrada.
 */
@Injectable({ providedIn: 'root' })
export class RecordatoriosService {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  readonly disponible = Capacitor.isNativePlatform();

  private readonly _activo = signal(true);
  private readonly _permiso = signal<EstadoPermiso>(this.disponible ? 'pendiente' : 'no-disponible');

  /** Preferencia del usuario (Ajustes > Alertas de vencimiento). */
  readonly activo = this._activo.asReadonly();
  readonly permiso = this._permiso.asReadonly();

  /** Firma de lo ultimo programado, para no reprogramar si nada cambio. */
  private ultimaFirma: string | null = null;
  /** Serializa las sincronizaciones (pueden llegar varias seguidas). */
  private cola: Promise<void> = Promise.resolve();
  private listo: Promise<void> | null = null;

  /** Se llama al arrancar (AppComponent); idempotente. */
  init(): Promise<void> {
    this.listo ??= this.iniciar().catch((error) =>
      console.error('[RecordatoriosService] init', error),
    );
    return this.listo;
  }

  private async iniciar(): Promise<void> {
    const { value } = await Preferences.get({ key: PREF_ACTIVO });
    this._activo.set(value !== 'false');

    if (!this.disponible) return;

    await this.leerPermiso();

    if (Capacitor.getPlatform() === 'android') {
      // Android 8+: el canal define sonido e importancia del aviso.
      await LocalNotifications.createChannel({
        id: CANAL_ID,
        name: 'Vencimientos de documentos',
        description: 'Avisos antes de que venzan el SOAT y la tecnomecánica',
        importance: 4,
        visibility: 1,
      }).catch(() => undefined);
    }

    // Tocar el aviso abre el documento correspondiente.
    await LocalNotifications.addListener('localNotificationActionPerformed', (accion) => {
      const ruta = accion.notification.extra?.ruta as string | undefined;
      if (ruta?.startsWith('/app/')) {
        this.zone.run(() => void this.router.navigateByUrl(ruta));
      }
    });
  }

  /** Activa o desactiva los recordatorios (persistido en el dispositivo). */
  async setActivo(activo: boolean): Promise<void> {
    this._activo.set(activo);
    this.ultimaFirma = null;
    await Preferences.set({ key: PREF_ACTIVO, value: String(activo) });
  }

  /** Reprograma los avisos segun los documentos vigentes de cada moto. */
  sincronizar(motos: Moto[], soats: Soat[], rtms: Rtm[]): Promise<void> {
    this.cola = this.cola
      .then(() => this.programar(motos, soats, rtms))
      .catch((error) => console.error('[RecordatoriosService] sincronizar', error));
    return this.cola;
  }

  /** Borra todos los avisos pendientes (p. ej. al cerrar sesion). */
  cancelarTodos(): Promise<void> {
    return this.sincronizar([], [], []);
  }

  private async programar(motos: Moto[], soats: Soat[], rtms: Rtm[]): Promise<void> {
    if (!this.disponible) return;
    await this.init(); // la preferencia guardada debe estar leida antes de programar

    const avisos = this._activo() ? this.construirAvisos(motos, soats, rtms) : [];
    const firma = JSON.stringify(avisos.map((a) => [a.title, a.body, a.schedule?.at?.getTime()]));
    if (firma === this.ultimaFirma) return;

    await this.cancelarPendientes();

    if (avisos.length > 0 && (await this.asegurarPermiso())) {
      await LocalNotifications.schedule({ notifications: avisos });
    }
    this.ultimaFirma = firma;
  }

  private construirAvisos(motos: Moto[], soats: Soat[], rtms: Rtm[]): LocalNotificationSchema[] {
    const ahora = Date.now();
    const avisos: LocalNotificationSchema[] = [];

    for (const moto of motos) {
      const docs = [
        { etiqueta: 'SOAT', tipo: 'soat', doc: documentoVigente(soats, moto.id!) },
        { etiqueta: 'Tecnomecánica', tipo: 'rtm', doc: documentoVigente(rtms, moto.id!) },
      ];
      for (const { etiqueta, tipo, doc } of docs) {
        if (!doc) continue;
        const vence = fechaLocal(doc.fecha_vencimiento);

        for (const dias of DIAS_RECORDATORIO) {
          const at = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate() - dias, HORA_AVISO);
          if (at.getTime() <= ahora + 60_000) continue; // ya paso

          const cuando =
            dias === 0 ? 'vence hoy' : dias === 1 ? 'vence mañana' : `vence en ${dias} días`;
          avisos.push({
            id: 0, // se asigna abajo
            title: `${etiqueta} ${dias === 0 ? 'vence hoy' : 'por vencer'} · ${moto.marca} ${moto.modelo}`,
            body: `El ${etiqueta} de la placa ${moto.placa} ${cuando} (${formatoFecha(doc.fecha_vencimiento)}). Renuévalo para evitar multas.`,
            schedule: { at, allowWhileIdle: true },
            channelId: CANAL_ID,
            extra: { ruta: `/app/documentos/${tipo}/${doc.id}` },
          });
        }
      }
    }

    // Los mas proximos primero; ids secuenciales (se cancelan todos antes de programar).
    return avisos
      .sort((a, b) => a.schedule!.at!.getTime() - b.schedule!.at!.getTime())
      .slice(0, MAX_PENDIENTES)
      .map((a, i) => ({ ...a, id: i + 1 }));
  }

  private async cancelarPendientes(): Promise<void> {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
    }
  }

  private async leerPermiso(): Promise<void> {
    const { display } = await LocalNotifications.checkPermissions();
    this._permiso.set(display === 'granted' ? 'concedido' : display === 'denied' ? 'denegado' : 'pendiente');
  }

  /** Pide permiso solo cuando hay algo que programar (Android 13+ / iOS). */
  private async asegurarPermiso(): Promise<boolean> {
    await this.leerPermiso();
    if (this._permiso() === 'pendiente') {
      const { display } = await LocalNotifications.requestPermissions();
      this._permiso.set(display === 'granted' ? 'concedido' : 'denegado');
    }
    return this._permiso() === 'concedido';
  }
}
