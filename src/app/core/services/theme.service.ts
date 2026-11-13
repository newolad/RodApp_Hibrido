import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Preferencia del usuario. 'sistema' sigue el modo claro/oscuro del telefono. */
export type ModoTema = 'oscuro' | 'claro' | 'sistema';

const PREF_TEMA = 'rodapp.tema';
const CLASE_CLARO = 'rod-tema-claro';

/** Color de fondo de cada tema (barra de estado y `<meta name="theme-color">`). */
const FONDO = { oscuro: '#101f22', claro: '#f3f7f8' } as const;

/**
 * Tema visual de RodApp: oscuro (predeterminado), claro o automatico.
 *
 * El tema claro existe para usar la app con sol o con el visor ahumado /
 * polarizado del casco, donde el fondo oscuro se vuelve dificil de leer.
 *
 * Aplica la clase `rod-tema-claro` en `<html>` (los tokens de
 * `theme/variables.scss` hacen el resto), guarda la preferencia en el
 * dispositivo y ajusta la barra de estado en Android / iOS. Se inicializa en
 * `APP_INITIALIZER` para que la primera pantalla ya salga con el tema correcto.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia?.('(prefers-color-scheme: light)');
  private readonly _modo = signal<ModoTema>('oscuro');
  private readonly _sistemaClaro = signal(this.media?.matches ?? false);

  readonly modo = this._modo.asReadonly();

  /** Tema que se esta viendo realmente (resuelve 'sistema'). */
  readonly temaEfectivo = computed<'oscuro' | 'claro'>(() => {
    const modo = this._modo();
    if (modo === 'sistema') return this._sistemaClaro() ? 'claro' : 'oscuro';
    return modo;
  });

  constructor() {
    // Si el usuario eligio "automatico", seguir los cambios del telefono en vivo.
    this.media?.addEventListener?.('change', (e) => {
      this._sistemaClaro.set(e.matches);
      if (this._modo() === 'sistema') void this.aplicar();
    });
  }

  async init(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: PREF_TEMA });
      if (value === 'claro' || value === 'oscuro' || value === 'sistema') this._modo.set(value);
    } catch {
      // Sin almacenamiento disponible: se queda el tema oscuro por defecto.
    }
    await this.aplicar();
  }

  async setModo(modo: ModoTema): Promise<void> {
    this._modo.set(modo);
    await this.aplicar();
    try {
      await Preferences.set({ key: PREF_TEMA, value: modo });
    } catch {
      // La eleccion aplica igual en esta sesion.
    }
  }

  private async aplicar(): Promise<void> {
    const tema = this.temaEfectivo();
    document.documentElement.classList.toggle(CLASE_CLARO, tema === 'claro');

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', FONDO[tema]);

    if (Capacitor.isNativePlatform()) {
      try {
        // Style.Light = iconos oscuros (para fondo claro); Style.Dark = iconos claros.
        await StatusBar.setStyle({ style: tema === 'claro' ? Style.Light : Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: FONDO[tema] });
        }
      } catch {
        // La barra de estado es cosmetica: si falla no debe romper el arranque.
      }
    }
  }
}
