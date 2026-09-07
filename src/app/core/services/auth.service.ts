import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { environment } from '@env/environment';
import { SupabaseService } from './supabase.service';
import { Perfil, RegistroPayload, SesionActual } from '../models/models';

/**
 * Servicio de autenticacion de RodApp.
 *
 * Centraliza TODO lo relacionado con la identidad del usuario:
 *   - registro con correo + contrasena
 *   - inicio de sesion con correo + contrasena
 *   - inicio de sesion con Google (OAuth), tanto en web como en movil
 *   - cierre de sesion
 *   - estado reactivo de la sesion (signals) para guards y plantillas
 *
 * Reglas de uso correcto de la BD (Supabase):
 *   - La contrasena NUNCA se guarda en tablas: la gestiona `auth.users` (hash + salt).
 *   - Tras crear el usuario, se crea/actualiza su fila en la tabla `users`
 *     (perfil de negocio) usando el MISMO id que `auth.users.id`.
 *   - La sesion se persiste con el adaptador de almacenamiento del cliente
 *     (Preferences en nativo, localStorage en web); no la guardamos nosotros.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  /** Sesion actual de Supabase (o null si no hay). Signal -> reactivo en templates. */
  private readonly _session = signal<Session | null>(null);
  /** Perfil de negocio (tabla `users`) del usuario actual. */
  private readonly _perfil = signal<Perfil | null>(null);
  /** Indica que ya se resolvio la sesion inicial (evita parpadeos en los guards). */
  private readonly _ready = signal(false);

  /** true cuando hay un usuario autenticado. */
  readonly isAuthenticated = computed(() => this._session() !== null);
  /** true cuando `init()` ya termino la primera comprobacion. */
  readonly isReady = this._ready.asReadonly();
  readonly perfil = this._perfil.asReadonly();

  /** Vista compacta de la sesion para plantillas (perfil, header, etc.). */
  readonly sesion = computed<SesionActual | null>(() => {
    const s = this._session();
    if (!s) return null;
    const p = this._perfil();
    const meta: Record<string, unknown> = s.user.user_metadata ?? {};
    return {
      userId: s.user.id,
      email: s.user.email ?? null,
      nombre: p?.name ?? (meta['full_name'] as string) ?? (meta['name'] as string) ?? null,
      avatarUrl: p?.avatar_url ?? (meta['avatar_url'] as string) ?? null,
    };
  });

  /**
   * Inicializa el estado de sesion. Se llama una sola vez al arrancar la app
   * (ver el proveedor `APP_INITIALIZER` en app.config.ts).
   */
  async init(): Promise<void> {
    // 1. Sesion ya persistida (usuario que vuelve a abrir la app).
    const { data } = await this.supabase.client.auth.getSession();
    this._session.set(data.session);
    if (data.session) {
      await this.cargarPerfil(data.session);
    }

    // 2. Suscripcion a cambios (login, logout, refresh de token, OAuth...).
    this.supabase.client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      this._session.set(session);
      if (session) {
        void this.cargarPerfil(session);
      } else {
        this._perfil.set(null);
      }
    });

    this._ready.set(true);
  }

  /* ===================== Registro con correo ===================== */

  /**
   * Crea la cuenta en `auth.users` y su fila de perfil en `users`.
   * @returns `{ needsEmailConfirmation }` -> si el proyecto exige confirmar el correo,
   *          no habra sesion hasta que el usuario haga clic en el enlace.
   */
  async registerWithEmail(payload: RegistroPayload): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        // Se guarda en `auth.users.user_metadata`; util antes de tener fila en `users`.
        data: { full_name: [payload.nombre, payload.apellido].filter(Boolean).join(' ').trim() },
        emailRedirectTo: this.redirectUrl(),
      },
    });

    if (error) throw error;

    // Si ya hay usuario, sembramos su perfil de negocio.
    if (data.user) {
      const perfil: Perfil = {
        id: data.user.id,
        name: payload.nombre.trim(),
        lastname: payload.apellido?.trim() || null,
        correo: payload.email.trim(),
        rol: 'user',
      };
      const { error: perfilError } = await this.supabase.upsertPerfil(perfil);
      // No abortamos el registro por un fallo de perfil (se puede reintentar al entrar).
      if (perfilError) console.warn('[AuthService] No se pudo crear el perfil:', perfilError.message);
    }

    return { needsEmailConfirmation: !data.session };
  }

  /* ================== Inicio de sesion con correo ================== */

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    // `onAuthStateChange` actualiza los signals automaticamente.
  }

  /* ================== Inicio de sesion con Google ================= */

  /**
   * Login con Google (OAuth 2.0 / OpenID Connect via Supabase).
   *
   * - WEB: `signInWithOAuth` redirige el navegador a Google y luego a
   *   `redirectWeb`. El SDK (detectSessionInUrl) intercambia el `code` por
   *   la sesion al cargar `/auth/callback`.
   * - NATIVO: abrimos la URL de Google en el navegador del sistema
   *   (`@capacitor/browser`). Google redirige al deep link
   *   `com.rodapp.hibrido://auth/callback`, que capturamos en AppComponent y
   *   pasamos a `completeOAuthFromUrl()`.
   */
  async loginWithGoogle(): Promise<void> {
    const isNative = Capacitor.isNativePlatform();

    const { data, error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: this.redirectUrl(),
        skipBrowserRedirect: isNative,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });

    if (error) throw error;

    if (isNative && data?.url) {
      await Browser.open({ url: data.url, presentationStyle: 'popover' });
    }
    // En web el navegador ya se esta redirigiendo; no hay mas que hacer aqui.
  }

  /**
   * Completa el login con Google en NATIVO: recibe la URL del deep link
   * (`com.rodapp.hibrido://auth/callback?code=...`) e intercambia el codigo
   * por una sesion valida.
   */
  async completeOAuthFromUrl(url: string): Promise<void> {
    try {
      await Browser.close();
    } catch {
      /* En algunas plataformas el navegador ya esta cerrado; se ignora. */
    }

    const code = new URL(url).searchParams.get('code');
    if (!code) return;

    const { error } = await this.supabase.client.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  /* ========================= Cerrar sesion ======================== */

  /**
   * Cierra la sesion: revoca el token en Supabase y limpia el almacenamiento
   * local (lo hace el propio SDK a traves del storage adapter).
   */
  async logout(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this._session.set(null);
    this._perfil.set(null);
  }

  /* ============================ Internos ========================== */

  /** Carga (o crea si falta) la fila de perfil del usuario en la tabla `users`. */
  private async cargarPerfil(session: Session): Promise<void> {
    const { data, error } = await this.supabase.getPerfil(session.user.id);

    if (data) {
      this._perfil.set(data as Perfil);
      return;
    }

    // No existe fila de perfil (p. ej. primer login con Google) -> la creamos.
    if (error?.code === 'PGRST116' /* no rows */) {
      const meta: Record<string, unknown> = session.user.user_metadata ?? {};
      const nombreCompleto = ((meta['full_name'] ?? meta['name'] ?? '') as string).trim();
      const [name, ...rest] = nombreCompleto.split(' ');
      const nuevo: Perfil = {
        id: session.user.id,
        name: name || session.user.email?.split('@')[0] || 'Motero',
        lastname: rest.join(' ') || null,
        correo: session.user.email ?? null,
        avatar_url: (meta['avatar_url'] as string) ?? null,
        rol: 'user',
      };
      const { data: creado } = await this.supabase.upsertPerfil(nuevo);
      this._perfil.set((creado as Perfil) ?? nuevo);
    }
  }

  /** Devuelve el redirect OAuth correcto segun la plataforma. */
  private redirectUrl(): string {
    return Capacitor.isNativePlatform()
      ? environment.auth.redirectNative
      : environment.auth.redirectWeb;
  }
}
