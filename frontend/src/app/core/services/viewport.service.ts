import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import breakpoints from '../../theme/breakpoints.json';

/**
 * Ancho de la ventana como signal, con los mismos cortes que Tailwind (breakpoints.json).
 * Arranca en false y se actualiza tras el primer render: así el cliente hidrata el mismo
 * HTML que generó el servidor y solo después cambia lo que dependa del ancho.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly document = inject(DOCUMENT);

  /** Ventana de tableta o más ancha (corte md). */
  readonly mdUp = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      const query = this.document.defaultView?.matchMedia(`(min-width: ${breakpoints.md})`);
      if (!query) return;
      this.mdUp.set(query.matches);
      query.addEventListener('change', (event) => this.mdUp.set(event.matches));
    });
  }
}
