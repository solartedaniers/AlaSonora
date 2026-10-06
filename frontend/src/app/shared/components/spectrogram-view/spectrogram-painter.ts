type Rgb = [number, number, number];

const BACKGROUND: Rgb = [3, 17, 12];
// Below this intensity the color ramps background → hot; above it, hot → peak.
const HOT_THRESHOLD = 0.35;

/**
 * Paints spectrogram columns on a canvas as a heat map whose hot/peak colors
 * come from the active theme tokens (--color-secondary / --color-error).
 * Shared by the live recorder view and the saved-recording view.
 */
export class SpectrogramPainter {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly hotColor: Rgb;
  private readonly peakColor: Rgb;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth || 600;
    canvas.height = canvas.clientHeight || 200;
    this.ctx = canvas.getContext('2d');
    const styles = getComputedStyle(document.documentElement);
    this.hotColor = SpectrogramPainter.parseHex(styles.getPropertyValue('--color-secondary')) ?? [234, 190, 154];
    this.peakColor = SpectrogramPainter.parseHex(styles.getPropertyValue('--color-error')) ?? [255, 180, 171];
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
    ctx.fillStyle = SpectrogramPainter.rgb(BACKGROUND);
    ctx.fillRect(0, 0, width, height);

    const colWidth = width / slotCount;
    columns.forEach((magnitudes, colIndex) => {
      const rowHeight = height / magnitudes.length;
      const x = (firstSlot + colIndex) * colWidth;
      for (let bin = 0; bin < magnitudes.length; bin++) {
        ctx.fillStyle = this.heatColor(Math.max(0, Math.min(1, intensity(magnitudes[bin]))));
        ctx.fillRect(x, height - (bin + 1) * rowHeight, colWidth + 0.5, rowHeight + 0.5);
      }
    });
  }

  private heatColor(t: number): string {
    return t <= HOT_THRESHOLD
      ? SpectrogramPainter.rgb(SpectrogramPainter.mix(BACKGROUND, this.hotColor, t / HOT_THRESHOLD))
      : SpectrogramPainter.rgb(SpectrogramPainter.mix(this.hotColor, this.peakColor, (t - HOT_THRESHOLD) / (1 - HOT_THRESHOLD)));
  }

  private static mix(from: Rgb, to: Rgb, t: number): Rgb {
    return [0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * t)) as Rgb;
  }

  private static rgb([r, g, b]: Rgb): string {
    return `rgb(${r},${g},${b})`;
  }

  private static parseHex(hex: string): Rgb | null {
    const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;
    const value = match[1];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }
}
