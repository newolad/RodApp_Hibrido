import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SectionPlaceholderComponent } from '@shared/components/section-placeholder/section-placeholder.component';

/**
 * Historial: combina registros de combustible y mantenimiento
 * (`registros_combustible` + `registros_mantenimiento` de Supabase).
 * Placeholder hasta implementar la carga de esos registros.
 */
@Component({
  selector: 'app-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionPlaceholderComponent],
  template: `
    <app-section-placeholder
      titulo="Historial"
      icono="time-outline"
      tituloVacio="Sin movimientos"
      descripcion="Cada tanqueada y mantenimiento que registres quedara listado aqui."
    ></app-section-placeholder>
  `,
})
export class HistoryPage {}
