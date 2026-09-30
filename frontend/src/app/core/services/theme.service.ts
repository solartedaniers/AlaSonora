import { Injectable, PLATFORM_ID, signal, effect, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'alasonora.theme';

/**
 * Servicio de tema. Patrón: fuente única de verdad reactiva (signal) que
 * un `effect` sincroniza con el DOM (clase en <html>) y con localStorage.
 * Separado de los componentes visuales para respetar SRP: un componente de
 * UI (theme-toggle) solo invoca este servicio, nunca manipula el DOM directo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  // En el servidor (SSR/prerender) no hay localStorage ni matchMedia: se
  // renderiza con el tema por defecto y el script inline de index.html
  // corrige la clase antes del primer pintado en el navegador.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly resolvedTheme = signal<'light' | 'dark'>('dark');

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
    const mode = this.mode();
    const prefersDark = this.mediaQuery?.matches ?? true;
    const resolved: 'light' | 'dark' = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

    this.resolvedTheme.set(resolved);

    const root = this.document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
    this.document.body.classList.remove('theme-light', 'theme-dark');
    this.document.body.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
  }

  private readStoredMode(): ThemeMode {
    if (!this.isBrowser) return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
  }
}
