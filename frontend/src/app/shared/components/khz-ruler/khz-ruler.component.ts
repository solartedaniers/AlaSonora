import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

// Range of the scale: birdsong mostly lives between 1 and 10 kHz.
const MAX_KHZ = 12;
const LABEL_STEP_KHZ = 2;

/**
 * Signature element: the frequency axis of a sonogram pinned to the left edge
 * of the window (desktop only). High pitches on top, low at the bottom; a
 * sulfur "reading line" follows the page scroll. Purely decorative.
 */
@Component({
  selector: 'app-khz-ruler',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chrome hidden lg:flex', 'aria-hidden': 'true', '[style.--khz-steps]': 'maxKhz' },
  template: `
    <span class="khz-ruler__unit">{{ 'units.khz' | translate }}</span>
    <div class="khz-ruler__scale">
      @for (khz of labels; track khz) {
        <span class="khz-ruler__label">{{ khz }}</span>
      }
      <span class="khz-ruler__reading"></span>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset-block: 0;
      inset-inline-start: 0;
      z-index: 45;
      width: var(--ruler-size);
      flex-direction: column;
      border-inline-end: 1px solid var(--color-chrome-line);
    }
    .khz-ruler__unit {
      height: var(--header-height);
      display: grid;
      place-items: center;
      font-family: var(--font-data);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--color-sulfur);
      border-block-end: 1px solid var(--color-chrome-line);
    }
    .khz-ruler__scale {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-block: calc(var(--space-unit) * 3);
      // Marcas menores cada kHz, dibujadas en el borde derecho.
      background: repeating-linear-gradient(
          to bottom,
          var(--color-on-chrome-variant) 0 1px,
          transparent 1px calc(100% / var(--khz-steps))
        )
        right / calc(var(--space-unit) * 2) 100% no-repeat;
      background-origin: content-box;
    }
    .khz-ruler__label {
      position: relative;
      height: 0;
      display: flex;
      align-items: center;
      padding-inline-start: calc(var(--space-unit) * 1.5);
      font-family: var(--font-data);
      font-size: var(--text-xs);
      color: var(--color-on-chrome-variant);
      font-feature-settings: 'tnum';
    }
    .khz-ruler__label::after {
      content: '';
      position: absolute;
      inset-inline-end: 0;
      width: calc(var(--space-unit) * 3.5);
      height: 2px;
      background: var(--color-on-chrome);
    }
    .khz-ruler__reading {
      position: absolute;
      inset-inline: 0;
      top: 0;
      height: calc(var(--space-unit) * 1);
      background: var(--color-sulfur);
      animation: khz-reading linear both;
      animation-timeline: scroll(root block);
    }
    @keyframes khz-reading {
      to {
        top: calc(100% - var(--space-unit) * 1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .khz-ruler__reading {
        animation: none;
      }
    }
  `,
})
export class KhzRulerComponent {
  readonly maxKhz = MAX_KHZ;
  readonly labels = Array.from({ length: MAX_KHZ / LABEL_STEP_KHZ + 1 }, (_, i) => MAX_KHZ - i * LABEL_STEP_KHZ);
}
