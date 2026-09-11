import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

interface Consejo {
  categoria: string;
  titulo: string;
  resumen: string;
  lectura: string;
}

/**
 * Frame Figma "Consejos" (7:3725) — Consejos para moteros.
 *
 * Contenido tipo blog: chips de categoria + tarjetas de articulo.
 * Scaffold con datos de ejemplo; la fuente real sera la tabla `consejos`.
 */
@Component({
  selector: 'app-tips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Consejos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense" class="ion-no-border">
        <ion-toolbar>
          <ion-title size="large">Consejos</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="rod-container">
        <p class="rod-subheading">Buenas practicas para tu moto y tus rutas.</p>

        <div class="chips">
          @for (cat of categorias; track cat) {
            <span class="chip" [class.chip--activa]="cat === 'Todos'">{{ cat }}</span>
          }
        </div>

        @for (c of consejos; track c.titulo) {
          <article class="rod-card consejo">
            <span class="etiqueta">{{ c.categoria }}</span>
            <h2>{{ c.titulo }}</h2>
            <p>{{ c.resumen }}</p>
            <span class="meta">
              <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
              {{ c.lectura }}
            </span>
          </article>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 16px 0 20px;
      }
      .chip {
        font-size: 13px;
        padding: 6px 14px;
        border-radius: var(--rod-radius-pill, 999px);
        background: var(--rod-bg-alt);
        border: 1px solid var(--rod-border);
        color: var(--rod-text-secondary);
      }
      .chip--activa {
        background: var(--ion-color-primary);
        border-color: var(--ion-color-primary);
        color: #fff;
      }
      .consejo {
        margin-bottom: 14px;
      }
      .consejo .etiqueta {
        font-size: 11px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--ion-color-primary);
        font-weight: 700;
      }
      .consejo h2 {
        font-family: var(--rod-font-heading);
        font-size: 17px;
        margin: 6px 0 4px;
        color: var(--rod-text-heading);
      }
      .consejo p {
        font-size: 14px;
        color: var(--rod-text-secondary);
        margin: 0 0 12px;
      }
      .consejo .meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--rod-text-secondary);
      }
    `,
  ],
})
export class TipsPage {
  readonly categorias = ['Todos', 'Seguridad', 'Mantenimiento', 'Ruta'];

  readonly consejos: Consejo[] = [
    {
      categoria: 'Seguridad',
      titulo: 'Como frenar en lluvia sin bloquear la rueda',
      resumen:
        'Dosifica el freno delantero, usa el trasero de apoyo y aumenta la distancia con el vehiculo de adelante.',
      lectura: '4 min de lectura',
    },
    {
      categoria: 'Mantenimiento',
      titulo: 'Tension y lubricacion de la cadena',
      resumen:
        'Revisa la holgura cada 500 km y lubrica en caliente para que el producto penetre en los eslabones.',
      lectura: '3 min de lectura',
    },
    {
      categoria: 'Ruta',
      titulo: 'Planifica paradas de tanqueo en carretera',
      resumen:
        'Calcula la autonomia real de tu moto y marca estaciones cada 150 km para no quedarte sin combustible.',
      lectura: '5 min de lectura',
    },
  ];
}
