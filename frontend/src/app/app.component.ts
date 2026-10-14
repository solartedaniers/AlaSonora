import { Component, ChangeDetectionStrategy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { KhzRulerComponent } from './shared/components/khz-ruler/khz-ruler.component';
import { ThemeService } from './core/services/theme.service';
import { PendingRecordingsSyncService } from './core/services/pending-recordings-sync.service';
import { CursorGlowService } from './core/services/cursor-glow.service';
import { AppUpdateService } from './core/services/app-update.service';
import { UpdatePromptComponent } from './shared/components/update-prompt/update-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, KhzRulerComponent, UpdatePromptComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-khz-ruler />
    <router-outlet />
    <app-update-prompt />
  `,
})
export class AppComponent {
  constructor() {
    // Lo inyecto aquí para que el tema se aplique al arrancar, aunque ninguna pantalla lo use.
    inject(ThemeService);
    // IndexedDB, Service Worker y eventos de red solo existen en el navegador.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(PendingRecordingsSyncService).start();
      inject(CursorGlowService).start();
      inject(AppUpdateService).start();
    }
  }
}
