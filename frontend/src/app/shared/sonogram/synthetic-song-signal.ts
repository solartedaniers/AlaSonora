import { SpectrogramFrame } from '../../core/services/audio-capture.service';
import { PHRASE_MAX_KHZ, PHRASE_WIDTH, SONG_PHRASE, SongNote, controlKhz } from './song-phrase';

const BINS = 128;
const COLUMNS_PER_SECOND = 50;
const PHRASE_SECONDS = 2.4;
const SILENCE_SECONDS = 1.0;
// La vista en vivo multiplica las magnitudes ×6; este tope equivale a intensidad 1.
const FULL_SCALE = 1 / 6;
const QUIET_NOTE_LEVEL = 0.62;
const HARMONIC_LEVEL = 0.32;
const BAND_SIGMA_BINS = 2.4;
const NOISE_FLOOR = 0.002;
const DISPLAY_RMS_DB = -20;

/**
 * Turns the stylized song phrase into spectrogram columns, so demos can feed
 * the real SpectrogramViewComponent without a microphone. Purely illustrative:
 * the UI must label it as an example.
 */
export class SyntheticSongSignal {
  static readonly COLUMNS_PER_SECOND = COLUMNS_PER_SECOND;

  private columnIndex = 0;
  private lastColumnAt = -Infinity;

  /** Next column when one is due (fixed rate, independent of the screen refresh). */
  nextFrame(now = performance.now()): SpectrogramFrame | null {
    if (now - this.lastColumnAt < 1000 / COLUMNS_PER_SECOND) return null;
    this.lastColumnAt = now;
    return this.frameAt(this.columnIndex++ / COLUMNS_PER_SECOND);
  }

  /** The first `count` columns at once, so a view can start already full; streaming continues after them. */
  backfill(count: number): Float32Array[] {
    return Array.from({ length: count }, () => this.frameAt(this.columnIndex++ / COLUMNS_PER_SECOND).magnitudes);
  }

  /** Column at `seconds` into the looping phrase (phrase + silence). */
  frameAt(seconds: number): SpectrogramFrame {
    const t = seconds % (PHRASE_SECONDS + SILENCE_SECONDS);
    const x = (t / PHRASE_SECONDS) * PHRASE_WIDTH;
    const magnitudes = new Float32Array(BINS);
    for (let bin = 0; bin < BINS; bin++) magnitudes[bin] = Math.random() * NOISE_FLOOR;

    let peakKhz = 0;
    for (const note of SONG_PHRASE) {
      if (x < note.x0 || x > note.x1) continue;
      const u = (x - note.x0) / (note.x1 - note.x0);
      // Cada nota entra y sale suavemente (envolvente).
      const level = (note.peak ? 1 : QUIET_NOTE_LEVEL) * Math.sqrt(Math.sin(Math.PI * u));
      const khz = SyntheticSongSignal.sweepKhz(note, u, 1);
      SyntheticSongSignal.addTone(magnitudes, khz, level);
      SyntheticSongSignal.addTone(magnitudes, SyntheticSongSignal.sweepKhz(note, u, 2), level * HARMONIC_LEVEL);
      peakKhz = khz;
    }
    return { magnitudes, peakFrequencyHz: Math.round(peakKhz * 1000), rmsDb: DISPLAY_RMS_DB };
  }

  /** Same quadratic sweep the SVG sonogram draws. */
  private static sweepKhz(note: SongNote, u: number, harmonic: number): number {
    const a = note.f0 * harmonic;
    const b = controlKhz(note, harmonic);
    const c = note.f1 * harmonic;
    return (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;
  }

  private static addTone(magnitudes: Float32Array, khz: number, level: number): void {
    if (khz >= PHRASE_MAX_KHZ) return;
    const center = (khz / PHRASE_MAX_KHZ) * BINS;
    for (let bin = 0; bin < BINS; bin++) {
      const energy = level * FULL_SCALE * Math.exp(-((bin - center) ** 2) / (2 * BAND_SIGMA_BINS ** 2));
      magnitudes[bin] = Math.max(magnitudes[bin], energy);
    }
  }
}
