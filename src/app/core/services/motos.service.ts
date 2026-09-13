import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { Moto } from '../models/models';

/**
 * Estado de las motos del usuario actual (tabla `motos`).
 *
 * Lo usan tanto el Garaje (listar/crear) como los formularios de
 * combustible, mantenimiento, SOAT y RTM (necesitan un `moto_id` valido
 * para poder guardar).
 */
@Injectable({ providedIn: 'root' })
export class MotosService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private readonly _motos = signal<Moto[]>([]);
  private readonly _cargando = signal(false);
  private readonly _cargado = signal(false);

  readonly motos = this._motos.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  /** true una vez que se resolvio la primera carga (evita parpadeos de "vacio"). */
  readonly cargado = this._cargado.asReadonly();
  /** La primera moto activa del usuario, si tiene alguna. */
  readonly motoActiva = computed<Moto | null>(() => this._motos()[0] ?? null);

  /** Trae las motos activas del usuario autenticado. Idempotente entre llamados en paralelo. */
  async cargar(): Promise<void> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) return;

    this._cargando.set(true);
    try {
      const { data, error } = await this.supabase.getMotos(userId);
      if (error) throw error;
      this._motos.set((data as Moto[]) ?? []);
    } finally {
      this._cargando.set(false);
      this._cargado.set(true);
    }
  }

  /** Crea una moto para el usuario actual y refresca la lista local. */
  async crear(datos: Omit<Moto, 'user_id' | 'activa'>): Promise<Moto> {
    const userId = this.auth.sesion()?.userId;
    if (!userId) throw new Error('No hay sesion activa.');

    const { data, error } = await this.supabase.crearMoto({
      ...datos,
      user_id: userId,
      activa: true,
    });
    if (error) throw error;

    const creada = data as Moto;
    this._motos.update((motos) => [creada, ...motos]);
    return creada;
  }
}
