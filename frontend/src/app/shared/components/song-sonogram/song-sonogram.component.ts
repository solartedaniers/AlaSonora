import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { PHRASE_MAX_KHZ, PHRASE_WIDTH, SONG_BAND_KHZ, SONG_PHRASE, SongNote, controlKhz } from '../../sonogram/song-phrase';

interface NoteStroke {
  d: string;
  width: number;
}

const VIEW_HEIGHT = 480;
// Ids únicos: puede haber varios sonogramas en la misma página.
let nextInstanceId = 0;
const HARMONIC_WIDTH_RATIO = 0.45;
const PEAK_WIDTH_RATIO = 0.35;

const toY = (khz: number): number => VIEW_HEIGHT - (khz / PHRASE_MAX_KHZ) * VIEW_HEIGHT;

function stroke(note: SongNote, harmonic: number, width: number): NoteStroke {
  const midX = (note.x0 + note.x1) / 2;
  return {
    d: `M${note.x0} ${toY(note.f0 * harmonic)} Q${midX} ${toY(controlKhz(note, harmonic))} ${note.x1} ${toY(note.f1 * harmonic)}`,
    width,
  };
}

// Las trazas no dependen de nada externo: se calculan una vez por módulo.
const FUNDAMENTALS = SONG_PHRASE.map((note) => stroke(note, 1, note.width));
const HARMONICS = SONG_PHRASE.filter((note) => Math.max(note.f0, note.f1) * 2 <= PHRASE_MAX_KHZ).map((note) =>
  stroke(note, 2, note.width * HARMONIC_WIDTH_RATIO),
);
const PEAKS = SONG_PHRASE.filter((note) => note.peak).map((note) => stroke(note, 1, note.width * PEAK_WIDTH_RATIO));

/**
 * Static ink sonogram of the stylized song phrase. Ink is `currentColor` so the
 * context decides it; intensities come from the `--sonogram-*` custom properties.
 */
@Component({
  selector: 'app-song-sonogram',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'block' },
  template: `
    <svg [attr.viewBox]="viewBox" class="block w-full h-auto" fill="none" stroke-linecap="round" preserveAspectRatio="xMidYMid meet">
      @if (band()) {
        <defs>
          <linearGradient [attr.id]="bandGradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" class="song-sonogram__band-stop song-sonogram__band-stop--clear" />
            <stop offset="0.5" class="song-sonogram__band-stop" />
            <stop offset="1" class="song-sonogram__band-stop song-sonogram__band-stop--clear" />
          </linearGradient>
        </defs>
        <rect x="0" [attr.y]="bandY" [attr.width]="width" [attr.height]="bandHeight" [attr.fill]="'url(#' + bandGradientId + ')'" />
      }
      @for (s of harmonics; track $index) {
        <path [attr.d]="s.d" [attr.stroke-width]="s.width" class="song-sonogram__harmonic" />
      }
      @for (s of fundamentals; track $index) {
        <path [attr.d]="s.d" [attr.stroke-width]="s.width" class="song-sonogram__note" [style.--n]="$index" />
      }
      @for (s of peaks; track $index) {
        <path [attr.d]="s.d" [attr.stroke-width]="s.width" class="song-sonogram__peak" />
      }
    </svg>
  `,
  styles: `
    :host {
      --sonogram-ink-opacity: 0.24;
      --sonogram-harmonic-opacity: 0.12;
      --sonogram-band-opacity: var(--backdrop-band-opacity);
    }
    .song-sonogram__band-stop {
      stop-color: var(--color-sulfur);
      stop-opacity: var(--sonogram-band-opacity);
    }
    .song-sonogram__band-stop--clear {
      stop-opacity: 0;
    }
    .song-sonogram__note {
      stroke: currentColor;
      stroke-opacity: var(--sonogram-ink-opacity);
    }
    .song-sonogram__harmonic {
      stroke: currentColor;
      stroke-opacity: var(--sonogram-harmonic-opacity);
    }
    .song-sonogram__peak {
      stroke: var(--color-sulfur);
    }
    // "Suena" al pasar: cada nota se enciende en orden, como un sonido que viaja.
    :host-context(.sing-on-hover:hover) .song-sonogram__note {
      animation: note-sing var(--duration-slow) var(--ease-out) both;
      animation-delay: calc(var(--n) * 45ms);
    }
    @keyframes note-sing {
      50% {
        stroke-opacity: 1;
        stroke: var(--color-sulfur);
      }
    }
  `,
})
export class SongSonogramComponent {
  /** Highlights the 2–8 kHz songbird band behind the notes. */
  readonly band = input(true);

  readonly bandGradientId = `song-sonogram-band-${nextInstanceId++}`;
  readonly width = PHRASE_WIDTH;
  readonly viewBox = `0 0 ${PHRASE_WIDTH} ${VIEW_HEIGHT}`;
  readonly bandY = toY(SONG_BAND_KHZ.high);
  readonly bandHeight = toY(SONG_BAND_KHZ.low) - toY(SONG_BAND_KHZ.high);
  readonly fundamentals = FUNDAMENTALS;
  readonly harmonics = HARMONICS;
  readonly peaks = PEAKS;
}
