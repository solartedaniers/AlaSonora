import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode, inject } from '@angular/core';

import { routes } from './app.routes';
import { I18nService } from './core/services/i18n.service';
import { ThemeService } from './core/services/theme.service';

// Fuerza la creación temprana de I18nService/ThemeService al arrancar la
// app para que el primer render ya tenga idioma y tema resueltos (evita un
// parpadeo de textos en blanco o de tema equivocado).
function initializeCoreServices() {
  return () => {
    inject(ThemeService);
    inject(I18nService);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: APP_INITIALIZER, useFactory: initializeCoreServices, multi: true },
  ],
};
