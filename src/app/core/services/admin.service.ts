import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { AdminUsuario } from '../models/models';

/**
 * Operaciones del panel de administrador.
 *
 * No consulta tablas directamente: usa dos RPC `security definer`
 * (`supabase/migrations/20261112000100_panel_admin.sql`) que validan en el
 * servidor que quien llama es admin a partir de su JWT. El `adminGuard` del
 * cliente solo evita mostrar la pantalla; la seguridad real esta en la BD.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  /** Todos los usuarios registrados con sus motos (mas recientes primero). */
  async listarUsuarios(): Promise<AdminUsuario[]> {
    const { data, error } = await this.supabase.client.rpc('admin_listar_usuarios');
    if (error) throw error;
    return (data ?? []) as AdminUsuario[];
  }

  /** Suspende (con motivo opcional) o habilita la cuenta de un usuario. */
  async cambiarSuspension(userId: string, suspender: boolean, motivo?: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('admin_cambiar_suspension', {
      p_user_id: userId,
      p_suspender: suspender,
      p_motivo: motivo ?? null,
    });
    if (error) throw error;
  }
}
