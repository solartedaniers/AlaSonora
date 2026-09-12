import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Fondo decorativo de auroras animadas para hero/bienvenida — tres manchas
 * de color con blur y drift vía CSS (sin WebGL/canvas: ningún navegador
 * objetivo lo necesita para 3 blobs, y evita cargar una lib de shaders).
 * Puramente decorativo: aria-hidden y pointer-events: none.
 */
@Component({
  selector: 'app-soft-aurora',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="soft-aurora" aria-hidden="true">
      <span class="soft-aurora__blob soft-aurora__blob--primary"></span>
      <span class="soft-aurora__blob soft-aurora__blob--secondary"></span>
      <span class="soft-aurora__blob soft-aurora__blob--tertiary"></span>
    </div>
  `,
  styles: `
    .soft-aurora {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .soft-aurora__blob {
      position: absolute;
      width: 55%;
      height: 55%;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.35;
      animation: soft-aurora-drift 18s ease-in-out infinite alternate;
    }
    .soft-aurora__blob--primary {
      top: -10%;
      left: -10%;
      background: var(--color-primary);
    }
    .soft-aurora__blob--secondary {
      bottom: -15%;
      right: -5%;
      background: var(--color-secondary);
      animation-duration: 22s;
      animation-delay: -4s;
    }
    .soft-aurora__blob--tertiary {
      top: 20%;
      right: 20%;
      background: var(--color-tertiary);
      width: 40%;
      height: 40%;
      animation-duration: 26s;
      animation-delay: -9s;
    }
    @keyframes soft-aurora-drift {
      from {
        transform: translate(0, 0) scale(1);
      }
      to {
        transform: translate(6%, 8%) scale(1.15);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .soft-aurora__blob {
        animation: none;
      }
    }
  `,
})
export class SoftAuroraComponent {}
