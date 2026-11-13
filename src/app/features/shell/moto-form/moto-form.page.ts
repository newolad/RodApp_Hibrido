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
  IonIcon,
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
    IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/app/garaje" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Registro de tu moto</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container moto-form" [formGroup]="form" (ngSubmit)="guardar()">
        <!-- Cabecera del Figma "Registro de tu Moto" -->
        <header class="intro">
          <span class="intro-icon"><ion-icon name="bicycle" aria-hidden="true"></ion-icon></span>
          <h1>Detalles de tu máquina</h1>
          <p>Ingresa los datos para empezar el seguimiento de mantenimiento y rendimiento.</p>
        </header>

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
          Guardar y empezar
          <ion-icon slot="end" name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .moto-form {
        max-width: 560px;
        padding-bottom: 40px;
      }
      .intro {
        margin-bottom: 20px;
      }
      .intro-icon {
        width: 64px;
        height: 64px;
        margin-bottom: 14px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: var(--rod-accent-soft);
        color: var(--ion-color-primary);
        font-size: 36px;
      }
      .intro h1 {
        margin: 0 0 6px;
        font-family: var(--rod-font-heading);
        font-size: 22px;
        font-weight: 700;
        color: var(--rod-text-heading);
      }
      .intro p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--rod-text-secondary);
      }
      .campos {
        background: transparent;
        padding: 0;
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
