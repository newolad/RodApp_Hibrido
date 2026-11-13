import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { MotosService } from './motos.service';
import { RecordatoriosService } from './recordatorios.service';
import { SupabaseService } from './supabase.service';
import {
  Moto,
  RegistroCombustible,
  RegistroMantenimiento,
  Rtm,
  Soat,
} from '../models/models';
import {
  TipoChip,
  UMBRAL_VIDA_UTIL,
  documentoVigente,
  estadoComponentes,
  estadoVencimiento,
  formatoKm,
  kmActual,
} from '@shared/utils/garaje.util';

/** Alerta calculada a partir de los datos (no se guarda en la base). */
export interface Alerta {
  id: string;
  tipo: TipoChip;
  icono: string;
  titulo: string;
  detalle: string;
  /** Ruta a la que lleva tocar la alerta (y sus query params, si tiene). */
  ruta: string;
  query?: Record<string, string>;
}

/**
 * Datos agregados de TODAS las motos del usuario: SOAT, RTM, tanqueadas y
 * mantenimientos, mas las alertas que se derivan de ellos (documentos por
 * vencer / vencidos y mantenimientos proximos).
 *
 * Se carga con una consulta por tabla (no una por moto) y se cachea en
 * signals; las vistas llaman `cargar()` al entrar y `cargar(true)` tras
 * guardar algo para refrescar.
 */
@Injectable({ providedIn: 'root' })
export class GarajeDatosService {
  private readonly supabase = inject(SupabaseService);
  private readonly motosService = inject(MotosService);
  private readonly recordatorios = inject(RecordatoriosService);

  private readonly _soats = signal<Soat[]>([]);
  private readonly _rtms = signal<Rtm[]>([]);
  private readonly _combustible = signal<RegistroCombustible[]>([]);
  private readonly _mantenimientos = signal<RegistroMantenimiento[]>([]);
  private readonly _cargando = signal(false);
  private readonly _cargado = signal(false);
  private readonly _error = signal(false);
  private enCurso: Promise<void> | null = null;
  private duenoActual: string | null = null;

  constructor() {
    const auth = inject(AuthService);
    // Igual que MotosService: descarta el cache si cambia el usuario.
    effect(
      () => {
        const userId = auth.sesion()?.userId ?? null;
        if (userId !== this.duenoActual) {
          const habiaSesion = this.duenoActual !== null;
          this.duenoActual = userId;
          this.reset();
          // Al cerrar sesion, el telefono no debe seguir avisando de sus documentos.
          if (habiaSesion) void this.recordatorios.cancelarTodos();
        }
      },
      { allowSignalWrites: true },
    );
  }

  readonly motos = this.motosService.motos;
  readonly soats = this._soats.asReadonly();
  readonly rtms = this._rtms.asReadonly();
  readonly combustible = this._combustible.asReadonly();
  readonly mantenimientos = this._mantenimientos.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly cargado = this._cargado.asReadonly();
  readonly error = this._error.asReadonly();

