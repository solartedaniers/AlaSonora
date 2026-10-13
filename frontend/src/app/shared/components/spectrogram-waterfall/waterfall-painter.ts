import { HeatRamp } from '../spectrogram-view/heat-ramp';

export interface WaterfallAxis {
  /** Tope del eje de frecuencia (kHz) y paso de las etiquetas. */
  maxKhz: number;
  stepKhz: number;
  /** Segundos entre la fila del frente y la del fondo, y paso de las etiquetas. */
  windowSeconds: number;
  stepSeconds: number;
  khzUnit: string;
  /** Etiqueta para un instante pasado; `{n}` se reemplaza por los segundos (p. ej. "−{n} s"). */
  secondsAgo: string;
  nowLabel: string;
}

// Geometría de la cascada (fracciones del lienzo).
const DEPTH = 2.4; // cuánto se encoge la fila del fondo
const HORIZON = 0.08; // altura del horizonte desde arriba
const FRONT = 0.86; // línea base de la fila del frente
const RIDGE = 0.42; // altura máxima de un relieve en la fila del frente
const SIDE_MARGIN = 0.07;
// Bajo este ancho (px) la cascada se aligera: una de cada dos filas, para que respire en el celular.
const COMPACT_WIDTH = 640;
const COMPACT_ROW_STRIDE = 2;
const LABEL_GAP = 6;
// Las líneas en silencio se pintan con tinta, nunca del color del papel.
const MIN_LINE_INTENSITY = 0.32;
const POINTS_PER_ROW = 72;
// Opacidad del velo de color bajo cada cresta (más energía = más color).
const GLOW_ALPHA = 0.5;

/**
 * Pinta un espectrograma 3D en "cascada" sobre un canvas 2D: cada fila es un espectro
 * dibujado como una cresta en perspectiva (frecuencia → x, tiempo → profundidad,
 * energía → altura y color). Pinto del fondo al frente para que las crestas cercanas
 * tapen las lejanas. Solo sabe dibujar; el ritmo lo lleva su componente.
 */
