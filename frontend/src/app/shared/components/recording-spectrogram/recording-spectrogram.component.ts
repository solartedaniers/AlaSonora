import { Component, ElementRef, ChangeDetectionStrategy, effect, inject, input, signal, viewChild } from '@angular/core';
import { RecordingSpectrogramService } from '../../../core/services/recording-spectrogram.service';
import { SpectrogramPainter } from '../spectrogram-view/spectrogram-painter';
import { TranslatePipe } from '../../pipes/translate.pipe';

type SpectrogramStatus = 'loading' | 'ready' | 'unavailable';

// Magnitudes this far below the recording's own peak render as background.
const DYNAMIC_RANGE_DB = 60;

/** Heat-map spectrogram of a stored recording (result screen). */
@Component({
  selector: 'app-recording-spectrogram',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'relative block w-full h-full' },
  template: `
    <canvas #canvas class="w-full h-full block" [attr.aria-label]="'result.spectrogramLabel' | translate"></canvas>
    @if (status() !== 'ready') {
      <p class="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">
        {{ (status() === 'loading' ? 'result.spectrogramLoading' : 'result.spectrogramUnavailable') | translate }}
      </p>
    }
  `,
})
export class RecordingSpectrogramComponent {
  readonly audioUrl = input<string | undefined>();

  private readonly spectrogramService = inject(RecordingSpectrogramService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly status = signal<SpectrogramStatus>('loading');
  private requestId = 0;

  constructor() {
    effect(() => {
      const url = this.audioUrl();
      const canvas = this.canvas().nativeElement;
      void this.render(url, canvas);
    });
  }

  private async render(url: string | undefined, canvas: HTMLCanvasElement): Promise<void> {
    const requestId = ++this.requestId;
    if (!url) {
      this.status.set('unavailable');
      return;
    }
    this.status.set('loading');
    try {
      const columns = await this.spectrogramService.compute(url);
      if (requestId !== this.requestId) return;
      new SpectrogramPainter(canvas).draw(columns, RecordingSpectrogramComponent.decibelScale(columns));
      this.status.set('ready');
    } catch (error) {
      if (requestId !== this.requestId) return;
      console.error('Recording spectrogram failed', error);
      this.status.set('unavailable');
    }
  }

  private static decibelScale(columns: Float32Array[]): (magnitude: number) => number {
    const peak = Math.max(...columns.map((column) => Math.max(...column)), Number.EPSILON);
    return (magnitude) => 1 + (20 * Math.log10(Math.max(magnitude, Number.EPSILON) / peak)) / DYNAMIC_RANGE_DB;
  }
}
