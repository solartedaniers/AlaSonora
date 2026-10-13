import { Component, ElementRef, ChangeDetectionStrategy, effect, inject, input, signal, viewChild } from '@angular/core';
import { MAX_DISPLAY_FREQUENCY_HZ, RecordingSpectrogramService } from '../../../core/services/recording-spectrogram.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SpectrogramPainter } from '../spectrogram-view/spectrogram-painter';
import { TranslatePipe } from '../../pipes/translate.pipe';

type SpectrogramStatus = 'loading' | 'ready' | 'unavailable';

// Las magnitudes así de lejos del pico de la grabación se pintan como fondo.
const DYNAMIC_RANGE_DB = 60;
const HZ_PER_KHZ = 1000;

/** Espectrograma de calor de una grabación guardada (pantalla de resultado). */
@Component({
  selector: 'app-recording-spectrogram',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block w-full h-full' },
  template: `
    <canvas #canvas class="w-full h-full block" role="img" [attr.aria-label]="'result.spectrogramLabel' | translate"></canvas>
    @if (status() !== 'ready') {
      <p class="absolute inset-0 grid place-items-center p-6 text-center text-on-surface-variant">
        {{ (status() === 'loading' ? 'result.spectrogramLoading' : 'result.spectrogramUnavailable') | translate }}
      </p>
    }
  `,
})
export class RecordingSpectrogramComponent {
  readonly audioUrl = input<string | undefined>();
  /** Tope de la banda dibujada en kHz (recorte visual; el espectro calculado no cambia). */
  readonly maxKhz = input(MAX_DISPLAY_FREQUENCY_HZ / HZ_PER_KHZ);

  private readonly spectrogramService = inject(RecordingSpectrogramService);
  private readonly theme = inject(ThemeService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly status = signal<SpectrogramStatus>('loading');
  private readonly columns = signal<Float32Array[] | null>(null);
  private requestId = 0;

  constructor() {
    effect(() => {
      const url = this.audioUrl();
      void this.load(url);
    });
    // Pinta al llegar los datos y de nuevo al cambiar de tema, sin recalcular la FFT.
    effect(() => {
      this.theme.resolvedTheme();
      const columns = this.columns();
      if (columns) this.paint(columns);
    });
  }

  private async load(url: string | undefined): Promise<void> {
    const requestId = ++this.requestId;
    this.columns.set(null);
    if (!url) {
      this.status.set('unavailable');
      return;
    }
    this.status.set('loading');
    try {
      const columns = await this.spectrogramService.compute(url);
      if (requestId !== this.requestId) return;
      this.columns.set(columns);
      this.status.set('ready');
    } catch (error) {
      if (requestId !== this.requestId) return;
      console.error('Recording spectrogram failed', error);
      this.status.set('unavailable');
    }
  }

  private paint(columns: Float32Array[]): void {
    const fraction = Math.min(1, (this.maxKhz() * HZ_PER_KHZ) / MAX_DISPLAY_FREQUENCY_HZ);
    const visible = SpectrogramPainter.cropToFraction(columns, fraction);
    new SpectrogramPainter(this.canvas().nativeElement).draw(visible, RecordingSpectrogramComponent.decibelScale(columns));
  }

  private static decibelScale(columns: Float32Array[]): (magnitude: number) => number {
    const peak = Math.max(...columns.map((column) => Math.max(...column)), Number.EPSILON);
    return (magnitude) => 1 + (20 * Math.log10(Math.max(magnitude, Number.EPSILON) / peak)) / DYNAMIC_RANGE_DB;
  }
}
