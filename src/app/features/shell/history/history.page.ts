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
import { fechaLocal, formatoFecha, formatoKm, formatoMoneda } from '@shared/utils/garaje.util';

type Filtro = 'todo' | 'combustible' | 'mantenimiento';

interface Movimiento {
  id: string;
  tipo: 'combustible' | 'mantenimiento';
  fecha: Date;
  titulo: string;
  detalle: string;
  costo: number | null;
}

interface Mes {
  clave: string;
  titulo: string;
  total: number;
  items: Movimiento[];
}

const fmtMes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

/**
 * Historial: tanqueadas (`registros_combustible`) y mantenimientos
 * (`registros_mantenimiento`) de todas las motos, del mas reciente al mas
 * antiguo, agrupados por mes con su gasto total.
 */
@Component({
  selector: 'app-history',
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
        <ion-title>Historial</ion-title>
        @if (datos.motos().length > 0) {
          <ion-buttons slot="end">
            <ion-button fill="clear" size="small" routerLink="/app/combustible/nuevo" aria-label="Registrar tanqueada">
              <ion-icon slot="icon-only" name="water-outline" aria-hidden="true"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" routerLink="/app/mantenimiento/nuevo" aria-label="Registrar mantenimiento">
              <ion-icon slot="icon-only" name="build-outline" aria-hidden="true"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="rod-container">
        @if (!datos.cargado()) {
          <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (todos().length === 0) {
          <div class="rod-empty">
            <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
            <h2>Sin movimientos</h2>
            <p>Cada tanqueada y mantenimiento que registres quedará listado aquí.</p>
            @if (datos.motos().length > 0) {
              <ion-button class="rod-btn-primary" routerLink="/app/combustible/nuevo">Registrar tanqueada</ion-button>
            } @else {
              <ion-button class="rod-btn-primary" routerLink="/app/garaje/nueva">Registrar moto</ion-button>
            }
          </div>
        } @else {
          <div class="resumen">
            <div class="rod-card stat">
              <small>Gasto este mes</small>
              <strong>{{ formatoMoneda(gastoMes()) }}</strong>
            </div>
            <div class="rod-card stat">
              <small>Registros</small>
              <strong>{{ todos().length }}</strong>
            </div>
          </div>

          <div class="rod-chips" role="tablist" aria-label="Filtrar movimientos">
            @for (f of filtros; track f.id) {
              <button
                type="button"
                role="tab"
                class="rod-chip-filtro"
                [class.activo]="filtro() === f.id"
                [attr.aria-selected]="filtro() === f.id"
                (click)="filtro.set(f.id)"
              >
                {{ f.label }}
              </button>
            }
          </div>

          @for (mes of meses(); track mes.clave) {
            <div class="mes-head">
              <h3>{{ mes.titulo }}</h3>
              <span>{{ formatoMoneda(mes.total) }}</span>
            </div>
            <div class="rod-list">
              @for (m of mes.items; track m.id) {
                <div class="rod-list-item">
                  <span class="rod-icon-tile" [class.tile-mant]="m.tipo === 'mantenimiento'">
                    <ion-icon [name]="m.tipo === 'combustible' ? 'water-outline' : 'build-outline'" aria-hidden="true"></ion-icon>
                  </span>
                  <span class="rod-list-text">
                    <small>{{ m.detalle }}</small>
                    <strong>{{ m.titulo }}</strong>
                  </span>
                  @if (m.costo !== null) {
                    <span class="monto">{{ formatoMoneda(m.costo) }}</span>
                  }
                </div>
              }
            </div>
          } @empty {
            <p class="vacio-linea">No hay movimientos de este tipo.</p>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .resumen {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 8px;
      }
      .stat small {
        display: block;
        font-size: 12px;
        color: var(--rod-text-secondary);
      }
      .stat strong {
        font-family: var(--rod-font-heading);
        font-size: 20px;
        color: var(--rod-text-heading);
      }
      .mes-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin: 20px 0 8px;
      }
      .mes-head h3 {
        margin: 0;
        font-size: 12px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--rod-text-secondary);
      }
      .mes-head span {
        font-size: 13px;
        font-weight: 600;
        color: var(--rod-text-heading);
      }
      .tile-mant {
        color: var(--ion-color-warning);
        background: rgba(245, 158, 11, 0.14);
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
        text-align: center;
        margin: 24px 0;
      }
    `,
  ],
})
export class HistoryPage implements ViewWillEnter {
  readonly datos = inject(GarajeDatosService);

  readonly formatoMoneda = formatoMoneda;

  readonly filtros: Array<{ id: Filtro; label: string }> = [
    { id: 'todo', label: 'Todo' },
    { id: 'combustible', label: 'Combustible' },
    { id: 'mantenimiento', label: 'Mantenimiento' },
  ];
  readonly filtro = signal<Filtro>('todo');

  /** Todos los movimientos de todas las motos, del mas reciente al mas antiguo. */
  readonly todos = computed<Movimiento[]>(() => {
    const motos = new Map(this.datos.motos().map((m) => [m.id, `${m.marca} ${m.modelo}`]));
    const varias = motos.size > 1;
    const sufijo = (motoId: string) => (varias ? ` · ${motos.get(motoId) ?? ''}` : '');

    const comb: Movimiento[] = this.datos.combustible().map((r) => ({
      id: 'c-' + r.id,
      tipo: 'combustible',
      fecha: new Date(r.created_at),
      titulo: `Tanqueada ${r.tipo_gasolina}${r.lugar ? ' · ' + r.lugar : ''}`,
      detalle: `${formatoFecha(r.created_at)} · ${formatoKm(r.kilometraje)}${sufijo(r.moto_id)}`,
      costo: Number(r.costo),
    }));
    const mant: Movimiento[] = this.datos.mantenimientos().map((r) => ({
      id: 'm-' + r.id,
      tipo: 'mantenimiento',
      fecha: fechaLocal(r.fecha),
      titulo: r.tipo,
      detalle: `${formatoFecha(r.fecha)} · ${formatoKm(r.kilometraje)}${sufijo(r.moto_id)}`,
      costo: r.costo == null ? null : Number(r.costo),
    }));
    return [...comb, ...mant].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  readonly meses = computed<Mes[]>(() => {
    const f = this.filtro();
    const grupos = new Map<string, Mes>();
    for (const m of this.todos()) {
      if (f !== 'todo' && m.tipo !== f) continue;
      const clave = `${m.fecha.getFullYear()}-${m.fecha.getMonth()}`;
      let mes = grupos.get(clave);
      if (!mes) {
        mes = { clave, titulo: fmtMes.format(m.fecha), total: 0, items: [] };
        grupos.set(clave, mes);
      }
      mes.items.push(m);
      mes.total += m.costo ?? 0;
    }
    return [...grupos.values()];
  });

  readonly gastoMes = computed(() => {
    const hoy = new Date();
    return this.todos()
      .filter((m) => m.fecha.getFullYear() === hoy.getFullYear() && m.fecha.getMonth() === hoy.getMonth())
      .reduce((s, m) => s + (m.costo ?? 0), 0);
  });

  ionViewWillEnter(): void {
    void this.datos.cargar(true);
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.datos.cargar(true);
    (event.target as HTMLIonRefresherElement).complete();
  }
}
