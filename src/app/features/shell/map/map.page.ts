import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SectionPlaceholderComponent } from '@shared/components/section-placeholder/section-placeholder.component';

/**
 * Mapa: estaciones de servicio, talleres y rutas guardadas.
 * Placeholder hasta decidir el proveedor de mapas (Google Places / Mapbox).
 */
@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionPlaceholderComponent],
  template: `
    <app-section-placeholder
      titulo="Mapa"
      icono="map-outline"
      tituloVacio="Mapa en construccion"
      descripcion="Podras buscar gasolineras y talleres cercanos y trazar rutas."
    ></app-section-placeholder>
  `,
})
export class MapPage {}
