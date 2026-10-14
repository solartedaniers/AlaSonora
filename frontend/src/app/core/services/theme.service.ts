import { Injectable, PLATFORM_ID, signal, effect, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'alasonora.theme';
const CHROME_COLOR_TOKEN = '--color-chrome';
const THEME_COLOR_META = 'meta[name="theme-color"]';

/**
 * Servicio de tema. Patrón: fuente única de verdad reactiva (signal) que
 * un `effect` sincroniza con el DOM (clase en <html>) y con localStorage.
 * Separado de los componentes visuales para respetar SRP: un componente de
 * UI (theme-toggle) solo invoca este servicio, nunca manipula el DOM directo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  // En el servidor (SSR/prerender) no hay localStorage ni matchMedia: el HTML
  // sale sin clase de tema y el script inline de index.html resuelve la
  // elección guardada (o «sistema») antes del primer pintado.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly resolvedTheme = signal<'light' | 'dark'>('light');

  private readonly mediaQuery = this.isBrowser ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  constructor() {
    this.mediaQuery?.addEventListener('change', () => this.applyResolvedTheme());

    effect(() => {
      const mode = this.mode();
      if (this.isBrowser) localStorage.setItem(STORAGE_KEY, mode);
      this.applyResolvedTheme();
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private applyResolvedTheme(): void {
    if (!this.isBrowser) return;
    const mode = this.mode();
    const prefersDark = this.mediaQuery?.matches ?? false;
    const resolved: 'light' | 'dark' = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

    this.resolvedTheme.set(resolved);

    const root = this.document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
    this.document.body.classList.remove('theme-light', 'theme-dark');
    this.document.body.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
    this.syncBrowserBarColor();
  }

  /** La barra del navegador continúa la cabecera del tema elegido, no solo el del sistema. */
  private syncBrowserBarColor(): void {
    const chrome = getComputedStyle(this.document.documentElement).getPropertyValue(CHROME_COLOR_TOKEN).trim();
    if (!chrome) return;
    this.document.querySelectorAll<HTMLMetaElement>(THEME_COLOR_META).forEach((meta) => (meta.content = chrome));
  }

  private readStoredMode(): ThemeMode {
    if (!this.isBrowser) return 'system';
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
