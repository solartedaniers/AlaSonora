import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

/**
 * El `title` de cada ruta es una clave de i18n, no un texto: esta estrategia
 * la traduce y le antepone el nombre de la app. El effect vuelve a aplicar el
 * título cuando cambia el idioma, sin esperar a otra navegación.
 */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private readonly titleKey = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const key = this.titleKey();
      if (key) this.title.setTitle(`${this.i18n.translate('app.name')} — ${this.i18n.translate(key)}`);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titleKey.set(this.buildTitle(snapshot));
  }
}
