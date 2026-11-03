/**
 * Configuracion de entorno - PRODUCCION.
 * Ajusta `redirectWeb` al dominio real donde se despliegue la PWA.
 */
export const environment = {
  production: true,

  supabase: {
    url: 'https://smkhwldylnztluitsciz.supabase.co',
    anonKey:
      'sb_publishable_TSFfQV3-2h7Hv2vcbspPfQ_vr9V7134',
  },

  auth: {
    redirectWeb: 'https://rodapp.example.com/auth/callback',
    redirectNative: 'com.rodapp.hibrido://auth/callback',
  },
} as const;
