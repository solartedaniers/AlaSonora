import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface SpiralItem {
  imageUrl: string;
  caption: string;
}

/**
 * Galería en espiral 3D (rotación CSS, no WebGL/ogl: unos pocos <figure>
 * girando en un círculo no justifican una lib de render). Pensada para
 * destacar especies/avistamientos recientes.
 */
@Component({
  selector: 'app-infinite-spiral',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="spiral-scene">
      <div class="spiral-track" [style.--count]="items().length">
        @for (item of items(); track item.imageUrl; let i = $index) {
          <figure class="spiral-item" [style.--i]="i">
            <img [src]="item.imageUrl" [alt]="item.caption" loading="lazy" />
            <figcaption>{{ item.caption }}</figcaption>
          </figure>
        }
      </div>
    </div>
  `,
  styles: `
    .spiral-scene {
      perspective: 1200px;
      height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .spiral-track {
      position: relative;
      width: 180px;
      height: 180px;
      transform-style: preserve-3d;
      animation: spiral-spin 24s linear infinite;
    }
    .spiral-scene:hover .spiral-track {
      animation-play-state: paused;
    }
    .spiral-item {
      position: absolute;
      inset: 0;
      margin: 0;
      transform: rotateY(calc(var(--i) * (360deg / var(--count)))) translateZ(220px);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 12px 30px rgb(0 0 0 / 25%);
    }
    .spiral-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .spiral-item figcaption {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      padding: 0.5rem 0.75rem;
      background: linear-gradient(to top, color-mix(in srgb, var(--color-on-surface) 70%, transparent), transparent);
      color: var(--color-surface);
      font-size: 0.75rem;
      font-weight: 600;
    }
    @keyframes spiral-spin {
      from {
        transform: rotateY(0deg);
      }
      to {
        transform: rotateY(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spiral-track {
        animation: none;
      }
    }
  `,
})
export class InfiniteSpiralComponent {
  readonly items = input.required<SpiralItem[]>();
}
