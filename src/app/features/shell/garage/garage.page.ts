import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SectionPlaceholderComponent } from '@shared/components/section-placeholder/section-placeholder.component';

/**
 * Garaje: listado de motocicletas del usuario (tabla `motos` de Supabase).
 * Placeholder hasta implementar el CRUD de motos.
 */
@Component({
  selector: 'app-garage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionPlaceholderComponent],
  template: `
    <app-section-placeholder
      titulo="Garaje"
      icono="bicycle-outline"
      tituloVacio="Tu garaje esta vacio"
      descripcion="Aqui apareceran tus motos con su SOAT, tecnomecanica y kilometraje."
    ></app-section-placeholder>
  `,
})
export class GaragePage {}
