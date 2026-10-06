import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AudioWorkerOutboundMessage, RecordingSpectrogramRequest } from '../../workers/messages';

const FFT_SIZE = 512;
const COLUMN_COUNT = 160;
// BirdNET analyzes 0–15 kHz; bins above that are only noise on screen.
const MAX_DISPLAY_FREQUENCY_HZ = 15_000;
// Any sample rate works here: decodeAudioData keeps the file's own rate.
const DECODER_SAMPLE_RATE = 44_100;

/** Spectrogram of a stored recording, computed by the same FFT Web Worker the live recorder uses. */
@Injectable({ providedIn: 'root' })
export class RecordingSpectrogramService {
  private readonly http = inject(HttpClient);

  /** Magnitude spectra over time, low frequencies first, cropped to the display band. */
  async compute(audioUrl: string): Promise<Float32Array[]> {
    const encoded = await firstValueFrom(this.http.get(audioUrl, { responseType: 'arraybuffer' }));
    const audio = await new OfflineAudioContext(1, 1, DECODER_SAMPLE_RATE).decodeAudioData(encoded);
    const columns = await this.runWorker({
      type: 'compute-recording-spectrogram',
      samples: audio.getChannelData(0).slice(),
      sampleRate: audio.sampleRate,
      fftSize: FFT_SIZE,
      columnCount: COLUMN_COUNT,
    });
    const binCount = Math.ceil((MAX_DISPLAY_FREQUENCY_HZ * FFT_SIZE) / audio.sampleRate);
    return columns.map((column) => column.subarray(0, binCount));
  }

  private runWorker(request: RecordingSpectrogramRequest): Promise<Float32Array[]> {
    const worker = new Worker(new URL('../../workers/audio-processing.worker', import.meta.url), { type: 'module' });
    return new Promise<Float32Array[]>((resolve, reject) => {
      worker.onmessage = ({ data }: MessageEvent<AudioWorkerOutboundMessage>) => {
        if (data.type === 'recording-spectrogram') resolve(data.columns);
      };
      worker.onerror = (error) => reject(error);
      worker.postMessage(request, [request.samples.buffer]);
    }).finally(() => worker.terminate());
  }
}
