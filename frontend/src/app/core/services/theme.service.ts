import { Injectable, signal, effect } from '@angular/core';

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
  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly resolvedTheme = signal<'light' | 'dark'>('dark');

  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.mediaQuery.addEventListener('change', () => this.applyResolvedTheme());

    effect(() => {
      const mode = this.mode();
      localStorage.setItem(STORAGE_KEY, mode);
      this.applyResolvedTheme();
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private applyResolvedTheme(): void {
    const mode = this.mode();
    const resolved: 'light' | 'dark' =
      mode === 'system' ? (this.mediaQuery.matches ? 'dark' : 'light') : mode;

    this.resolvedTheme.set(resolved);

    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(resolved === 'dark' ? 'theme-dark' : 'theme-light');
  }

  private readStoredMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
  }
}
