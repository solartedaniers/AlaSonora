import { Injectable, NgZone, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

// Superficies que reciben el brillo: todos los botones y lo marcado con data-glow.
const GLOW_TARGETS = '.btn, [data-glow]';

/**
 * Brillo que sigue al cursor en botones y superficies `[data-glow]`, con un solo
 * listener delegado y pasivo (una actualización por frame) en vez de una directiva
 * por elemento. Solo escribo la posición en variables CSS; el brillo es CSS puro.
 */
@Injectable({ providedIn: 'root' })
export class CursorGlowService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private pending?: PointerEvent;
  private frameId = 0;

  /** Se llama una vez, en el navegador. */
  start(): void {
    // Sin puntero con hover (táctil) no hay brillo que seguir: no escucho nada.
    if (!this.document.defaultView?.matchMedia('(hover: hover)').matches) return;
    // Fuera de la zona: mover el puntero nunca debe disparar detección de cambios.
    this.zone.runOutsideAngular(() => this.document.addEventListener('pointermove', this.onPointerMove, { passive: true }));
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pending = event;
    if (!this.frameId) this.frameId = requestAnimationFrame(this.apply);
  };

  private readonly apply = (): void => {
    this.frameId = 0;
    const event = this.pending;
    const target = (event?.target as Element | null)?.closest<HTMLElement>(GLOW_TARGETS);
    if (!event || !target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
    target.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
  };
}
