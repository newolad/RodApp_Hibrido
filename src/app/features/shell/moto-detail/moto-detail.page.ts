import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { GarajeDatosService } from '@core/services/garaje-datos.service';
import {
  documentoVigente,
  estadoVencimiento,
  formatoFecha,
  formatoKm,
  formatoMoneda,
} from '@shared/utils/garaje.util';

/**
 * Frames Figma "Garaje (Sin Documentos) 1 y 2" (7:4036 / 7:4140).
 *
 * Ficha de una moto (`/app/garaje/detalle/:id`): datos principales, km actual
 * estimado, documentos vigentes (SOAT / RTM) con su estado y las ultimas
 * tanqueadas y mantenimientos. Todo sale de `GarajeDatosService`.
 */
@Component({
  selector: 'app-moto-detail',
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
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/garaje" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle de moto</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="rod-container">
        @if (!datos.cargado()) {
          <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (!moto()) {
          <div class="rod-empty">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <h2>Moto no encontrada</h2>
            <p>Puede que se haya eliminado o que no pertenezca a tu cuenta.</p>
            <ion-button class="rod-btn-primary" routerLink="/app/garaje">Volver al garaje</ion-button>
          </div>
        } @else {
          @let m = moto()!;
          <div class="rod-card ficha">
            <div class="foto"><ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon></div>
            <div class="ficha-txt">
              <h1 class="rod-heading">{{ m.marca }} {{ m.modelo }}</h1>
              <p class="rod-subheading">
                <span class="plate">{{ m.placa }}</span>
                @if (m.cilindrada) {
                  · {{ m.cilindrada }} cc
                }
              </p>
              <p class="km">{{ km() }}</p>
            </div>
          </div>

          @if (datos.error()) {
            <div class="rod-info-note aviso-error">
              <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
              <span>No se pudieron cargar todos los registros. Desliza hacia abajo para reintentar.</span>
            </div>
          }

          <!-- Documentos -->
          <section>
            <p class="rod-section-label">Documentos</p>
            <div class="rod-list">
              @for (d of documentos(); track d.etiqueta) {
                @if (d.doc) {
                  <a class="rod-list-item" [routerLink]="d.rutaDetalle">
                    <span class="rod-icon-tile"><ion-icon [name]="d.icono" aria-hidden="true"></ion-icon></span>
                    <span class="rod-list-text">
                      <small>{{ d.etiqueta }}</small>
                      <strong>Vence {{ formatoFecha(d.doc.fecha_vencimiento) }}</strong>
                    </span>
                    <span [class]="'rod-chip ' + d.estado!.tipo">{{ d.estado!.texto }}</span>
                  </a>
                } @else {
                  <a class="rod-list-item pendiente" [routerLink]="d.rutaNuevo" [queryParams]="{ moto: m.id }">
                    <span class="rod-icon-tile"><ion-icon [name]="d.icono" aria-hidden="true"></ion-icon></span>
                    <span class="rod-list-text">
                      <small>{{ d.etiqueta }}</small>
                      <strong>Sin registrar</strong>
                    </span>
                    <ion-icon class="rod-list-chev" name="add-circle-outline" aria-hidden="true"></ion-icon>
                  </a>
                }
              }
            </div>
          </section>

          <!-- Mantenimiento -->
          <section>
            <div class="sec-head">
              <p class="rod-section-label">Mantenimiento</p>
              <ion-button fill="clear" size="small" routerLink="/app/mantenimiento/nuevo" [queryParams]="{ moto: m.id }">
                Añadir
              </ion-button>
            </div>
            @if (mantenimientos().length === 0) {
              <p class="vacio-linea">Aún no hay tareas registradas.</p>
            } @else {
              <div class="rod-list">
                @for (r of mantenimientos(); track r.id) {
                  <div class="rod-list-item">
                    <span class="rod-icon-tile"><ion-icon name="build-outline" aria-hidden="true"></ion-icon></span>
                    <span class="rod-list-text">
                      <small>{{ formatoFecha(r.fecha) }} · {{ formatoKm(r.kilometraje) }}</small>
                      <strong>{{ r.tipo }}</strong>
                    </span>
                    @if (r.costo) {
                      <span class="monto">{{ formatoMoneda(r.costo) }}</span>
                    }
                  </div>
                }
              </div>
            }
          </section>

          <!-- Combustible -->
          <section>
            <div class="sec-head">
              <p class="rod-section-label">Combustible</p>
              <ion-button fill="clear" size="small" routerLink="/app/combustible/nuevo" [queryParams]="{ moto: m.id }">
                Añadir
              </ion-button>
            </div>
            @if (tanqueadas().length === 0) {
              <p class="vacio-linea">Aún no hay tanqueadas registradas.</p>
            } @else {
              <div class="rod-list">
                @for (r of tanqueadas(); track r.id) {
                  <div class="rod-list-item">
                    <span class="rod-icon-tile"><ion-icon name="water-outline" aria-hidden="true"></ion-icon></span>
                    <span class="rod-list-text">
                      <small>{{ formatoFecha(r.created_at) }} · {{ formatoKm(r.kilometraje) }}</small>
                      <strong>{{ r.tipo_gasolina }}{{ r.lugar ? ' · ' + r.lugar : '' }}</strong>
                    </span>
                    <span class="monto">{{ formatoMoneda(r.costo) }}</span>
                  </div>
                }
              </div>
            }
          </section>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ficha {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 8px;
      }
      .ficha .foto {
        width: 72px;
        height: 72px;
        flex: none;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: var(--rod-bg-base);
      }
      .ficha .foto ion-icon {
        font-size: 34px;
        color: var(--ion-color-primary);
      }
      .ficha-txt {
        min-width: 0;
      }
      .ficha .km {
        margin: 6px 0 0;
        font-size: 13px;
        color: var(--ion-color-primary);
        font-weight: 600;
      }
      .plate {
        padding: 1px 6px;
        border-radius: 5px;
        background: #f5c518;
        border: 1.5px solid #1a1c1e;
        color: #1a1c1e;
        font-family: var(--rod-font-heading);
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 1px;
      }
      section {
        margin-top: 24px;
      }
      .sec-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sec-head .rod-section-label {
        margin: 0;
      }
      .pendiente strong {
        color: var(--rod-text-secondary);
      }
      .monto {
        flex: none;
        font-size: 13px;
        font-weight: 600;
        color: var(--rod-text-heading);
      }
      .vacio-linea {
        font-size: 13px;
        color: var(--rod-text-secondary);
        margin: 8px 0 0;
      }
      .aviso-error {
        margin-top: 12px;
      }
    `,
  ],
})
export class MotoDetailPage implements ViewWillEnter {
  readonly datos = inject(GarajeDatosService);

  /** `:id` de la ruta (enlazado por `withComponentInputBinding`). */
  readonly id = input.required<string>();

  readonly formatoFecha = formatoFecha;
  readonly formatoKm = formatoKm;
  readonly formatoMoneda = formatoMoneda;

  readonly moto = computed(() => this.datos.motos().find((m) => m.id === this.id()) ?? null);

  readonly km = computed(() => {
    const m = this.moto();
    return m ? formatoKm(this.datos.kmActualDe(m)) : '';
  });

  readonly documentos = computed(() => {
    const id = this.id();
    const soat = documentoVigente(this.datos.soats(), id);
    const rtm = documentoVigente(this.datos.rtms(), id);
    return [
      {
        etiqueta: 'SOAT',
        icono: 'shield-checkmark-outline',
        doc: soat,
        estado: soat ? estadoVencimiento(soat.fecha_vencimiento) : null,
        rutaDetalle: soat ? `/app/documentos/soat/${soat.id}` : '',
        rutaNuevo: '/app/garaje/soat/nuevo',
      },
      {
        etiqueta: 'Tecnomecánica (RTM)',
        icono: 'document-text-outline',
        doc: rtm,
        estado: rtm ? estadoVencimiento(rtm.fecha_vencimiento) : null,
        rutaDetalle: rtm ? `/app/documentos/rtm/${rtm.id}` : '',
        rutaNuevo: '/app/garaje/rtm/nuevo',
      },
    ];
  });

  readonly mantenimientos = computed(() =>
    this.datos
      .mantenimientos()
      .filter((r) => r.moto_id === this.id())
      .slice(0, 5),
  );

  readonly tanqueadas = computed(() =>
    this.datos
      .combustible()
      .filter((r) => r.moto_id === this.id())
      .slice(0, 5),
  );

  ionViewWillEnter(): void {
    // Refresca al volver de un formulario (SOAT, RTM, tanqueada...).
    void this.datos.cargar(true);
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.datos.cargar(true);
    (event.target as HTMLIonRefresherElement).complete();
  }
}
