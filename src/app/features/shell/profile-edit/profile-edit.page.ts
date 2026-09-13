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

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

/**
 * Frame Figma "Perfil" (10.2 de `mockups/VISTAS.md`) — Editar datos personales.
 *
 * Formulario minimo: nombre y apellido (el correo no se edita aqui, lo
 * gestiona Supabase Auth). Persiste en la tabla `users` via
 * `AuthService.actualizarPerfil`.
 */
@Component({
  selector: 'app-profile-edit',
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
          <ion-back-button defaultHref="/app/perfil" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Editar datos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form class="rod-container" [formGroup]="form" (ngSubmit)="guardar()">
        <ion-list lines="none" class="campos">
          <ion-item class="rod-card">
            <ion-input
              formControlName="name"
              label="Nombre"
              labelPlacement="stacked"
              placeholder="Tu nombre"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              formControlName="lastname"
              label="Apellido"
              labelPlacement="stacked"
              placeholder="Opcional"
            ></ion-input>
          </ion-item>

          <ion-item class="rod-card">
            <ion-input
              [value]="correo()"
              label="Correo"
              labelPlacement="stacked"
              [disabled]="true"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          class="rod-btn-primary"
          type="submit"
          expand="block"
          [disabled]="form.invalid || guardando()"
        >
          Guardar cambios
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
export class ProfileEditPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);
  readonly correo = () => this.auth.sesion()?.email ?? '';

  readonly form = this.fb.nonNullable.group({
    name: [this.auth.perfil()?.name ?? '', [Validators.required]],
    lastname: [this.auth.perfil()?.lastname ?? ''],
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('El nombre es obligatorio.');
      return;
    }

    const { name, lastname } = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.auth.actualizarPerfil({ name: name.trim(), lastname: lastname?.trim() || null });
      await this.notify.success('Datos actualizados.');
      await this.router.navigateByUrl('/app/perfil');
    } catch (error) {
      await this.notify.error('No se pudieron guardar los cambios. Intenta de nuevo.');
      console.error('[ProfileEditPage] guardar', error);
    } finally {
      this.guardando.set(false);
    }
  }
}
