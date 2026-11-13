import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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

import { AuthService } from '@core/services/auth.service';
import { GarajeDatosService } from '@core/services/garaje-datos.service';
import {
  documentoVigente,
  estadoVencimiento,
  fechaLocal,
  formatoFecha,
  formatoKm,
  formatoMoneda,
} from '@shared/utils/garaje.util';

/**
 * Dashboard "Inicio".
 *
 * Saluda al usuario y resume su garaje con datos reales:
 *  - alertas activas (documentos y mantenimientos),
 *  - estado del SOAT / RTM de cada moto,
 *  - gasto del mes (combustible + mantenimiento),
 *  - accesos rapidos a los registros mas comunes.
 * Si aun no tiene motos muestra el estado vacio con el CTA al Garaje.
 */
@Component({
  selector: 'app-home',
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
      <ion-toolbar class="home-toolbar">
        <ion-title class="home-title">Inicio</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/app/notificaciones" aria-label="Notificaciones" class="campana">
            <ion-icon slot="icon-only" name="notifications-outline" aria-hidden="true"></ion-icon>
            @if (datos.alertas().length > 0) {
              <span class="badge" aria-hidden="true">{{ datos.alertas().length }}</span>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="home-content">
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="rod-container">
        <div class="user-greeting">
          <p class="saludo">Hola,</p>
          <h1 class="rod-heading">{{ nombre() }}</h1>
          <p class="rod-subheading">Este es el resumen de tu garaje.</p>
        </div>

        @if (!datos.cargado()) {
          <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (datos.motos().length === 0) {
          <div class="home-empty">
            <div class="empty-icon-wrap">
              <ion-icon name="home" aria-hidden="true"></ion-icon>
            </div>
            <h2 class="empty-title">Aún no hay datos</h2>
            <p class="empty-subtitle">
              Registra tu primera moto para ver aquí sus vencimientos y gastos.
            </p>
            <ion-button shape="round" class="rod-btn-primary cta" routerLink="/app/garaje/nueva">
              <ion-icon slot="start" name="add-circle-outline" aria-hidden="true"></ion-icon>
              Registrar motocicleta
            </ion-button>
          </div>
        } @else {
          @if (datos.error()) {
            <div class="rod-info-note bloque">
              <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
              <span>No se pudieron cargar todos los datos. Desliza hacia abajo para reintentar.</span>
            </div>
          }

          <!-- Resumen numerico -->
          <div class="stats">
            <div class="rod-card stat">
              <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
              <small>Gasto este mes</small>
              <strong>{{ formatoMoneda(gastoMes()) }}</strong>
            </div>
            <div class="rod-card stat" [class.stat--alerta]="datos.alertas().length > 0">
              <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
              <small>Alertas</small>
              <strong>{{ datos.alertas().length }}</strong>
            </div>
          </div>

          <!-- Alertas (max 3) -->
          @if (datos.alertas().length > 0) {
            <div class="sec-head">
              <p class="rod-section-label">Requiere atención</p>
              @if (datos.alertas().length > 3) {
                <ion-button fill="clear" size="small" routerLink="/app/notificaciones">Ver todas</ion-button>
              }
            </div>
            <div class="rod-list">
              @for (a of alertasTop(); track a.id) {
                <a class="rod-list-item" [routerLink]="a.ruta" [queryParams]="a.query">
                  <span class="rod-icon-tile" [class]="'rod-icon-tile tile-' + a.tipo">
                    <ion-icon [name]="a.icono" aria-hidden="true"></ion-icon>
                  </span>
                  <span class="rod-list-text">
                    <small>{{ a.detalle }}</small>
                    <strong>{{ a.titulo }}</strong>
                  </span>
                  <ion-icon class="rod-list-chev" name="chevron-forward-outline" aria-hidden="true"></ion-icon>
                </a>
              }
            </div>
          }

          <!-- Motos -->
          <p class="rod-section-label">Mis motos</p>
          <div class="motos">
            @for (r of resumenMotos(); track r.moto.id) {
              <a class="rod-card moto" [routerLink]="['/app/garaje/detalle', r.moto.id]">
                <div class="moto-top">
                  <div>
                    <h2>{{ r.moto.marca }} {{ r.moto.modelo }}</h2>
                    <p>{{ r.moto.placa }} · {{ r.km }}</p>
                  </div>
                  <ion-icon name="chevron-forward-outline" aria-hidden="true"></ion-icon>
                </div>
                <div class="docs">
                  @for (d of r.docs; track d.etiqueta) {
                    <div class="doc">
                      <small>{{ d.etiqueta }}</small>
                      @if (d.estado) {
                        <span [class]="'rod-chip ' + d.estado.tipo">{{ d.estado.texto }}</span>
                        <span class="vence">{{ d.vence }}</span>
                      } @else {
                        <span class="rod-chip warn">Sin registrar</span>
                      }
                    </div>
                  }
                </div>
              </a>
            }
          </div>

          <!-- Accesos rapidos -->
          <p class="rod-section-label">Registrar</p>
          <div class="accesos">
            <a class="rod-card acceso" routerLink="/app/combustible/nuevo">
              <ion-icon name="water-outline" aria-hidden="true"></ion-icon>
              <span>Tanqueada</span>
            </a>
            <a class="rod-card acceso" routerLink="/app/mantenimiento/nuevo">
              <ion-icon name="build-outline" aria-hidden="true"></ion-icon>
              <span>Mantenimiento</span>
            </a>
            <a class="rod-card acceso" routerLink="/app/consejos">
              <ion-icon name="bulb-outline" aria-hidden="true"></ion-icon>
              <span>Consejos</span>
            </a>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .home-toolbar {
        --background: var(--rod-bg-base);
        --color: var(--rod-text-heading);
        padding: 8px 12px;
      }
      .home-title {
        font-family: var(--rod-font-heading);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: var(--rod-text-heading);
        text-align: left;
        padding-inline-start: 12px;
      }
      .campana {
        position: relative;
      }
      .badge {
        position: absolute;
        top: 4px;
        right: 2px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 999px;
        background: var(--ion-color-danger);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        line-height: 16px;
        text-align: center;
      }
      .home-content {
        --background: var(--rod-bg-base);
      }
      .user-greeting {
        margin-bottom: 20px;
      }
      .saludo {
        margin: 4px 0 0;
        font-size: 15px;
        color: var(--rod-text-secondary);
      }
      .rod-heading {
        margin-top: 2px;
        font-size: 28px;
        font-weight: 700;
      }
      .rod-subheading {
        margin-top: 4px;
      }
      .bloque {
        margin-bottom: 16px;
      }

      .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 8px;
      }
      .stat ion-icon {
        font-size: 20px;
        color: var(--ion-color-primary);
      }
      .stat small {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: var(--rod-text-secondary);
      }
      .stat strong {
        font-family: var(--rod-font-heading);
        font-size: 20px;
        color: var(--rod-text-heading);
      }
      .stat--alerta ion-icon,
      .stat--alerta strong {
        color: var(--ion-color-warning);
      }

      .sec-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sec-head .rod-section-label {
        margin-bottom: 0;
      }
      .tile-danger {
        color: var(--ion-color-danger);
        background: rgba(239, 68, 68, 0.14);
      }
      .tile-warn {
        color: var(--ion-color-warning);
        background: rgba(245, 158, 11, 0.14);
      }

      .motos {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
      .moto {
        display: block;
        text-decoration: none;
        color: inherit;
        transition: border-color 0.2s ease;
      }
      .moto:hover {
        border-color: rgba(17, 180, 212, 0.4);
      }
      .moto-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .moto-top ion-icon {
        color: var(--rod-text-secondary);
        flex: none;
      }
      .moto h2 {
        font-family: var(--rod-font-heading);
        font-size: 16px;
        color: var(--rod-text-heading);
        margin: 0;
      }
      .moto p {
        margin: 2px 0 0;
        font-size: 13px;
        color: var(--rod-text-secondary);
      }
      .docs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--rod-border);
      }
      .doc {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .doc small {
        font-size: 11px;
        color: var(--rod-text-secondary);
      }
      .doc .vence {
        font-size: 11px;
        color: var(--rod-text-secondary);
      }

      .accesos {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        padding-bottom: 24px;
      }
      .acceso {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px 8px;
        text-decoration: none;
        color: var(--rod-text-heading);
        font-size: 13px;
        font-weight: 500;
        text-align: center;
      }
      .acceso ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary);
      }

      .home-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 50vh;
        max-width: 420px;
        margin: 0 auto;
        padding: 30px 20px;
      }
      .empty-icon-wrap {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        background: rgba(17, 180, 212, 0.12);

        ion-icon {
          font-size: 40px;
          color: var(--ion-color-primary);
        }
      }
      .empty-title {
        font-family: var(--rod-font-heading);
        font-size: 20px;
        font-weight: 700;
        color: var(--rod-text-heading);
        margin: 0 0 10px;
      }
      .empty-subtitle {
        font-family: var(--rod-font-body);
        font-size: 14px;
        line-height: 1.5;
        color: var(--rod-text-secondary);
        margin: 0 0 28px;
        max-width: 290px;
      }
      .cta {
        width: 100%;
        max-width: 320px;
      }
    `,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly auth = inject(AuthService);
  readonly datos = inject(GarajeDatosService);

  readonly formatoMoneda = formatoMoneda;

  /** Nombre del usuario actual (o un valor neutro mientras carga el perfil). */
  readonly nombre = computed(() => this.auth.sesion()?.nombre ?? 'Motero');

  readonly alertasTop = computed(() => this.datos.alertas().slice(0, 3));

  readonly resumenMotos = computed(() =>
    this.datos.motos().map((moto) => {
      const soat = documentoVigente(this.datos.soats(), moto.id!);
      const rtm = documentoVigente(this.datos.rtms(), moto.id!);
      const doc = (etiqueta: string, d: { fecha_vencimiento: string } | null) => ({
        etiqueta,
        estado: d ? estadoVencimiento(d.fecha_vencimiento) : null,
        vence: d ? formatoFecha(d.fecha_vencimiento) : '',
      });
      return {
        moto,
        km: formatoKm(this.datos.kmActualDe(moto)),
        docs: [doc('SOAT', soat), doc('Tecnomecánica', rtm)],
      };
    }),
  );

  readonly gastoMes = computed(() => {
    const hoy = new Date();
    const esteMes = (d: Date) => d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
    const comb = this.datos
      .combustible()
      .filter((r) => esteMes(new Date(r.created_at)))
      .reduce((s, r) => s + Number(r.costo || 0), 0);
    const mant = this.datos
      .mantenimientos()
      .filter((r) => esteMes(fechaLocal(r.fecha)))
      .reduce((s, r) => s + Number(r.costo || 0), 0);
    return comb + mant;
  });

  ionViewWillEnter(): void {
    void this.datos.cargar(true);
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.datos.cargar(true);
    (event.target as HTMLIonRefresherElement).complete();
  }
}
