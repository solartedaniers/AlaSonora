import { HeatRamp } from './heat-ramp';

/**
 * Paints spectrogram columns on a canvas as a flat heat map, colored by the
 * theme's spectrogram ramp (HeatRamp). Shared by the live recorder view and
 * the saved-recording view.
 */
export class SpectrogramPainter {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly ramp: HeatRamp;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth || canvas.width;
    canvas.height = canvas.clientHeight || canvas.height;
    this.ctx = canvas.getContext('2d');
    this.ramp = new HeatRamp(canvas);
  }

  /**
   * @param columns magnitude spectra, low frequencies first (drawn at the bottom)
   * @param intensity maps a magnitude to 0..1
   * @param slotCount total column slots across the canvas width
   * @param firstSlot slot where `columns[0]` is drawn
   */
  draw(columns: Float32Array[], intensity: (magnitude: number) => number, slotCount = columns.length, firstSlot = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.fillStyle = this.ramp.floor;
    ctx.fillRect(0, 0, width, height);

    const colWidth = width / slotCount;
    columns.forEach((magnitudes, colIndex) => {
      const rowHeight = height / magnitudes.length;
      const x = (firstSlot + colIndex) * colWidth;
      for (let bin = 0; bin < magnitudes.length; bin++) {
        ctx.fillStyle = this.ramp.colorAt(intensity(magnitudes[bin]));
        ctx.fillRect(x, height - (bin + 1) * rowHeight, colWidth + 0.5, rowHeight + 0.5);
      }
    });
  }

  /**
   * Display-only crop: keeps the lowest `fraction` of each spectrum (e.g. 0–12 kHz of a
   * 0–24 kHz FFT). Returns views, never copies, so the analysed data is untouched.
   */
  static cropToFraction(columns: Float32Array[], fraction: number): Float32Array[] {
    if (fraction >= 1) return columns;
    return columns.map((column) => column.subarray(0, Math.max(1, Math.ceil(column.length * fraction))));
  }
}
