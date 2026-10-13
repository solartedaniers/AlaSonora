/** Una nota del sonograma: un barrido de f0 a f1 (kHz) entre x0 y x1 (unidades de la frase). */
export interface SongNote {
  x0: number;
  x1: number;
  f0: number;
  f1: number;
  /** Desfase en kHz del punto de control del barrido (curvatura). */
  bend: number;
  /** Grosor del trazo ≈ volumen. */
  width: number;
  /** Las notas más fuertes llevan un núcleo de energía azufre. */
  peak?: boolean;
}

export const PHRASE_WIDTH = 1200;
export const PHRASE_MAX_KHZ = 12;
// Banda donde cantan casi todas las aves pequeñas.
export const SONG_BAND_KHZ = { low: 2, high: 8 } as const;

// Trino: barridos cortos y descendentes que se aceleran y se apagan.
const TRILL_NOTES: SongNote[] = Array.from({ length: 9 }, (_, i) => ({
  x0: 700 + i * 50 - i * i,
  x1: 722 + i * 50 - i * i,
  f0: 7.4 - i * 0.12,
  f1: 5.6 - i * 0.12,
  bend: 0.8,
  width: 9 - i * 0.5,
  peak: i === 4,
}));

// Frase estilizada inspirada en el copetón (Zonotrichia capensis): tres
// silbidos y un trino. Es decorativa, no la grabación de un canto real.
export const SONG_PHRASE: readonly SongNote[] = [
  { x0: 60, x1: 230, f0: 7.2, f1: 5.0, bend: 1.5, width: 16, peak: true },
  { x0: 290, x1: 450, f0: 5.2, f1: 6.8, bend: -1.4, width: 14 },
  { x0: 510, x1: 640, f0: 6.6, f1: 4.6, bend: 1.0, width: 12, peak: true },
  ...TRILL_NOTES,
];

/** Frecuencia del punto de control del barrido cuadrático de una nota, escalada a un armónico. */
export function controlKhz(note: SongNote, harmonic = 1): number {
  return ((note.f0 + note.f1) / 2 + note.bend) * harmonic;
}
