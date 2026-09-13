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
 * Frames Figma "Formulario de Combustible" (2:2931) y "Registro de Combustible"
 * (2:320) — misma vista.
 *
 * Alta de una tanqueada: tipo de gasolina, costo, kilometraje y ubicacion.
 * Se guarda en la tabla `registros_combustible`, asociada a la moto activa
 * del usuario (o a la elegida, si tiene mas de una).
 */
@Component({
  selector: 'app-fuel-form',
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
          <ion-back-button defaultHref="/app/inicio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Registrar tanqueada</ion-title>
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
            <ion-select
              formControlName="tipoGasolina"
              label="Tipo de gasolina"
              labelPlacement="stacked"
              interface="action-sheet"
              placeholder="Selecciona"
            >
              <ion-select-option value="corriente">Corriente</ion-select-option>
              <ion-select-option value="extra">Extra</ion-select-option>
              <ion-select-option value="acpm">ACPM / Diesel</ion-select-option>
            </ion-select>
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
              formControlName="kilometraje"
              type="number"
              inputmode="numeric"
              label="Kilometraje (odometro)"
              labelPlacement="stacked"
              placeholder="0"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="lugar"
              label="Ubicacion / estacion"
              labelPlacement="stacked"
              placeholder="Opcional"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          class="rod-btn-primary"
          type="submit"
          expand="block"
          [disabled]="form.invalid || guardando()"
        >
          Guardar
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
export class FuelFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  readonly motosService = inject(MotosService);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    motoId: ['', [Validators.required]],
    tipoGasolina: ['', [Validators.required]],
    costo: [null as number | null, [Validators.required, Validators.min(1)]],
    kilometraje: [null as number | null, [Validators.required, Validators.min(0)]],
    lugar: [''],
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
      await this.notify.error('Completa los campos obligatorios.');
      return;
    }

    const { motoId, tipoGasolina, costo, kilometraje, lugar } = this.form.getRawValue();
    this.guardando.set(true);
    try {
      const { error } = await this.supabase.registrarCombustible({
        moto_id: motoId,
        tipo_gasolina: tipoGasolina,
        costo: costo!,
        kilometraje: kilometraje!,
        lugar: lugar || null,
      });
      if (error) throw error;
      await this.notify.success('Tanqueada registrada.');
      await this.router.navigateByUrl('/app/historial');
    } catch (error) {
      await this.notify.error('No se pudo guardar la tanqueada. Intenta de nuevo.');
      console.error('[FuelFormPage] guardar', error);
    } finally {
      this.guardando.set(false);
    }
  }
}
