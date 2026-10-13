import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SongSonogramComponent } from '../song-sonogram/song-sonogram.component';

/**
 * Fondo de página: el sonograma en tinta de la frase de canto, anclado arriba a la
 * derecha detrás del contenido. Reemplaza las manchas difusas. Solo decorativo.
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
