import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';

import { SupabaseService } from '@core/services/supabase.service';
import { Consejo } from '@core/models/models';

/**
 * Frame Figma "Consejos" (7:3725) — Consejos para moteros.
 *
 * Contenido global de la tabla `consejos` (solo lectura para usuarios; lo
 * escribe un admin). Chips de categoria generados desde los datos y tarjetas
 * que se expanden para leer el contenido completo.
 */
@Component({
  selector: 'app-tips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
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
          <ion-back-button defaultHref="/app/inicio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Consejos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="rod-container">
        <p class="rod-subheading">Buenas prácticas para tu moto y tus rutas.</p>

        @if (cargando()) {
          <div class="rod-empty"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (error()) {
          <div class="rod-empty">
            <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
            <h2>No se pudieron cargar</h2>
            <p>Revisa tu conexión y desliza hacia abajo para reintentar.</p>
          </div>
        } @else if (consejos().length === 0) {
          <div class="rod-empty">
            <ion-icon name="bulb-outline" aria-hidden="true"></ion-icon>
            <h2>Aún no hay consejos</h2>
            <p>Pronto publicaremos recomendaciones para tus rutas y tu moto.</p>
          </div>
        } @else {
          <div class="rod-chips" role="tablist" aria-label="Categoría">
            @for (cat of categorias(); track cat) {
              <button
                type="button"
                role="tab"
                class="rod-chip-filtro"
                [class.activo]="cat === categoria()"
                [attr.aria-selected]="cat === categoria()"
                (click)="categoria.set(cat)"
              >
                {{ cat }}
              </button>
            }
          </div>

          @for (c of filtrados(); track c.id) {
            <article class="rod-card consejo">
              <button
                type="button"
                class="cabecera"
                [attr.aria-expanded]="abierto() === c.id"
                (click)="alternar(c.id)"
              >
                <span class="etiqueta">{{ c.categoria }}</span>
                <h2>{{ c.titulo }}</h2>
                <p>{{ c.resumen }}</p>
                <span class="meta">
                  <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                  {{ c.lectura }}
                  <ion-icon
                    class="flecha"
                    [class.flecha--abierta]="abierto() === c.id"
                    name="chevron-down-outline"
                    aria-hidden="true"
                  ></ion-icon>
                </span>
              </button>
              @if (abierto() === c.id) {
                <div class="contenido">{{ c.contenido }}</div>
              }
            </article>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .consejo {
        margin-bottom: 14px;
        padding: 0;
        overflow: hidden;
      }
      .cabecera {
        all: unset;
        box-sizing: border-box;
        display: block;
        width: 100%;
        padding: 16px;
        cursor: pointer;
      }
      .cabecera:focus-visible {
        outline: 2px solid var(--ion-color-primary);
        outline-offset: -2px;
      }
      .etiqueta {
        font-size: 11px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--ion-color-primary);
        font-weight: 700;
      }
      .cabecera h2 {
        font-family: var(--rod-font-heading);
        font-size: 17px;
        margin: 6px 0 4px;
        color: var(--rod-text-heading);
      }
      .cabecera p {
        font-size: 14px;
        color: var(--rod-text-secondary);
        margin: 0 0 12px;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--rod-text-secondary);
      }
      .flecha {
        margin-left: auto;
        font-size: 16px;
        transition: transform 0.2s ease;
      }
      .flecha--abierta {
        transform: rotate(180deg);
      }
      .contenido {
        padding: 0 16px 16px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--rod-text-body, var(--rod-text-secondary));
        white-space: pre-line;
      }
    `,
  ],
})
export class TipsPage implements OnInit {
  private readonly supabase = inject(SupabaseService);

  readonly consejos = signal<Consejo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly categoria = signal('Todos');
  readonly abierto = signal<string | null>(null);

  /** 'Todos' + las categorias presentes en los datos, sin repetir. */
  readonly categorias = computed(() => ['Todos', ...new Set(this.consejos().map((c) => c.categoria))]);

  readonly filtrados = computed(() => {
    const cat = this.categoria();
    return cat === 'Todos' ? this.consejos() : this.consejos().filter((c) => c.categoria === cat);
  });

  ngOnInit(): void {
    void this.cargar();
  }

  alternar(id: string): void {
    this.abierto.update((actual) => (actual === id ? null : id));
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargar();
    (event.target as HTMLIonRefresherElement).complete();
  }

  private async cargar(): Promise<void> {
    this.error.set(false);
    try {
      const { data, error } = await this.supabase.getConsejos();
      if (error) throw error;
      this.consejos.set((data as Consejo[]) ?? []);
    } catch (error) {
      this.error.set(true);
      console.error('[TipsPage] cargar', error);
    } finally {
      this.cargando.set(false);
    }
  }
}
