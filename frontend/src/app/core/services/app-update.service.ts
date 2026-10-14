import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';

/**
 * Avisa cuando el service worker ya descargó una versión nueva tras un despliegue.
 * No recargo solo: una grabación en curso se perdería; el usuario decide cuándo.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  readonly updateReady = signal(false);

  /** Se llama una vez, en el navegador. */
  start(): void {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.updateReady.set(true);
    });
    // Si el caché quedó inconsistente, la única salida segura es recargar desde la red.
    this.swUpdate.unrecoverable.subscribe(() => this.updateReady.set(true));
    // Una pestaña abierta por días también se entera: reviso al volver a ella.
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') void this.swUpdate.checkForUpdate().catch(() => undefined);
    });
  }

  async applyUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate().catch(() => undefined);
    this.document.location.reload();
  }

  dismiss(): void {
    this.updateReady.set(false);
  }
}
