import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { GarajeDatosService } from '@core/services/garaje-datos.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';
import { Rtm, Soat } from '@core/models/models';
import { estadoVencimiento, formatoFecha, TipoChip } from '@shared/utils/garaje.util';

type TipoDocumento = 'soat' | 'rtm';

interface Dato {
  etiqueta: string;
  valor: string;
  icono: string;
  chip?: { texto: string; tipo: TipoChip };
}

/**
 * Frame Figma "Detalle Documento RTM" (2:1410), generalizado a SOAT y RTM.
 *
 * Ruta `/app/documentos/:tipo/:id`. Lee el documento de su tabla, muestra el
 * estado de vigencia calculado y permite editarlo (reusa el formulario de
 * alta con `?editar=<id>`) o eliminarlo.
 */
@Component({
  selector: 'app-document-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="volverA()" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ esSoat() ? 'Detalle del SOAT' : 'Detalle de la RTM' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="rod-container doc">
        @if (cargando()) {
          <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (!doc()) {
          <div class="rod-empty">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <h2>Documento no encontrado</h2>
            <p>Puede que se haya eliminado o que no pertenezca a tu cuenta.</p>
            <ion-button class="rod-btn-primary" routerLink="/app/garaje">Volver al garaje</ion-button>
          </div>
        } @else {
          <section class="hero">
            <ion-icon name="bicycle" class="hero-bg" aria-hidden="true"></ion-icon>
            <div class="hero-text">
              <span [class]="'rod-chip ' + estado()!.tipo">{{ estado()!.texto }}</span>
              <h1>{{ esSoat() ? 'Póliza SOAT' : 'Certificado RTM' }}</h1>
              <p>
                {{ esSoat() ? 'Seguro Obligatorio de Accidentes de Tránsito' : 'Revisión Técnico-Mecánica' }}
                @if (nombreMoto()) {
                  · {{ nombreMoto() }}
                }
              </p>
            </div>
          </section>

          <p class="rod-section-label">Información del documento</p>
          <div class="rod-list">
            @for (d of datos(); track d.etiqueta) {
              <div class="rod-list-item">
                <span class="rod-icon-tile"><ion-icon [name]="d.icono" aria-hidden="true"></ion-icon></span>
                <span class="rod-list-text">
                  <small>{{ d.etiqueta }}</small>
                  <strong>{{ d.valor }}</strong>
                </span>
                @if (d.chip) {
                  <span [class]="'rod-chip ' + d.chip.tipo">{{ d.chip.texto }}</span>
                }
              </div>
            }
          </div>

          <div class="rod-info-note note">
            <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
            <span>
              @if (esSoat()) {
                El SOAT es obligatorio para circular y cubre gastos médicos de las víctimas de un
                accidente. Renuévalo antes de su vencimiento para evitar multas e inmovilización.
              } @else {
                La Revisión Técnico-Mecánica es obligatoria para garantizar que tu motocicleta cumple
                con los estándares de seguridad y emisiones. Recuerda renovarla antes de su vencimiento.
              }
            </span>
          </div>

          <div class="acciones">
            <ion-button
              class="rod-btn-primary"
              shape="round"
              expand="block"
              [routerLink]="'/app/garaje/' + tipo() + '/nuevo'"
              [queryParams]="{ editar: id() }"
            >
              <ion-icon slot="start" name="create-outline" aria-hidden="true"></ion-icon>
              Editar información
            </ion-button>
            <ion-button color="danger" fill="clear" expand="block" [disabled]="eliminando()" (click)="eliminar()">
              <ion-icon slot="start" name="trash-outline" aria-hidden="true"></ion-icon>
              Eliminar documento
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .doc {
        max-width: 560px;
        padding-bottom: 40px;
      }
      .hero {
        position: relative;
        overflow: hidden;
        min-height: 150px;
        display: flex;
        align-items: flex-end;
        padding: 18px;
        border-radius: var(--rod-radius-card);
        border: 1px solid var(--rod-border);
        background:
          linear-gradient(180deg, rgba(var(--rod-bg-base-rgb), 0.1) 0%, rgba(var(--rod-bg-base-rgb), 0.92) 85%),
          radial-gradient(circle at 75% 25%, rgba(17, 180, 212, 0.35), transparent 60%),
          var(--rod-bg-alt);
      }
      .hero-bg {
        position: absolute;
        right: -10px;
        top: -12px;
        font-size: 170px;
        color: rgba(17, 180, 212, 0.18);
      }
      .hero-text {
        position: relative;
        h1 {
          margin: 8px 0 2px;
          font-family: var(--rod-font-heading);
          font-size: 24px;
          font-weight: 700;
          color: var(--rod-text-heading);
        }
        p {
          margin: 0;
          font-size: 13px;
          color: var(--rod-text-secondary);
        }
      }
      .note {
        margin-top: 16px;
      }
      .acciones {
        margin-top: 24px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
})
export class DocumentDetailPage implements ViewWillEnter {
  private readonly supabase = inject(SupabaseService);
  private readonly garaje = inject(GarajeDatosService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  /** Parametros de ruta `/app/documentos/:tipo/:id`. */
  readonly tipo = input.required<string>();
  readonly id = input.required<string>();

  readonly doc = signal<Soat | Rtm | null>(null);
  readonly cargando = signal(true);
  readonly eliminando = signal(false);

  readonly esSoat = computed(() => this.tipo() === 'soat');

  readonly moto = computed(() => {
    const d = this.doc();
    return d ? (this.garaje.motos().find((m) => m.id === d.moto_id) ?? null) : null;
  });

  readonly nombreMoto = computed(() => {
    const m = this.moto();
    return m ? `${m.marca} ${m.modelo}` : '';
  });

  readonly volverA = computed(() => {
    const d = this.doc();
    return d ? `/app/garaje/detalle/${d.moto_id}` : '/app/garaje';
  });

  readonly estado = computed(() => {
    const d = this.doc();
    return d ? estadoVencimiento(d.fecha_vencimiento) : null;
  });

  readonly datos = computed<Dato[]>(() => {
    const d = this.doc();
    const estado = this.estado();
    if (!d || !estado) return [];
    const chip = estado.tipo === 'ok' ? undefined : { texto: estado.texto, tipo: estado.tipo };

    if (this.esSoat()) {
      const s = d as Soat;
      return [
        { etiqueta: 'Número de póliza', valor: s.numero_poliza, icono: 'document-text-outline' },
        { etiqueta: 'Aseguradora', valor: s.aseguradora, icono: 'briefcase-outline' },
        { etiqueta: 'Fecha de inicio', valor: formatoFecha(s.fecha_inicio), icono: 'calendar-outline' },
        { etiqueta: 'Fecha de vencimiento', valor: formatoFecha(s.fecha_vencimiento), icono: 'calendar-outline', chip },
      ];
    }
    const r = d as Rtm;
    return [
      { etiqueta: 'Número de certificado', valor: r.numero_certificado, icono: 'document-text-outline' },
      { etiqueta: 'Centro de diagnóstico (CDA)', valor: r.nombre_cda, icono: 'briefcase-outline' },
      { etiqueta: 'Fecha de expedición', valor: formatoFecha(r.fecha_expedicion), icono: 'calendar-outline' },
      { etiqueta: 'Fecha de vencimiento', valor: formatoFecha(r.fecha_vencimiento), icono: 'calendar-outline', chip },
    ];
  });

  ionViewWillEnter(): void {
    // Se recarga al volver de "Editar información".
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const tipo = this.tipo() as TipoDocumento;
    if (tipo !== 'soat' && tipo !== 'rtm') {
      this.doc.set(null);
      this.cargando.set(false);
      return;
    }
    try {
      void this.garaje.cargar(); // para el nombre de la moto
      const { data, error } =
        tipo === 'soat' ? await this.supabase.getSoat(this.id()) : await this.supabase.getRtm(this.id());
      if (error) throw error;
      this.doc.set((data as Soat | Rtm | null) ?? null);
    } catch (error) {
      this.doc.set(null);
      await this.notify.error('No se pudo cargar el documento.');
      console.error('[DocumentDetailPage] cargar', error);
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminar(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    const ok = await this.notify.confirm(
      'Eliminar documento',
      'Se borrará este documento y dejarás de recibir alertas de su vencimiento. ¿Continuar?',
      'Eliminar',
    );
    if (!ok) return;

    this.eliminando.set(true);
    try {
      const { error } = this.esSoat()
        ? await this.supabase.eliminarSoat(d.id)
        : await this.supabase.eliminarRtm(d.id);
      if (error) throw error;
      await this.garaje.cargar(true);
      await this.notify.success('Documento eliminado.');
      await this.router.navigateByUrl(`/app/garaje/detalle/${d.moto_id}`, { replaceUrl: true });
    } catch (error) {
      await this.notify.error('No se pudo eliminar el documento.');
      console.error('[DocumentDetailPage] eliminar', error);
    } finally {
      this.eliminando.set(false);
    }
  }
}
