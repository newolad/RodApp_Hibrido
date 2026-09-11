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
  IonButton,
} from '@ionic/angular/standalone';

import { NotificationService } from '@core/services/notification.service';

/**
 * Frame Figma "Plantilla reg SOAT" (2:2517).
 *
 * Alta del SOAT de una moto: numero de poliza, aseguradora, fecha de inicio y
 * de vencimiento.
 * Scaffold: formulario reactivo; guardado en Supabase (tabla `soat`) como TODO.
 */
@Component({
  selector: 'app-soat-form',
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
    IonButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/garaje/detalle" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Registrar SOAT</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container" [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list lines="none" class="campos">
          <ion-item class="rod-card">
            <ion-input
              formControlName="numeroPoliza"
              label="Numero de poliza"
              labelPlacement="stacked"
              placeholder="Ej. 12345678"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="aseguradora"
              label="Aseguradora"
              labelPlacement="stacked"
              placeholder="Ej. Sura, Mapfre..."
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="fechaInicio"
              type="date"
              label="Fecha de inicio"
              labelPlacement="stacked"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="fechaVencimiento"
              type="date"
              label="Fecha de vencimiento"
              labelPlacement="stacked"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          class="rod-btn-primary"
          type="submit"
          expand="block"
          [disabled]="form.invalid"
        >
          Guardar SOAT
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
export class SoatFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    numeroPoliza: ['', [Validators.required]],
    aseguradora: ['', [Validators.required]],
    fechaInicio: ['', [Validators.required]],
    fechaVencimiento: ['', [Validators.required]],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Completa todos los campos.');
      return;
    }
    // TODO: persistir en Supabase (tabla `soat`).
    await this.notify.success('SOAT registrado.');
    await this.router.navigateByUrl('/app/garaje/detalle');
  }
}
