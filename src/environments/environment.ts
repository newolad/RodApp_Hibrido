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
    url: 'https://erttcudseqjrpyathmal.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydHRjdWRzZXFqcnB5YXRobWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTUwMzUsImV4cCI6MjA5MTA5MTAzNX0.zmyADFrL2iPvGMhy9eU2SQ7VWZsF_h2E2D86RpMzgWA',
  },

  /**
   * URLs de retorno del login con Google (OAuth).
   * Ambas deben estar registradas en Supabase:
   *   Dashboard > Authentication > URL Configuration > Redirect URLs
   */
  auth: {
    redirectWeb: 'http://localhost:8100/auth/callback',
    redirectNative: 'com.rodapp.hibrido://auth/callback',
  },
} as const;
