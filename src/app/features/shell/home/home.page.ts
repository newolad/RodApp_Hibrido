import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

import { AuthService } from '@core/services/auth.service';

/**
 * Dashboard "Inicio".
 *
 * Por ahora solo saluda al usuario autenticado (dato real leido de la sesion
 * de Supabase) y deja el area de resumen preparada. Los widgets de vencimientos,
 * gastos y mantenimiento se anadiran aqui reutilizando el mismo <ion-header>.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Inicio</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="rod-container">
        <p class="saludo">Hola,</p>
        <h1 class="rod-heading">{{ nombre() }}</h1>
        <p class="rod-subheading">Este es el resumen de tu garaje.</p>

        <div class="rod-empty">
          <ion-icon name="home-outline" aria-hidden="true"></ion-icon>
          <h2>Aun no hay datos</h2>
          <p>Registra tu primera moto en la pestana "Garaje" para ver aqui sus vencimientos y gastos.</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .saludo {
        margin: 8px 0 0;
        font-size: 15px;
        color: var(--rod-text-secondary);
      }
      .rod-heading {
        margin-top: 2px;
      }
    `,
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);

  /** Nombre del usuario actual (o un valor neutro mientras carga el perfil). */
  readonly nombre = computed(() => this.auth.sesion()?.nombre ?? 'Motero');
}
