type Rgb = [number, number, number];

// Below this intensity the color ramps floor → mid; above it, mid → peak.
const MID_THRESHOLD = 0.35;

/**
 * Paints spectrogram columns on a canvas as a heat map. The three ramp colors
 * come from the active theme tokens (--color-spectro-floor / -mid / -peak):
 * ink on white in light mode, a heat map in dark mode.
 * Shared by the live recorder view and the saved-recording view.
 */
export class SpectrogramPainter {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly floorColor: Rgb;
  private readonly midColor: Rgb;
  private readonly peakColor: Rgb;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth || canvas.width;
    canvas.height = canvas.clientHeight || canvas.height;
    this.ctx = canvas.getContext('2d');
    const styles = getComputedStyle(canvas);
    this.floorColor = this.readToken(styles, '--color-spectro-floor');
    this.midColor = this.readToken(styles, '--color-spectro-mid');
    this.peakColor = this.readToken(styles, '--color-spectro-peak');
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
    ctx.fillStyle = SpectrogramPainter.rgb(this.floorColor);
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
    return t <= MID_THRESHOLD
      ? SpectrogramPainter.rgb(SpectrogramPainter.mix(this.floorColor, this.midColor, t / MID_THRESHOLD))
      : SpectrogramPainter.rgb(SpectrogramPainter.mix(this.midColor, this.peakColor, (t - MID_THRESHOLD) / (1 - MID_THRESHOLD)));
  }

  // Delego el parseo al propio canvas: acepta cualquier color CSS y lo normaliza a #rrggbb.
  private readToken(styles: CSSStyleDeclaration, token: string): Rgb {
    if (!this.ctx) return [0, 0, 0];
    this.ctx.fillStyle = styles.getPropertyValue(token).trim();
    const hex = String(this.ctx.fillStyle);
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }

  private static mix(from: Rgb, to: Rgb, t: number): Rgb {
    return [0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * t)) as Rgb;
  }

  private static rgb([r, g, b]: Rgb): string {
    return `rgb(${r},${g},${b})`;
  }
}
