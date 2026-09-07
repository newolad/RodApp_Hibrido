/**
 * Configuracion de entorno - PRODUCCION.
 * Ajusta `redirectWeb` al dominio real donde se despliegue la PWA.
 */
export const environment = {
  production: true,

  supabase: {
    url: 'https://erttcudseqjrpyathmal.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydHRjdWRzZXFqcnB5YXRobWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTUwMzUsImV4cCI6MjA5MTA5MTAzNX0.zmyADFrL2iPvGMhy9eU2SQ7VWZsF_h2E2D86RpMzgWA',
  },

  auth: {
    redirectWeb: 'https://rodapp.example.com/auth/callback',
    redirectNative: 'com.rodapp.hibrido://auth/callback',
  },
} as const;
