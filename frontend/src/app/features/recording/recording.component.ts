import { Component, computed, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { FrequencyAxisComponent } from '../../shared/components/frequency-axis/frequency-axis.component';
import { SongSonogramComponent } from '../../shared/components/song-sonogram/song-sonogram.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AudioCaptureService } from '../../core/services/audio-capture.service';
import { ClassificationService } from '../../core/services/classification.service';
import { UserService } from '../../core/services/user.service';
import { I18nService } from '../../core/services/i18n.service';
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { FALLBACK_LOCATION, PendingRecordingsSyncService } from '../../core/services/pending-recordings-sync.service';
import { GeoLocation } from '../../core/models';

type RecordingTab = 'live' | 'upload';

// Texto exacto que DetectionClassificationService.runClassification lanza
// cuando BirdNET no encuentra ninguna especie con confianza suficiente (422
// legítimo, nada que ver con la red). No hay un código de error dedicado en
// la API todavía, así que se distingue por este texto — si el backend lo
// cambia, hay que actualizarlo aquí también.
const NO_SPECIES_IDENTIFIED_DETAIL = 'No bird species were identified in this recording';

// Visualizador en vivo: columnas visibles y rango de nivel que mueve el anillo del botón.
const LIVE_COLUMNS = 120;
const LEVEL_FLOOR_DB = -60;
const HZ_PER_KHZ = 1000;
// La placa muestra 0–12 kHz, la banda del canto; el audio analizado no se recorta.
const PLATE_MAX_KHZ = 12;

@Component({
  selector: 'app-recording',
  standalone: true,
  imports: [
    DecimalPipe,
    NavHeaderComponent,
    SpectrogramViewComponent,
    FrequencyAxisComponent,
    SongSonogramComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './recording.component.html',
  styleUrl: './recording.component.scss',
})
export class RecordingComponent {
  readonly capture = inject(AudioCaptureService);
  private readonly classificationService = inject(ClassificationService);
  private readonly userService = inject(UserService);
  private readonly i18n = inject(I18nService);
  private readonly draftService = inject(DetectionDraftService);
  private readonly pendingSync = inject(PendingRecordingsSyncService);
  private readonly router = inject(Router);

  readonly activeTab = signal<RecordingTab>('live');
  readonly tabs: { id: RecordingTab; icon: string; labelKey: string }[] = [
    { id: 'live', icon: 'mic', labelKey: 'recording.tabLive' },
    { id: 'upload', icon: 'upload_file', labelKey: 'recording.tabUpload' },
  ];
  readonly isDragOver = signal(false);

  // Se pasa como función (no como valor) para que el componente de canvas
  // pueda leer el signal en cada tick de rAF sin que este componente padre
  // tenga que re-renderizarse en cada frame de audio.
  readonly getLatestFrame = () => this.capture.latestFrame();
  readonly liveColumns = LIVE_COLUMNS;

  /** Top of the live spectrogram: the worker's FFT spans 0 Hz up to half the device sample rate. */
  private readonly nyquistKhz = isPlatformBrowser(inject(PLATFORM_ID)) ? RecordingComponent.deviceNyquistKhz() : null;
  readonly plateMaxKhz = this.nyquistKhz ? Math.min(PLATE_MAX_KHZ, this.nyquistKhz) : null;
  /** Share of the FFT bins drawn so the plate spans 0…plateMaxKhz. */
  readonly visibleFraction = this.nyquistKhz && this.plateMaxKhz ? this.plateMaxKhz / this.nyquistKhz : 1;

  /** Live readings straight from the worker's last frame (null while idle). */
  readonly peakKhz = computed(() => {
    const frame = this.capture.isRecording() ? this.capture.latestFrame() : null;
    return frame ? frame.peakFrequencyHz / HZ_PER_KHZ : null;
  });
  readonly levelDb = computed(() => (this.capture.isRecording() ? (this.capture.latestFrame()?.rmsDb ?? null) : null));
  /** 0…1 signal level that grows the ring around the record button. */
  readonly levelRatio = computed(() => {
    const db = this.levelDb();
    return db === null ? 0 : Math.min(1, Math.max(0, 1 - db / LEVEL_FLOOR_DB));
  });

  setTab(tab: RecordingTab): void {
    this.activeTab.set(tab);
  }

  readonly isClassifying = signal(false);
  readonly classifyError = signal<string | null>(null);
  readonly savedOffline = signal(false);
  readonly micDenied = signal(false);

  async toggleRecording(): Promise<void> {
    if (this.capture.isRecording()) {
      const durationSeconds = Math.round(this.capture.elapsedSeconds());
      const peakFrequencyHz = this.capture.latestFrame()?.peakFrequencyHz ?? 0;
      const wavBlob = await this.capture.stop();
      await this.classifyAndNavigate(wavBlob, durationSeconds, peakFrequencyHz);
    } else {
      try {
        await this.capture.start();
        this.micDenied.set(false);
      } catch {
        // Permiso de micrófono denegado o no disponible: no interrumpimos
        // el flujo, el usuario puede intentar de nuevo o usar "Subir archivo".
        this.micDenied.set(true);
      }
    }
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.classifyAndNavigate(file, await this.audioDurationSeconds(file), 0);
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) await this.classifyAndNavigate(file, await this.audioDurationSeconds(file), 0);
  }

  private async classifyAndNavigate(audio: Blob, durationSeconds: number, peakFrequencyHz: number): Promise<void> {
    this.classifyError.set(null);
    this.savedOffline.set(false);

    if (!navigator.onLine) {
      await this.saveForLater(audio, durationSeconds, peakFrequencyHz);
      return;
    }

    // Reads the session directly rather than the `currentUser` signal, which
    // only resolves after its initial getSession() promise settles — see
    // UserService.isAuthenticated for the same rationale.
    const userId = await this.userService.getUserId();
    if (!userId) {
      this.classifyError.set(this.i18n.translate('recording.notSignedIn'));
      return;
    }

    this.isClassifying.set(true);
    try {
      const recordedAt = new Date().toISOString();
      // Solo se pasa a BirdNET cuando es un GPS real: el fallback de campo
      // no representa dónde se grabó el audio, y narrowear candidatos con
      // una ubicación inventada excluye especies legítimas fuera de esa
      // región (ver BirdNetClassifier.classify en el ai-engine).
      const gpsLocation = await this.currentLocation();
      const { storagePath, signedUrl } = await this.classificationService.uploadRecording(userId, audio);
      const result = await this.classificationService.classify(signedUrl, recordedAt, gpsLocation);
      const location = gpsLocation ?? FALLBACK_LOCATION;

      this.draftService.set({
        species: result.species,
        recordedAt,
        audioStoragePath: storagePath,
        // Válida solo por unos minutos; suficiente para revisar el resultado
        // antes de guardarlo. Tras guardar, el backend firma una nueva URL
        // cada vez que se pide la detección, a partir de audioStoragePath.
        audioUrl: signedUrl,
        durationSeconds,
        confidence: result.confidence,
        peakFrequencyHz,
        alternatives: result.alternatives,
        location,
        disclaimer: result.disclaimer,
      });

      await this.router.navigate(['/result', DRAFT_DETECTION_ID]);
    } catch (error) {
      // Signal dropped mid-upload/classify: same as recording offline.
      if (!navigator.onLine) {
        await this.saveForLater(audio, durationSeconds, peakFrequencyHz);
        return;
      }
      console.error('Classification failed', error);
      this.classifyError.set(this.resolveClassifyErrorMessage(error));
    } finally {
      this.isClassifying.set(false);
    }
  }

  // Sin señal: la grabación queda en la cola de IndexedDB y
  // PendingRecordingsSyncService la clasifica y guarda sola al volver la
  // conexión. El GPS sí se intenta: no depende de datos móviles.
  private async saveForLater(audio: Blob, durationSeconds: number, peakFrequencyHz: number): Promise<void> {
    await this.pendingSync.enqueue({
      recordedAt: new Date().toISOString(),
      audioBlob: audio,
      durationSeconds,
      peakFrequencyHz,
      gpsLocation: await this.currentLocation(),
    });
    this.savedOffline.set(true);
  }

  /**
   * El backend ya distingue estas causas con status codes y mensajes
   * distintos (502 = motor de IA caído, 422 con el detail de calidad de
   * audio rechazada, 422 "sin especie identificada"); antes se mostraba el
   * mismo "revisa tu conexión" para las tres, sugiriendo un problema de red
   * que no existía en los casos 422.
   */
  private resolveClassifyErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const detail = (error.error as { message?: string } | null)?.message;
      if (detail === NO_SPECIES_IDENTIFIED_DETAIL) {
        return this.i18n.translate('recording.noSpeciesIdentified');
      }
      // Cualquier otro 422 (audio rechazado por AudioQualityAnalyzer) ya
      // trae un mensaje final en español desde el ai-engine — se muestra
      // tal cual en vez de reemplazarlo por un texto genérico de conexión.
      if (detail) return detail;
    }
    return this.i18n.translate('recording.classifyError');
  }

  // La captura usa un AudioContext por defecto; uno temporal reporta la misma frecuencia de muestreo del dispositivo.
  private static deviceNyquistKhz(): number {
    const probe = new AudioContext();
    const nyquistKhz = probe.sampleRate / 2 / HZ_PER_KHZ;
    void probe.close();
    return nyquistKhz;
  }

  /** Only decoded for uploaded files: live recordings already track their own elapsed time. */
  private async audioDurationSeconds(file: File): Promise<number> {
    const audioContext = new AudioContext();
    try {
      const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      return Math.round(buffer.duration);
    } finally {
      await audioContext.close();
    }
  }

  /** Resolves to `undefined` (never the field fallback) when no real GPS fix is available — see the call site for why. */
  private currentLocation(): Promise<GeoLocation | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 4000 }
      );
    });
  }
}
