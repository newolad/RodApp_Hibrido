import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Adaptador de almacenamiento para el cliente de Supabase.
 *
 * Por que existe:
 * - En la WEB, `localStorage` funciona bien y es lo que Supabase usa por defecto.
 * - En NATIVO (Android/iOS bajo Capacitor), `localStorage` del WebView puede ser
 *   borrado por el sistema. `@capacitor/preferences` persiste de forma nativa
 *   (SharedPreferences / UserDefaults), asi la sesion sobrevive reinicios.
 *
 * Supabase espera un objeto con `getItem/setItem/removeItem` (sincrono o async).
 * Aqui devolvemos Promesas: el SDK las soporta sin problema.
 */
export const capacitorStorageAdapter = {
  /** Lee un valor por clave. Devuelve null si no existe. */
  getItem: async (key: string): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
      return Promise.resolve(localStorage.getItem(key));
    }
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },

  /** Guarda un valor (la sesion JWT serializada de Supabase). */
  setItem: async (key: string, value: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }
    await Preferences.set({ key, value });
  },

  /** Elimina un valor (al cerrar sesion). */
  removeItem: async (key: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }
    await Preferences.remove({ key });
  },
};
