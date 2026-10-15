/**
 * Historial de espectros de la grabación en curso, compartido por la vista plana y la cascada 3D.
 * Se llena al llegar cada mensaje del worker (una task, sin pintar nada) y cada vista lo LEE en su
 * propio requestAnimationFrame. Así, al cambiar de vista, la nueva pinta lo ya capturado sin pedir
 * nada otra vez al worker.
 */
export class FrameHistory {
  private frames: Float32Array[] = [];
  /** Sube con cada cambio: las vistas lo comparan para saber si hay algo nuevo que pintar. */
  private changes = 0;

  constructor(private readonly capacity: number) {}

  get revision(): number {
    return this.changes;
  }

  push(magnitudes: Float32Array): void {
    this.frames.push(magnitudes);
    if (this.frames.length > this.capacity) this.frames.shift();
    this.changes++;
  }

  clear(): void {
    this.frames = [];
    this.changes++;
  }

  /** Los últimos `count` espectros, el más antiguo primero. */
  latest(count: number): Float32Array[] {
    return this.frames.slice(-count);
  }
}
