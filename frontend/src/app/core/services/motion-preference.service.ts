import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** `prefers-reduced-motion` reactivo, para las animaciones que el CSS solo no puede apagar (canvas, 3D). */
@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  private readonly query = isPlatformBrowser(inject(PLATFORM_ID)) ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  readonly reduced = signal(this.query?.matches ?? false);

  constructor() {
    this.query?.addEventListener('change', (event) => this.reduced.set(event.matches));
  }
}
