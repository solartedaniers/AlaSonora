import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type AppLang = 'es' | 'en';

const STORAGE_KEY = 'alasonora.lang';
type TranslationDict = Record<string, unknown>;

/**
 * Servicio de i18n construido a medida (sin dependencia externa) que
 * carga los archivos i18n/es.json / i18n/en.json en tiempo de ejecución.
 * Guarda las traducciones en un signal para que los componentes que las
 * consumen (vía TranslatePipe) se re-rendericen automáticamente al
 * cambiar de idioma, sin recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);

  readonly lang = signal<AppLang>(this.readStoredLang());
  readonly dict = signal<TranslationDict>({});

  constructor() {
    effect(() => {
      const lang = this.lang();
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      this.loadDictionary(lang);
    });
  }

  setLang(lang: AppLang): void {
    this.lang.set(lang);
  }

  toggleLang(): void {
    this.lang.set(this.lang() === 'es' ? 'en' : 'es');
  }

  /** Resuelve una clave con notación de puntos, ej. "landing.hero.title". */
  translate(key: string): string {
    const parts = key.split('.');
    let node: unknown = this.dict();
    for (const part of parts) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key; // fallback visible para detectar claves faltantes en desarrollo
      }
    }
    return typeof node === 'string' ? node : key;
  }

  private async loadDictionary(lang: AppLang): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<TranslationDict>(`i18n/${lang}.json`)
    ).catch(() => ({}) as TranslationDict);
    this.dict.set(data);
  }

  private readStoredLang(): AppLang {
    const stored = localStorage.getItem(STORAGE_KEY) as AppLang | null;
    return stored === 'en' ? 'en' : 'es';
  }
}
