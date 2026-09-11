import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
} from '@ionic/angular/standalone';

import { NotificationService } from '@core/services/notification.service';

/**
 * Frame Figma "Registro de Nueva Tarea" (2:1028).
 *
 * Alta de un mantenimiento/tarea: tipo de servicio, fecha, kilometraje, costo,
 * notas y "repetir cada X km".
 * Scaffold: formulario reactivo; guardado en Supabase (tabla `mantenimiento`)
 * como TODO.
 */
@Component({
  selector: 'app-maintenance-task-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/mantenimiento" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Nueva tarea</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container" [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list lines="none" class="campos">
          <ion-item class="rod-card">
            <ion-select
              formControlName="tipo"
              label="Tipo de servicio"
              labelPlacement="stacked"
              interface="action-sheet"
              placeholder="Selecciona"
            >
              <ion-select-option value="aceite">Cambio de aceite</ion-select-option>
              <ion-select-option value="frenos">Frenos</ion-select-option>
              <ion-select-option value="cadena">Cadena / transmision</ion-select-option>
              <ion-select-option value="llantas">Llantas</ion-select-option>
              <ion-select-option value="otro">Otro</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="fecha"
              type="date"
              label="Fecha"
              labelPlacement="stacked"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="kilometraje"
              type="number"
              inputmode="numeric"
              label="Kilometraje"
              labelPlacement="stacked"
              placeholder="0"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="costo"
              type="number"
              inputmode="decimal"
              label="Costo (COP)"
              labelPlacement="stacked"
              placeholder="0"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="repetirCadaKm"
              type="number"
              inputmode="numeric"
              label="Repetir cada (km)"
              labelPlacement="stacked"
              placeholder="Opcional"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-textarea
              formControlName="notas"
              label="Notas"
              labelPlacement="stacked"
              autoGrow="true"
              placeholder="Opcional"
            ></ion-textarea>
          </ion-item>
        </ion-list>

        <ion-button
          class="rod-btn-primary"
          type="submit"
          expand="block"
          [disabled]="form.invalid"
        >
          Guardar tarea
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .campos ion-item {
        margin-bottom: 12px;
        --background: transparent;
        --padding-start: 16px;
        --inner-padding-end: 16px;
      }
      ion-button {
        margin-top: 20px;
      }
    `,
  ],
})
export class MaintenanceTaskFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    tipo: ['', [Validators.required]],
    fecha: ['', [Validators.required]],
    kilometraje: [null as number | null, [Validators.required, Validators.min(0)]],
    costo: [null as number | null, [Validators.min(0)]],
    repetirCadaKm: [null as number | null, [Validators.min(0)]],
    notas: [''],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Completa los campos obligatorios.');
      return;
    }
    // TODO: persistir en Supabase (tabla `mantenimiento`).
    await this.notify.success('Tarea de mantenimiento registrada.');
    await this.router.navigateByUrl('/app/mantenimiento');
  }
}
