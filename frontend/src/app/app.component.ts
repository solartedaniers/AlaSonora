import { Component, ChangeDetectionStrategy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { PendingRecordingsSyncService } from './core/services/pending-recordings-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<router-outlet />`,
})
export class AppComponent {
  constructor() {
    // Lo inyecto aquí para que el tema se aplique al arrancar, aunque ninguna pantalla lo use.
    inject(ThemeService);
    // IndexedDB, Service Worker y eventos de red solo existen en el navegador.
    if (isPlatformBrowser(inject(PLATFORM_ID))) inject(PendingRecordingsSyncService).start();
  }
}
