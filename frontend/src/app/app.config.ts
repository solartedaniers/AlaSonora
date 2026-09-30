import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withXhr, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { isDevMode, inject } from '@angular/core';

import { routes } from './app.routes';
import { I18nService } from './core/services/i18n.service';
import { ThemeService } from './core/services/theme.service';
import { I18nTitleStrategy } from './core/services/i18n-title.strategy';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Fuerza la creación temprana de ThemeService/I18nService y ESPERA el
    // diccionario antes del primer render: sin esto el HTML generado en el
    // servidor (SSG/SSR) saldría con claves crudas ("landing.title") y, al
    // hidratar, el cliente las pintaría encima del texto ya traducido.
    provideAppInitializer(() => {
      inject(ThemeService);
      return inject(I18nService).ready;
    }),
    // Hidratación: el cliente reutiliza el DOM que llegó del servidor en vez
    // de destruirlo y volver a pintarlo. withEventReplay guarda los clics
    // hechos antes de que termine la hidratación; withIncrementalHydration
    // permite hidratar bloques @defer solo cuando se necesitan.
    // includeNonCacheableRequests: Spring Security responde todo con
    // "Cache-Control: no-store", y sin esto Angular no pasaría al cliente los
    // datos que el servidor ya pidió (p. ej. el feed de /map), obligando al
    // navegador a repetir la misma petición. Es seguro: en el servidor nunca
    // hay sesión, así que ahí solo se hacen peticiones públicas.
    provideClientHydration(
      withEventReplay(),
      withIncrementalHydration(),
      withHttpTransferCacheOptions({ includeNonCacheableRequests: true })
    ),
  ],
};
