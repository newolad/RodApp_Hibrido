import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '@env/environment';
import { capacitorStorageAdapter } from '../storage/capacitor-storage.adapter';
import {
  Moto,
  SoatInsert,
  RtmInsert,
  CombustibleInsert,
  MantenimientoInsert,
  DocumentoInsert,
  Perfil,
} from '../models/models';

/**
 * Punto unico de acceso a Supabase (equivalente al `SupabaseClient.kt`
 * singleton del proyecto Android). Cualquier servicio o pagina lo reutiliza
 * por inyeccion de dependencias, sin volver a crear el cliente.
 *
 * La logica de sesion/login vive en `AuthService`; aqui solo se crea el
 * cliente y se agrupan las consultas a tablas (data layer).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Cliente configurado. `AuthService` accede a `client.auth`. */
  readonly client: SupabaseClient;

  constructor() {
    const isNative = Capacitor.isNativePlatform();

    this.client = createClient(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        // Persistimos la sesion con el adaptador (Preferences en nativo, localStorage en web).
        storage: capacitorStorageAdapter,
        persistSession: true,
        autoRefreshToken: true,
        // PKCE: flujo recomendado para apps publicas (SPA + moviles).
        flowType: 'pkce',
        // En web dejamos que el SDK lea el `?code=` de la URL de retorno de Google.
        // En nativo lo procesamos a mano desde el deep link (ver AuthService).
        detectSessionInUrl: !isNative,
      },
    });
  }

  /* ===================== Perfil (tabla `users`) ===================== */

  /** Trae la fila de perfil ligada al usuario autenticado. */
  getPerfil(userId: string) {
    return this.client.from('users').select('*').eq('id', userId).single();
  }

  /** Crea la fila de perfil tras el registro (o tras el primer login con Google). */
  upsertPerfil(perfil: Perfil) {
    return this.client.from('users').upsert(perfil, { onConflict: 'id' }).select().single();
  }

  /** Actualiza campos del perfil (nombre, avatar, etc.). */
  updatePerfil(userId: string, cambios: Partial<Perfil>) {
    return this.client.from('users').update(cambios).eq('id', userId);
  }

  /* ========================= Motos ================================= */

  getMotos(userId: string) {
    return this.client.from('motos').select('*').eq('user_id', userId).eq('activa', true);
  }

  getMoto(motoId: string) {
    return this.client.from('motos').select('*').eq('id', motoId).single();
  }

  crearMoto(moto: Moto) {
    return this.client.from('motos').insert(moto).select().single();
  }

  actualizarMoto(motoId: string, cambios: Partial<Moto>) {
    return this.client.from('motos').update(cambios).eq('id', motoId);
  }

  /* ===================== Documentos legales ======================== */

  registrarSoat(soat: SoatInsert) {
    return this.client.from('soat').insert(soat).select().single();
  }

  getSoatsPorMoto(motoId: string) {
    return this.client
      .from('soat')
      .select('*')
      .eq('moto_id', motoId)
      .order('fecha_vencimiento', { ascending: true });
  }

  registrarRtm(rtm: RtmInsert) {
    return this.client.from('rtm').insert(rtm).select().single();
  }

  getRtmPorMoto(motoId: string) {
    return this.client
      .from('rtm')
      .select('*')
      .eq('moto_id', motoId)
      .order('fecha_vencimiento', { ascending: true });
  }

  registrarDocumento(doc: DocumentoInsert) {
    return this.client.from('documentos').insert(doc).select().single();
  }

  getDocumentosPorMoto(motoId: string) {
    return this.client.from('documentos').select('*').eq('moto_id', motoId);
  }

  /* ================= Combustible / Mantenimiento ================== */

  registrarCombustible(registro: CombustibleInsert) {
    return this.client.from('registros_combustible').insert(registro).select().single();
  }

  getCombustiblePorMoto(motoId: string) {
    return this.client
      .from('registros_combustible')
      .select('*')
      .eq('moto_id', motoId)
      .order('kilometraje', { ascending: false });
  }

  registrarMantenimiento(registro: MantenimientoInsert) {
    return this.client.from('registros_mantenimiento').insert(registro).select().single();
  }

  getMantenimientosPorMoto(motoId: string) {
    return this.client
      .from('registros_mantenimiento')
      .select('*')
      .eq('moto_id', motoId)
      .order('fecha', { ascending: false });
  }
}
