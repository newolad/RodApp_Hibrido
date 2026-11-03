/**
 * Configuracion de entorno - DESARROLLO.
 *
 * Reutiliza el mismo proyecto Supabase del RodApp original (Android).
 * La clave `anonKey` es publica por diseno (RLS protege los datos en el
 * servidor); aun asi, no subas aqui la `service_role`.
 *
 * En produccion, Angular reemplaza este archivo por `environment.prod.ts`
 * (ver `fileReplacements` en angular.json).
 */
export const environment = {
  production: false,

  supabase: {
    url: 'https://smkhwldylnztluitsciz.supabase.co',
    anonKey:
      'sb_publishable_TSFfQV3-2h7Hv2vcbspPfQ_vr9V7134',
  },

  /**
   * URLs de retorno del login con Google (OAuth).
   * Ambas deben estar registradas en Supabase:
   *   Dashboard > Authentication > URL Configuration > Redirect URLs
   */
  auth: {
    redirectWeb: 'https://rodapp.example.com/auth/callback',
    redirectNative: 'com.rodapp.hibrido://auth/callback',
  },
} as const;
