import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { GarajeDatosService } from '@core/services/garaje-datos.service';
import { UMBRAL_VIDA_UTIL, formatoFecha, formatoKm } from '@shared/utils/garaje.util';

/**
 * Frame Figma "Mantenimiento y Alertas" (2:2).
 *
 * Por cada tipo de mantenimiento registrado (aceite, kit de arrastre...) toma
 * el ultimo registro y, si tiene "repetir cada X km", calcula la vida util
 * restante contra el km actual estimado de la moto. Destaca el mas urgente.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
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
        <ion-title>Mantenimiento</ion-title>
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            size="small"
            routerLink="/app/mantenimiento/nuevo"
            [queryParams]="queryMoto()"
            aria-label="Registrar tarea"
          >
            <ion-icon slot="icon-only" name="add-outline" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-buttons>
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
            <ion-icon name="bicycle-outline" aria-hidden="true"></ion-icon>
            <h2>Sin motos registradas</h2>
            <p>Registra una moto en el Garaje para llevar el control de su mantenimiento.</p>
            <ion-button class="rod-btn-primary" routerLink="/app/garaje/nueva">Registrar moto</ion-button>
          </div>
        } @else {
          @if (datos.motos().length > 1) {
            <div class="rod-chips" role="tablist" aria-label="Moto">
              @for (m of datos.motos(); track m.id) {
                <button
                  type="button"
                  class="rod-chip-filtro"
                  role="tab"
                  [class.activo]="m.id === moto()!.id"
                  [attr.aria-selected]="m.id === moto()!.id"
                  (click)="motoId.set(m.id!)"
                >
                  {{ m.marca }} {{ m.modelo }}
                </button>
              }
            </div>
          }

          <p class="km-actual">
            Kilometraje actual estimado: <strong>{{ formatoKm(km()) }}</strong>
          </p>

          @if (urgente(); as u) {
            <div class="rod-card alerta" [class.alerta--danger]="(u.kmRestantes ?? 0) <= 0">
              <ion-icon name="build-outline" aria-hidden="true"></ion-icon>
              <div>
                <strong>{{ u.tipo }} {{ (u.kmRestantes ?? 0) <= 0 ? 'atrasado' : 'pronto' }}</strong>
                <p>
                  @if ((u.kmRestantes ?? 0) <= 0) {
                    Te pasaste {{ formatoKm(-(u.kmRestantes ?? 0)) }} del servicio recomendado.
                  } @else {
                    Faltan ~{{ formatoKm(u.kmRestantes) }} para el próximo servicio recomendado.
                  }
                </p>
              </div>
            </div>
          }

          @if (componentes().length === 0) {
            <div class="rod-empty compacto">
              <ion-icon name="build-outline" aria-hidden="true"></ion-icon>
              <h2>Sin mantenimientos</h2>
              <p>
                Registra tus tareas con "Repetir cada (km)" y aquí verás cuánta vida útil le queda a
                cada componente.
              </p>
            </div>
          } @else {
            <h2 class="titulo-sec">Vida útil por componente</h2>

            @for (c of componentes(); track c.ultimo.id) {
              <div class="rod-card componente">
                <div class="fila">
                  <span class="nombre">{{ c.tipo }}</span>
                  @if (c.vidaUtil !== null) {
                    <span class="pct" [class.pct--bajo]="c.vidaUtil <= umbral">{{ c.vidaUtil }}%</span>
                  } @else {
                    <span class="pct pct--neutro">Sin intervalo</span>
                  }
                </div>
                @if (c.vidaUtil !== null) {
                  <div
                    class="barra"
                    role="progressbar"
                    [attr.aria-valuenow]="c.vidaUtil"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-label]="'Vida útil de ' + c.tipo"
                  >
                    <div class="relleno" [class.relleno--bajo]="c.vidaUtil <= umbral" [style.width.%]="c.vidaUtil"></div>
                  </div>
                }
                <p class="detalle">
                  Último a {{ formatoKm(c.ultimo.kilometraje) }} ({{ formatoFecha(c.ultimo.fecha) }})
                  @if (c.ultimo.repetir_cada_km) {
                    · cada {{ formatoKm(c.ultimo.repetir_cada_km) }}
                  }
                </p>
              </div>
            }
          }

          <ion-button
            class="rod-btn-primary"
            expand="block"
            routerLink="/app/mantenimiento/nuevo"
            [queryParams]="queryMoto()"
          >
            Registrar nueva tarea
          </ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .km-actual {
        font-size: 13px;
        color: var(--rod-text-secondary);
        margin: 4px 0 14px;
      }
      .km-actual strong {
        color: var(--ion-color-primary);
      }
      .alerta {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        border-color: var(--ion-color-warning);
      }
      .alerta ion-icon {
        font-size: 22px;
        color: var(--ion-color-warning);
        flex: none;
      }
      .alerta--danger {
        border-color: var(--ion-color-danger);
      }
      .alerta--danger ion-icon {
        color: var(--ion-color-danger);
      }
      .alerta strong {
        color: var(--rod-text-heading);
        font-size: 14px;
      }
      .alerta p {
        margin: 2px 0 0;
        font-size: 13px;
        color: var(--rod-text-secondary);
      }
      .titulo-sec {
        font-family: var(--rod-font-heading);
        font-size: 15px;
        color: var(--rod-text-secondary);
        margin: 22px 0 10px;
      }
      .componente {
        margin-bottom: 12px;
      }
      .componente .fila {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 14px;
      }
      .componente .nombre {
        color: var(--rod-text-heading);
        font-weight: 500;
      }
      .componente .pct {
        color: var(--ion-color-success);
        font-weight: 600;
        flex: none;
      }
      .componente .pct--bajo {
        color: var(--ion-color-danger);
      }
      .componente .pct--neutro {
        color: var(--rod-text-secondary);
        font-weight: 500;
        font-size: 12px;
      }
      .barra {
        height: 8px;
        border-radius: 999px;
        background: var(--rod-bg-base);
        margin: 8px 0;
        overflow: hidden;
      }
      .relleno {
        height: 100%;
        border-radius: 999px;
        background: var(--ion-color-success);
      }
      .relleno--bajo {
        background: var(--ion-color-danger);
      }
      .componente .detalle {
        font-size: 12px;
        color: var(--rod-text-secondary);
        margin: 6px 0 0;
      }
      .rod-empty.compacto {
        padding: 24px 16px;
      }
      ion-button.rod-btn-primary {
        margin-top: 18px;
      }
    `,
  ],
})
export class MaintenancePage implements ViewWillEnter {
  readonly datos = inject(GarajeDatosService);

  readonly umbral = UMBRAL_VIDA_UTIL;
  readonly formatoKm = formatoKm;
  readonly formatoFecha = formatoFecha;

  /** Moto elegida en los chips (por defecto la primera). */
  readonly motoId = signal<string | null>(null);

  readonly moto = computed(() => {
    const motos = this.datos.motos();
    return motos.find((m) => m.id === this.motoId()) ?? motos[0] ?? null;
  });

  /** `?moto=<id>` para que el formulario abra con la moto elegida. */
  readonly queryMoto = computed(() => {
    const id = this.moto()?.id;
    return id ? { moto: id } : null;
  });

  readonly km = computed(() => {
    const m = this.moto();
    return m ? this.datos.kmActualDe(m) : 0;
  });

  readonly componentes = computed(() => {
    const m = this.moto();
    return m ? this.datos.componentesDe(m) : [];
  });

  /** El componente con menos vida util, solo si esta bajo el umbral. */
  readonly urgente = computed(() => {
    const c = this.componentes()[0];
    return c && c.vidaUtil !== null && c.vidaUtil <= UMBRAL_VIDA_UTIL ? c : null;
  });

  ionViewWillEnter(): void {
    void this.datos.cargar(true);
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.datos.cargar(true);
    (event.target as HTMLIonRefresherElement).complete();
  }
}