  /** Alertas activas de todas las motos, de la mas grave a la menos. */
  readonly alertas = computed<Alerta[]>(() => {
    const alertas: Alerta[] = [];
    const varias = this.motos().length > 1;

    for (const moto of this.motos()) {
      const nombre = varias ? ` · ${moto.marca} ${moto.modelo}` : '';
      const detalleMoto = `/app/garaje/detalle/${moto.id}`;

      const docs: Array<{ etiqueta: string; doc: Soat | Rtm | null; ruta: string }> = [
        { etiqueta: 'SOAT', doc: documentoVigente(this._soats(), moto.id!), ruta: 'soat' },
        { etiqueta: 'Tecnomecánica', doc: documentoVigente(this._rtms(), moto.id!), ruta: 'rtm' },
      ];
      for (const { etiqueta, doc, ruta } of docs) {
        if (!doc) {
          alertas.push({
            id: `sin-${ruta}-${moto.id}`,
            tipo: 'warn',
            icono: 'document-text-outline',
            titulo: `Sin ${etiqueta} registrado${nombre}`,
            detalle: 'Regístralo para recibir avisos antes de que venza.',
            ruta: `/app/garaje/${ruta}/nuevo`,
            query: { moto: moto.id! },
          });
          continue;
        }
        const estado = estadoVencimiento(doc.fecha_vencimiento);
        if (estado.tipo === 'ok') continue;
        alertas.push({
          id: `${ruta}-${doc.id}`,
          tipo: estado.tipo,
          icono: estado.tipo === 'danger' ? 'alert-circle-outline' : 'calendar-outline',
          titulo:
            estado.tipo === 'danger' ? `${etiqueta} vencido${nombre}` : `${etiqueta} por vencer${nombre}`,
          detalle:
            estado.tipo === 'danger'
              ? `Venció hace ${Math.abs(estado.dias)} días. Renuévalo para evitar multas.`
              : estado.dias === 0
                ? 'Vence hoy.'
                : `Vence en ${estado.dias} días.`,
          ruta: `/app/documentos/${ruta}/${doc.id}`,
        });
      }

      for (const c of this.componentesDe(moto)) {
        if (c.vidaUtil === null || c.vidaUtil > UMBRAL_VIDA_UTIL) continue;
        const atrasado = (c.kmRestantes ?? 0) <= 0;
        alertas.push({
          id: `mant-${c.ultimo.id}`,
          tipo: atrasado ? 'danger' : 'warn',
          icono: 'build-outline',
          titulo: `${c.tipo}${nombre}`,
          detalle: atrasado
            ? `Atrasado ${formatoKm(Math.abs(c.kmRestantes ?? 0))}.`
            : `Faltan ~${formatoKm(c.kmRestantes)} para el próximo servicio.`,
          ruta: varias ? detalleMoto : '/app/mantenimiento',
        });
      }
    }

    const peso: Record<TipoChip, number> = { danger: 0, warn: 1, ok: 2 };
    return alertas.sort((a, b) => peso[a.tipo] - peso[b.tipo]);
  });

  /** Carga (o reutiliza) los datos. `forzar` vuelve a consultar aunque ya esten. */
  cargar(forzar = false): Promise<void> {
    if (this.enCurso) return this.enCurso;
    if (this._cargado() && !forzar) return Promise.resolve();
    this.enCurso = this.consultar().finally(() => (this.enCurso = null));
    return this.enCurso;
  }

  kmActualDe(moto: Moto): number {
    return kmActual(moto, this._combustible(), this._mantenimientos());
  }

  componentesDe(moto: Moto) {
    return estadoComponentes(moto.id!, this._mantenimientos(), this.kmActualDe(moto));
  }

  /** Reprograma los recordatorios locales con los datos actuales (p. ej. al cambiar Ajustes). */
  sincronizarRecordatorios(): Promise<void> {
    return this.recordatorios.sincronizar(this.motos(), this._soats(), this._rtms());
  }

  /** Limpia el cache (al cerrar sesion, para no mostrar datos de otra cuenta). */
  reset(): void {
    this._soats.set([]);
    this._rtms.set([]);
    this._combustible.set([]);
    this._mantenimientos.set([]);
    this._cargado.set(false);
    this._error.set(false);
  }

  private async consultar(): Promise<void> {
    this._cargando.set(true);
    this._error.set(false);
    try {
      await this.motosService.cargar();
      const ids = this.motos()
        .map((m) => m.id!)
        .filter(Boolean);
      if (ids.length === 0) {
        this.reset();
        void this.sincronizarRecordatorios();
        return;
      }

      const [soat, rtm, comb, mant] = await Promise.all([
        this.supabase.getSoatsPorMotos(ids),
        this.supabase.getRtmPorMotos(ids),
        this.supabase.getCombustiblePorMotos(ids),
        this.supabase.getMantenimientosPorMotos(ids),
      ]);
      const error = soat.error ?? rtm.error ?? comb.error ?? mant.error;
      if (error) throw error;

      this._soats.set((soat.data as Soat[]) ?? []);
      this._rtms.set((rtm.data as Rtm[]) ?? []);
      this._combustible.set((comb.data as RegistroCombustible[]) ?? []);
      this._mantenimientos.set((mant.data as RegistroMantenimiento[]) ?? []);
      void this.sincronizarRecordatorios();
    } catch (error) {
      this._error.set(true);
      console.error('[GarajeDatosService] cargar', error);
    } finally {
      this._cargando.set(false);
      this._cargado.set(true);
    }
  }
}
