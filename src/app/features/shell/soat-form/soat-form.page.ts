import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
  IonButton,
} from '@ionic/angular/standalone';

import { MotosService } from '@core/services/motos.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';

/**
 * Frame Figma "Plantilla reg SOAT" (2:2517).
 *
 * Alta del SOAT de una moto: numero de poliza, aseguradora, fecha de inicio y
 * de vencimiento. Se guarda en la tabla `soat`, asociada a la moto activa
 * del usuario (o a la elegida, si tiene mas de una).
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
    IonSelect,
    IonSelectOption,
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
          @if (motosService.motos().length > 1) {
            <ion-item class="rod-card">
              <ion-select
                formControlName="motoId"
                label="Moto"
                labelPlacement="stacked"
                interface="action-sheet"
                placeholder="Selecciona"
              >
                @for (moto of motosService.motos(); track moto.id) {
                  <ion-select-option [value]="moto.id">
                    {{ moto.marca }} {{ moto.modelo }} · {{ moto.placa }}
                  </ion-select-option>
                }
              </ion-select>
            </ion-item>
          }

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
          [disabled]="form.invalid || guardando()"
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
export class SoatFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  readonly motosService = inject(MotosService);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    motoId: ['', [Validators.required]],
    numeroPoliza: ['', [Validators.required]],
    aseguradora: ['', [Validators.required]],
    fechaInicio: ['', [Validators.required]],
    fechaVencimiento: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await this.motosService.cargar();
    const activa = this.motosService.motoActiva();
    if (activa) this.form.patchValue({ motoId: activa.id });
  }

  async guardar(): Promise<void> {
    if (!this.motosService.motoActiva()) {
      await this.notify.error('Primero registra una moto en el Garaje.');
      await this.router.navigateByUrl('/app/garaje');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Completa todos los campos.');
      return;
    }

    const { motoId, numeroPoliza, aseguradora, fechaInicio, fechaVencimiento } =
      this.form.getRawValue();
    this.guardando.set(true);
    try {
      const { error } = await this.supabase.registrarSoat({
        moto_id: motoId,
        numero_poliza: numeroPoliza,
        aseguradora,
        fecha_inicio: fechaInicio,
        fecha_vencimiento: fechaVencimiento,
      });
      if (error) throw error;
      await this.notify.success('SOAT registrado.');
      await this.router.navigateByUrl('/app/garaje/detalle');
    } catch (error) {
      await this.notify.error('No se pudo guardar el SOAT. Intenta de nuevo.');
      console.error('[SoatFormPage] guardar', error);
    } finally {
      this.guardando.set(false);
    }
  }
}
