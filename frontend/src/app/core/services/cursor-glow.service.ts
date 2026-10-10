import { Injectable, NgZone, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

// Superficies que reciben el brillo: todos los botones y lo marcado con data-glow.
const GLOW_TARGETS = '.btn, [data-glow]';

/**
 * Cursor-following glow for every button and `[data-glow]` surface, with a
 * single delegated, passive pointer listener (throttled to one update per
 * frame) instead of one directive per element. It only writes the pointer
 * position as CSS variables; the glow itself is pure CSS.
 */
@Injectable({ providedIn: 'root' })
export class CursorGlowService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private pending?: PointerEvent;
  private frameId = 0;

  /** Call once in the browser. */
  start(): void {
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
