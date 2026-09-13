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

import { MotosService } from '@core/services/motos.service';
import { NotificationService } from '@core/services/notification.service';

/**
 * Frame Figma "Registro de moto" (seccion 3.3 de `mockups/VISTAS.md`).
 *
 * Alta de una motocicleta: marca, modelo, placa, cilindrada y odometro
 * inicial. Es el prerequisito para poder usar los formularios de
 * combustible, mantenimiento, SOAT y RTM (todos requieren un `moto_id`).
 */
@Component({
  selector: 'app-moto-form',
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
          <ion-back-button defaultHref="/app/garaje" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Registrar moto</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container" [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list lines="none" class="campos">
          <ion-item class="rod-card">
            <ion-input
              formControlName="marca"
              label="Marca"
              labelPlacement="stacked"
              placeholder="Ej. Yamaha"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="modelo"
              label="Modelo"
              labelPlacement="stacked"
              placeholder="Ej. FZ 2.0"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="placa"
              label="Placa"
              labelPlacement="stacked"
              placeholder="Ej. ABC12D"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="cilindrada"
              type="number"
              inputmode="numeric"
              label="Cilindrada (cc)"
              labelPlacement="stacked"
              placeholder="Opcional"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="odometroInicial"
              type="number"
              inputmode="numeric"
              label="Kilometraje actual"
              labelPlacement="stacked"
              placeholder="0"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          class="rod-btn-primary"
          type="submit"
          expand="block"
          [disabled]="form.invalid || guardando()"
        >
          Guardar moto
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
export class MotoFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly motosService = inject(MotosService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    marca: ['', [Validators.required]],
    modelo: ['', [Validators.required]],
    placa: ['', [Validators.required]],
    cilindrada: [null as number | null],
    odometroInicial: [0, [Validators.min(0)]],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Completa los campos obligatorios.');
      return;
    }

    const { marca, modelo, placa, cilindrada, odometroInicial } = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.motosService.crear({
        marca: marca.trim(),
        modelo: modelo.trim(),
        placa: placa.trim().toUpperCase(),
        cilindrada: cilindrada ?? null,
        odometro_inicial: odometroInicial ?? 0,
      });
      await this.notify.success('Moto registrada.');
      await this.router.navigateByUrl('/app/garaje');
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        await this.notify.error('Ya existe una moto registrada con esa placa.');
      } else {
        await this.notify.error('No se pudo registrar la moto. Intenta de nuevo.');
      }
      console.error('[MotoFormPage] guardar', error);
    } finally {
      this.guardando.set(false);
    }
  }
}
