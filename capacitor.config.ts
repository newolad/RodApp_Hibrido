import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuracion de Capacitor (capa nativa Android / iOS).
 *
 * - `webDir` apunta a `www`, que es la carpeta que genera `ng build`
 *   (ver `outputPath` en angular.json). `npx cap sync` copia ese contenido
 *   dentro de los proyectos nativos.
 * - El esquema de deep link `com.rodapp.hibrido://` se usa para capturar el
 *   retorno del login con Google (OAuth). Debe declararse ademas en:
 *     Android -> android/app/src/main/AndroidManifest.xml (intent-filter)
 *     iOS     -> ios/App/App/Info.plist (CFBundleURLTypes)
 *   y registrarse como "Redirect URL" en el panel de Supabase (Auth > URL Configuration).
 */
const config: CapacitorConfig = {
  appId: 'com.rodapp.hibrido',
  appName: 'RodApp',
  webDir: 'www',
  // En Android servimos el contenido bajo el esquema https para evitar
  // problemas de "mixed content" y de cookies de terceros con Supabase.
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#101f22',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