export class WaterfallPainter {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly ramp: HeatRamp;
  private readonly font: string;
  private readonly labelColor: string;
  private readonly tickColor: string;
  private width = 0;
  private height = 0;
  private leftPad = 0;
  private rightPad = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.ramp = new HeatRamp(canvas);
    const styles = getComputedStyle(canvas);
    this.font = `${styles.getPropertyValue('--weight-semibold').trim()} ${styles.getPropertyValue('--text-xs').trim()} ${styles.getPropertyValue('--font-data').trim()}`;
    this.labelColor = styles.getPropertyValue('--color-on-surface-variant').trim();
    this.tickColor = styles.getPropertyValue('--color-outline').trim();
    this.resize();
  }

  /** Ajusto el búfer al tamaño del elemento y a la densidad de píxeles (líneas nítidas). */
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth || this.canvas.width;
    this.height = this.canvas.clientHeight || this.canvas.height;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * @param rows espectros, el más antiguo primero (frente) → el más nuevo al final (fondo, en el horizonte)
   * @param rowCount total de filas entre el frente y el fondo
   * @param advance avance 0…1 hacia la siguiente fila, para que las crestas se deslicen suave
   * @param intensity convierte una magnitud a 0…1
   */
  draw(rows: Float32Array[], rowCount: number, advance: number, intensity: (magnitude: number) => number, axis: WaterfallAxis): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.fillStyle = this.ramp.floor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.measurePads(ctx, axis);
    const stride = this.width < COMPACT_WIDTH ? COMPACT_ROW_STRIDE : 1;
    // De atrás hacia adelante: la fila más nueva está en el horizonte.
    for (let i = rows.length - 1; i >= 0; i--) {
      // Filas detrás de la más nueva; con `advance` todas se deslizan hacia el frente.
      const behindNewest = rows.length - 1 - i;
      if (behindNewest % stride !== 0) continue;
      const depth = 1 - (behindNewest + advance) / Math.max(1, rowCount - 1);
      this.drawRidge(ctx, rows[i], depth, intensity);
    }
    this.drawAxes(ctx, axis);
  }

  private drawRidge(ctx: CanvasRenderingContext2D, spectrum: Float32Array, depth: number, intensity: (m: number) => number): void {
    const { left, right, baseline, scale } = this.project(depth);
    const span = right - left;
    const ridge = RIDGE * this.height * scale;
    const step = spectrum.length / POINTS_PER_ROW;
    const xs: number[] = [];
    const ys: number[] = [];
    const levels: number[] = [];
    for (let p = 0; p < POINTS_PER_ROW; p++) {
      // Máximo del tramo: conserva los picos finos al reducir puntos.
      let peak = 0;
      for (let b = Math.floor(p * step); b < Math.floor((p + 1) * step); b++) peak = Math.max(peak, spectrum[b] ?? 0);
      const level = Math.max(0, Math.min(1, intensity(peak)));
      xs.push(left + (span * p) / (POINTS_PER_ROW - 1));
      ys.push(baseline - level * ridge);
      levels.push(level);
    }

    // Relleno del relieve con el color del papel: oculta las filas de atrás.
    ctx.beginPath();
    ctx.moveTo(xs[0], baseline);
    for (let p = 0; p < POINTS_PER_ROW; p++) ctx.lineTo(xs[p], ys[p]);
    ctx.lineTo(xs[POINTS_PER_ROW - 1], baseline);
    ctx.closePath();
    ctx.fillStyle = this.ramp.floor;
    ctx.fill();

    // Velo de color: la energía de la cresta tiñe su relieve y se desvanece hacia la base.
    const crest = Math.max(...levels);
    if (crest > MIN_LINE_INTENSITY) {
      const top = baseline - crest * ridge;
      const glow = ctx.createLinearGradient(0, top, 0, baseline);
      glow.addColorStop(0, this.ramp.colorWithAlpha(crest, GLOW_ALPHA * crest));
      glow.addColorStop(1, this.ramp.colorWithAlpha(crest, 0));
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.lineWidth = 0.6 + 1.6 * scale;
    ctx.lineCap = 'round';
    for (let p = 1; p < POINTS_PER_ROW; p++) {
      ctx.beginPath();
      ctx.moveTo(xs[p - 1], ys[p - 1]);
      ctx.lineTo(xs[p], ys[p]);
      ctx.strokeStyle = this.ramp.colorAt(Math.max(MIN_LINE_INTENSITY, (levels[p - 1] + levels[p]) / 2));
      ctx.stroke();
    }
  }

  private drawAxes(ctx: CanvasRenderingContext2D, axis: WaterfallAxis): void {
    ctx.font = this.font;
    ctx.fillStyle = this.labelColor;
    ctx.strokeStyle = this.tickColor;
    ctx.lineWidth = 1;

    // Eje de frecuencia bajo la fila del frente.
    const front = this.project(0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let khz = 0; khz <= axis.maxKhz; khz += axis.stepKhz) {
      const x = front.left + ((front.right - front.left) * khz) / axis.maxKhz;
      ctx.beginPath();
      ctx.moveTo(x, front.baseline + 2);
      ctx.lineTo(x, front.baseline + LABEL_GAP);
      ctx.stroke();
      const label = khz === axis.maxKhz ? `${khz} ${axis.khzUnit}` : `${khz}`;
      ctx.fillText(label, x, front.baseline + LABEL_GAP + 2);
    }

    // Eje de tiempo a lo largo de la profundidad (frente = más antiguo, fondo = ahora).
    ctx.textAlign = 'right';
    // Sobre la línea de su fila, para no chocar con las etiquetas de kHz del frente.
    ctx.textBaseline = 'bottom';
    for (let seconds = 0; seconds <= axis.windowSeconds; seconds += axis.stepSeconds) {
      const { left, baseline } = this.project(1 - seconds / axis.windowSeconds);
      const label = seconds === 0 ? axis.nowLabel : axis.secondsAgo.replace('{n}', String(seconds));
      ctx.fillText(label, left - LABEL_GAP, baseline);
    }
  }

  /** Espacio lateral para las etiquetas del eje, medido con su ancho real para no recortar nada. */
  private measurePads(ctx: CanvasRenderingContext2D, axis: WaterfallAxis): void {
    ctx.font = this.font;
    const timeLabel = axis.secondsAgo.replace('{n}', String(axis.windowSeconds));
    const unitLabel = `${axis.maxKhz} ${axis.khzUnit}`;
    const minimum = this.width * SIDE_MARGIN;
    this.leftPad = Math.max(minimum, ctx.measureText(timeLabel).width + LABEL_GAP * 2);
    this.rightPad = Math.max(minimum, ctx.measureText(unitLabel).width / 2 + LABEL_GAP);
  }

  /** Geometría en pantalla de una fila a profundidad `depth` (0 = frente, 1 = fondo). */
  private project(depth: number): { left: number; right: number; baseline: number; scale: number } {
    const scale = 1 / (1 + depth * DEPTH);
    const backScale = 1 / (1 + DEPTH);
    const toward = (scale - backScale) / (1 - backScale);
    const baseline = HORIZON * this.height + (FRONT - HORIZON) * this.height * toward;
    const frontWidth = this.width - this.leftPad - this.rightPad;
    const rowWidth = frontWidth * scale;
    const center = this.leftPad + frontWidth / 2;
    return { left: center - rowWidth / 2, right: center + rowWidth / 2, baseline, scale };
  }
}
