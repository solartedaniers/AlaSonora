import { Injectable, effect, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, ActivationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from './i18n.service';

/** Clave i18n de la descripción en `data` de cada ruta; sin ella se usa la general. */
export const DESCRIPTION_KEY = 'descriptionKey';
const DEFAULT_DESCRIPTION_KEY = 'seo.default';

/**
 * Meta description por ruta, traducida. Corre también en el servidor, así que sale en el HTML
 * prerenderizado (SSG) y en el del mapa (SSR); al cambiar el idioma se vuelve a aplicar.
 */
@Injectable({ providedIn: 'root' })
export class RouteMetaService {
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);
  private readonly descriptionKey = signal(DEFAULT_DESCRIPTION_KEY);

  constructor() {
    inject(Router)
      .events.pipe(filter((event): event is ActivationEnd => event instanceof ActivationEnd))
      .subscribe(({ snapshot }) => {
        // ActivationEnd llega de la ruta más profunda hacia arriba: me quedo con la hoja.
        if (!snapshot.firstChild) this.descriptionKey.set(RouteMetaService.keyFor(snapshot));
      });
    effect(() => {
      const description = this.i18n.translate(this.descriptionKey());
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
    });
  }

  private static keyFor(snapshot: ActivatedRouteSnapshot): string {
    return (snapshot.data[DESCRIPTION_KEY] as string | undefined) ?? DEFAULT_DESCRIPTION_KEY;
  }
}
