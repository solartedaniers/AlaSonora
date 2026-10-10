import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SongSonogramComponent } from '../song-sonogram/song-sonogram.component';

/**
 * Page background: the ink sonogram of the stylized song phrase, anchored at the
 * top-right behind the content. Replaces the old blurred blobs. Decorative only.
 */
@Component({
  selector: 'app-field-backdrop',
  standalone: true,
  imports: [SongSonogramComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<app-song-sonogram class="field-backdrop__sonogram" />`,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .field-backdrop__sonogram {
      position: absolute;
      top: calc(var(--header-height) + var(--space-unit) * 4);
      inset-inline-end: calc(var(--space-gutter) * -1);
      width: max(38rem, 72%);
      color: var(--color-primary);
    }
  `,
})
export class FieldBackdropComponent {}
