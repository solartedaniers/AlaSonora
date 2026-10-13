import { HeatRamp } from './heat-ramp';

/**
 * Pinta columnas de espectrograma en un canvas como mapa de calor plano, con la
 * rampa del tema (HeatRamp). Lo comparten la vista en vivo y la de grabación guardada.
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
   * @param columns espectros de magnitud, graves primero (se dibujan abajo)
   * @param intensity convierte una magnitud a 0..1
   * @param slotCount total de columnas a lo ancho del canvas
   * @param firstSlot columna donde se dibuja `columns[0]`
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
   * Recorte solo visual: conservo la `fraction` más grave de cada espectro (p. ej. 0–12 kHz
   * de una FFT de 0–24 kHz). Devuelvo vistas, no copias, así el dato analizado no cambia.
   */
  static cropToFraction(columns: Float32Array[], fraction: number): Float32Array[] {
    if (fraction >= 1) return columns;
    return columns.map((column) => column.subarray(0, Math.max(1, Math.ceil(column.length * fraction))));
  }
}
