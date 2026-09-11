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
 * Frame Figma "Plantilla reg RTM" (2:2602) — Revision Tecnico-Mecanica.
 *
 * Alta de la RTM: numero de certificado, CDA, fecha de expedicion y de
 * vencimiento.
 * Scaffold: formulario reactivo; guardado en Supabase (tabla `rtm`) como TODO.
 */
@Component({
  selector: 'app-rtm-form',
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
        <ion-title>Registrar RTM</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container" [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list lines="none" class="campos">
          <ion-item class="rod-card">
            <ion-input
              formControlName="numeroCertificado"
              label="Numero de certificado"
              labelPlacement="stacked"
              placeholder="Ej. RTM-0099887"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="cda"
              label="CDA (centro de diagnostico)"
              labelPlacement="stacked"
              placeholder="Nombre del CDA"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="fechaExpedicion"
              type="date"
              label="Fecha de expedicion"
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
          Guardar RTM
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
export class RtmFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    numeroCertificado: ['', [Validators.required]],
    cda: ['', [Validators.required]],
    fechaExpedicion: ['', [Validators.required]],
    fechaVencimiento: ['', [Validators.required]],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Completa todos los campos.');
      return;
    }
    // TODO: persistir en Supabase (tabla `rtm`).
    await this.notify.success('RTM registrada.');
    await this.router.navigateByUrl('/app/garaje/detalle');
  }
}
