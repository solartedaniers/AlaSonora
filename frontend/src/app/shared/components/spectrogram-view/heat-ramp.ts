type Rgb = [number, number, number];

// Paradas de la rampa (posición 0…1 → token): papel, petróleo, cian, azufre, coral.
const STOPS: readonly { at: number; token: string }[] = [
  { at: 0, token: '--color-spectro-floor' },
  { at: 0.3, token: '--color-spectro-low' },
  { at: 0.55, token: '--color-spectro-mid' },
  { at: 0.78, token: '--color-spectro-high' },
  { at: 1, token: '--color-spectro-peak' },
];
const LEVELS = 256;

/**
 * Energy → color ramp read from the active theme tokens. Colors are
 * precomputed into a small lookup table so painters can ask per cell cheaply.
 */
export class HeatRamp {
  private readonly table: string[];
  private readonly rgbTable: Rgb[];
  readonly floor: string;

  constructor(element: Element) {
    const styles = getComputedStyle(element);
    const probe = document.createElement('canvas').getContext('2d');
    const colors = STOPS.map((stop) => HeatRamp.parse(probe, styles.getPropertyValue(stop.token).trim()));
    this.rgbTable = Array.from({ length: LEVELS }, (_, i) => HeatRamp.sample(colors, i / (LEVELS - 1)));
    this.table = this.rgbTable.map((rgb) => HeatRamp.rgb(rgb));
    this.floor = this.table[0];
  }

  /** CSS color for an intensity in 0…1 (clamped). */
  colorAt(intensity: number): string {
    const t = Math.max(0, Math.min(1, intensity));
    return this.table[Math.round(t * (LEVELS - 1))];
  }

  /** Same color with transparency, for glows and fills. */
  colorWithAlpha(intensity: number, alpha: number): string {
    const [r, g, b] = this.rgbTable[Math.round(Math.max(0, Math.min(1, intensity)) * (LEVELS - 1))];
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private static sample(colors: Rgb[], t: number): Rgb {
    const upper = Math.max(1, STOPS.findIndex((stop) => stop.at >= t));
    const from = STOPS[upper - 1];
    const to = STOPS[upper];
    const local = (t - from.at) / (to.at - from.at);
    return [0, 1, 2].map((c) => Math.round(colors[upper - 1][c] + (colors[upper][c] - colors[upper - 1][c]) * local)) as Rgb;
  }

  // Delego el parseo al canvas: acepta cualquier color CSS y lo normaliza a #rrggbb.
  private static parse(ctx: CanvasRenderingContext2D | null, color: string): Rgb {
    if (!ctx) return [0, 0, 0];
    ctx.fillStyle = color;
    const hex = String(ctx.fillStyle);
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }

  private static rgb([r, g, b]: Rgb): string {
    return `rgb(${r},${g},${b})`;
  }
}
