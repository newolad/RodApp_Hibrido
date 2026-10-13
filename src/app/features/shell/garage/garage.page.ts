import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { Moto } from '@core/models/models';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SupabaseService } from '@core/services/supabase.service';

@Component({
  selector: 'app-garage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './garage.page.html',
  styleUrl: './garage.page.scss',
})
export class GaragePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly supabase = inject(SupabaseService);

  readonly motos = signal<Moto[]>([]);
  readonly modalAbierto = signal(false);
  readonly motoEditando = signal<Moto | null>(null);
  readonly listaCargada = signal(false);
  readonly placaPattern = '^[A-Za-z0-9-]{5,8}$';

  readonly form = this.fb.nonNullable.group({
    marca: ['', [Validators.required, Validators.minLength(2)]],
    modelo: ['', [Validators.required, Validators.minLength(1)]],
    cilindrada: [null as number | null, [Validators.min(1)]],
    placa: ['', [Validators.required, Validators.pattern(this.placaPattern)]],
    odometro_inicial: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    void this.cargarMotos();
  }

  async cargarMotos(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;

    const loading = await this.notify.showLoading('Cargando motos...');
    try {
      const { data, error } = await this.supabase.getMotos(userId);
      if (error) throw error;
      this.motos.set((data ?? []) as Moto[]);
      this.listaCargada.set(true);
    } catch (error) {
      await this.notify.error(this.mensajeError(error, 'No se pudieron cargar las motos.'));
    } finally {
      await loading.dismiss();
    }
  }

  abrirNuevaMoto(): void {
    this.motoEditando.set(null);
    this.form.reset({ marca: '', modelo: '', cilindrada: null, placa: '', odometro_inicial: 0 });
    this.modalAbierto.set(true);
  }

  abrirEdicion(moto: Moto): void {
    this.motoEditando.set(moto);
    this.form.reset({
      marca: moto.marca,
      modelo: moto.modelo,
      cilindrada: moto.cilindrada ?? null,
      placa: moto.placa,
      odometro_inicial: moto.odometro_inicial,
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  async guardarMoto(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.sesion()?.userId;
    if (!userId) {
      await this.notify.error('Tu sesión terminó. Inicia sesión nuevamente.');
      return;
    }

    const values = this.form.getRawValue();
    const editing = this.motoEditando();
    const moto: Moto = {
      user_id: userId,
      marca: values.marca.trim(),
      modelo: values.modelo.trim(),
      cilindrada: values.cilindrada || null,
      placa: values.placa.trim().toUpperCase(),
      odometro_inicial: Number(values.odometro_inicial),
      activa: editing?.activa ?? true,
    };

    const loading = await this.notify.showLoading(editing ? 'Guardando cambios...' : 'Registrando moto...');
    try {
      if (editing?.id) {
        const { error } = await this.supabase.actualizarMoto(editing.id, moto);
        if (error) throw error;
        this.motos.update((items) => items.map((item) => item.id === editing.id ? { ...item, ...moto } : item));
        await this.notify.success('Cambios guardados.');
      } else {
        const { data, error } = await this.supabase.crearMoto(moto);
        if (error) throw error;
        this.motos.update((items) => [...items, (data as Moto) ?? moto]);
        await this.notify.success('Moto registrada.');
      }
      this.modalAbierto.set(false);
    } catch (error) {
      await this.notify.error(this.mensajeError(error, 'No se pudo guardar la moto.'));
    } finally {
      await loading.dismiss();
    }
  }

  async eliminarMoto(moto: Moto): Promise<void> {
    const ok = await this.notify.confirm(
      'Eliminar moto',
      `¿Quieres eliminar ${moto.marca} ${moto.modelo}? Esta acción no se puede deshacer.`,
      'Eliminar',
    );
    if (!ok || !moto.id) return;

    const userId = this.auth.sesion()?.userId;
    if (!userId) return;

    const loading = await this.notify.showLoading('Eliminando moto...');
    try {
      const { error } = await this.supabase.eliminarMoto(moto.id, userId);
      if (error) throw error;
      this.motos.update((items) => items.filter((item) => item.id !== moto.id));
      await this.notify.success('Moto eliminada.');
    } catch (error) {
      await this.notify.error(this.mensajeError(error, 'No se pudo eliminar la moto.'));
    } finally {
      await loading.dismiss();
    }
  }

  mostrarErrorCampo(campo: 'marca' | 'modelo' | 'placa' | 'odometro_inicial'): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  private mensajeError(error: unknown, fallback: string): string {
    const message = (error as { message?: string })?.message?.toLowerCase() ?? '';
    return message.includes('network') || message.includes('failed to fetch')
      ? 'Error de conexión. Revisa tu internet e intenta de nuevo.'
      : fallback;
  }
}