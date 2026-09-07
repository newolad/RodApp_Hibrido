import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

/**
 * Contenedor reutilizable para las vistas del shell que aun no tienen datos
 * (Inicio, Garaje, Mapa, Historial...).
 *
 * Centralizar aqui el encabezado + el "estado vacio" evita repetir el mismo
 * markup en cada pagina y garantiza que todas compartan tipografia, colores,
 * espaciados e icono de marca (coherencia visual pedida en el brief).
 * Cuando cada modulo se implemente, sustituira este placeholder por su
 * contenido real reutilizando el mismo <ion-header>.
 */
@Component({
  selector: 'app-section-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ titulo }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense" class="ion-no-border">
        <ion-toolbar>
          <ion-title size="large">{{ titulo }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="rod-empty">
        <ion-icon [name]="icono" aria-hidden="true"></ion-icon>
        <h2>{{ tituloVacio }}</h2>
        <p>{{ descripcion }}</p>
        <ng-content></ng-content>
      </div>
    </ion-content>
  `,
})
export class SectionPlaceholderComponent {
  /** Titulo de la barra superior y del encabezado grande. */
  @Input({ required: true }) titulo!: string;
  /** Nombre de icono ionicons (ya registrado en app-icons.ts). */
  @Input({ required: true }) icono!: string;
  /** Encabezado del estado vacio. */
  @Input() tituloVacio = 'Proximamente';
  /** Texto explicativo del estado vacio. */
  @Input() descripcion = 'Este modulo esta en construccion.';
}
