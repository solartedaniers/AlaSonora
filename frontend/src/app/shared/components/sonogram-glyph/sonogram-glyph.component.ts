import { Component, ChangeDetectionStrategy } from '@angular/core';

/** Three-note sonogram glyph (the loudest note in sulfur). Sized by its host; ink is currentColor. */
@Component({
  selector: 'app-sonogram-glyph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-block' },
  template: `
    <svg viewBox="0 0 28 24" class="block w-full h-full" fill="none" stroke-linecap="round">
      <path d="M3 9 Q6 5 9 12" class="stroke-current" stroke-width="2.6" />
      <path d="M11 6 Q15 2 18 15" class="stroke-sulfur" stroke-width="3.4" />
      <path d="M20 13 Q23 9 25 17" class="stroke-current" stroke-width="2.2" />
    </svg>
  `,
  styles: `
    path {
      transform-box: fill-box;
      transform-origin: center bottom;
    }
    // Al pasar sobre el enlace o botón que lo contiene, las tres notas saltan en secuencia.
    :host-context(a:hover) path,
    :host-context(button:hover) path {
      animation: glyph-sing var(--duration-slow) var(--ease-out);
    }
    :host-context(a:hover) path:nth-child(2),
    :host-context(button:hover) path:nth-child(2) {
      animation-delay: 80ms;
    }
    :host-context(a:hover) path:nth-child(3),
    :host-context(button:hover) path:nth-child(3) {
      animation-delay: 160ms;
    }
    @keyframes glyph-sing {
      40% {
        transform: translateY(-22%) scaleY(1.15);
      }
    }
  `,
})
export class SonogramGlyphComponent {}
