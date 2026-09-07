/**
 * Modelos de dominio de RodApp.
 *
 * Traduccion de `app/src/main/java/com/example/rodapp/models/Models.kt`
 * (proyecto Android original) a interfaces TypeScript. Se mantienen los
 * nombres de campo en snake_case para que coincidan 1:1 con las columnas
 * de las tablas de Supabase y minimizar el mapeo.
 */

/* ============================ Autenticacion ============================ */

/** Fila de la tabla `users` (perfil ligado a `auth.users.id`). */
export interface Perfil {
  id: string; // == auth.users.id (uuid)
  name: string;
  lastname?: string | null;
  correo?: string | null;
  avatar_url?: string | null;
  rol?: 'user' | 'admin';
  created_at?: string;
}

/** Datos que el formulario de registro envia a `AuthService.signUp`. */
export interface RegistroPayload {
  nombre: string;
  apellido?: string | null;
  email: string;
  password: string;
}

/** Vista simplificada de la sesion, para plantillas y guards. */
export interface SesionActual {
  userId: string;
  email: string | null;
  nombre: string | null;
  avatarUrl: string | null;
}

/* ============================== Motos ================================= */

export interface Moto {
  id?: string;
  user_id: string;
  marca: string;
  modelo: string;
  cilindrada?: number | null;
  placa: string;
  odometro_inicial: number; // default 0
  foto_url?: string | null;
  activa: boolean; // default true
}

/* =========================== Documentos ============================== */

export interface SoatInsert {
  moto_id: string;
  numero_poliza: string;
  aseguradora: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_vencimiento: string;
}

export interface RtmInsert {
  moto_id: string;
  numero_certificado: string;
  nombre_cda: string;
  fecha_expedicion: string;
  fecha_vencimiento: string;
}

export interface DocumentoInsert {
  moto_id: string;
  tipo: string;
  nombre: string;
  entidad_emisora?: string | null;
  fecha_vencimiento?: string | null;
  recordatorio_activo: boolean; // default true
}

/* ===================== Combustible / Mantenimiento =================== */

export interface CombustibleInsert {
  moto_id: string;
  tipo_gasolina: string;
  costo: number;
  kilometraje: number;
  latitud?: number | null;
  longitud?: number | null;
}

export interface MantenimientoInsert {
  moto_id: string;
  tipo: string;
  fecha: string;
  kilometraje: number;
  repetir_cada_km?: number | null;
  notas?: string | null;
}
