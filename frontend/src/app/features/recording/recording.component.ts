import { Component, afterNextRender, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { FrequencyAxisComponent } from '../../shared/components/frequency-axis/frequency-axis.component';
import { SongSonogramComponent } from '../../shared/components/song-sonogram/song-sonogram.component';
import { SpectrogramWaterfallComponent } from '../../shared/components/spectrogram-waterfall/spectrogram-waterfall.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AudioCaptureService } from '../../core/services/audio-capture.service';
import { ClassificationService } from '../../core/services/classification.service';
import { UserService } from '../../core/services/user.service';
import { I18nService } from '../../core/services/i18n.service';
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { FALLBACK_LOCATION, PendingRecordingsSyncService } from '../../core/services/pending-recordings-sync.service';
import { GeoLocation } from '../../core/models';
import { LoggerService } from '../../core/services/logger.service';
import { AiEngineStatusService } from '../../core/services/ai-engine-status.service';

type RecordingTab = 'live' | 'upload';
type SonogramView = 'flat' | 'waterfall';

// 422 legítimo cuando BirdNET no encuentra especie: identifico por el código estable
// (ApiErrorCode en el backend) y acepto el texto antiguo mientras haya backends sin el código.
const NO_SPECIES_IDENTIFIED_CODE = 'NO_SPECIES_IDENTIFIED';
const NO_SPECIES_IDENTIFIED_LEGACY_DETAIL = 'No bird species were identified in this recording';
// Motor dormido: código estable del backend o las respuestas del proxy de Render mientras arranca.
const AI_ENGINE_UNAVAILABLE_CODE = 'AI_ENGINE_UNAVAILABLE';
const ENGINE_ASLEEP_STATUSES = [502, 503, 504];
// ?tab=upload abre directo la pestaña de subir archivo (enlace del Dashboard).
const TAB_QUERY_PARAM = 'tab';

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
    SpectrogramWaterfallComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './recording.component.html',
  styleUrl: './recording.component.scss',
})
export class RecordingComponent {
  readonly capture = inject(AudioCaptureService);
  private readonly logger = inject(LoggerService);
  private readonly classificationService = inject(ClassificationService);
  private readonly userService = inject(UserService);
  private readonly i18n = inject(I18nService);
  private readonly draftService = inject(DetectionDraftService);
  private readonly pendingSync = inject(PendingRecordingsSyncService);
  private readonly router = inject(Router);
  readonly aiEngine = inject(AiEngineStatusService);

  readonly activeTab = signal<RecordingTab>(
    inject(ActivatedRoute).snapshot.queryParamMap.get(TAB_QUERY_PARAM) === 'upload' ? 'upload' : 'live'
  );
  /** Ícono del indicador para cada estado del motor (el texto va por i18n). */
  readonly aiStatusIcon: Record<string, string> = { waking: 'progress_activity', ready: 'check_circle', unavailable: 'cloud_off' };
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
  /** Solo cambia cómo se pinta el audio en vivo: el plano es el predeterminado por legibilidad. */
  readonly sonogramView = signal<SonogramView>('flat');
  readonly sonogramViews: { id: SonogramView; labelKey: string }[] = [
    { id: 'flat', labelKey: 'recording.viewFlat' },
    { id: 'waterfall', labelKey: 'recording.viewWaterfall' },
  ];

  /** Sin Web Audio (o sin micrófono) no se puede grabar aquí; subir un archivo sigue disponible. */
  readonly recordingSupported = signal(true);
  /** Tope del espectrograma en vivo: la FFT del worker va de 0 Hz a la mitad de la frecuencia de muestreo. */
  private readonly nyquistKhz = signal<number | null>(null);
  readonly plateMaxKhz = computed(() => {
    const nyquist = this.nyquistKhz();
    return nyquist ? Math.min(PLATE_MAX_KHZ, nyquist) : null;
  });
  /** Fracción de bins de la FFT dibujada para que la placa cubra 0…plateMaxKhz. */
  readonly visibleFraction = computed(() => {
    const nyquist = this.nyquistKhz();
    const plate = this.plateMaxKhz();
    return nyquist && plate ? plate / nyquist : 1;
  });

  constructor() {
    // Detecto el soporte tras el primer render, en el navegador: nunca creo un AudioContext al construir.
    afterNextRender(() => {
      // Despierto el motor de IA al entrar: el indicador muestra si ya está listo.
      this.aiEngine.warmUp();
      if (!AudioCaptureService.isSupported()) {
        this.recordingSupported.set(false);
        this.activeTab.set('upload');
        return;
      }
      this.nyquistKhz.set(RecordingComponent.deviceNyquistKhz());
    });
  }

  /** Lecturas en vivo tomadas del último frame del worker (null en reposo). */
  readonly peakKhz = computed(() => {
    const frame = this.capture.isRecording() ? this.capture.latestFrame() : null;
    return frame ? frame.peakFrequencyHz / HZ_PER_KHZ : null;
  });
  readonly levelDb = computed(() => (this.capture.isRecording() ? (this.capture.latestFrame()?.rmsDb ?? null) : null));
  /** Nivel de señal 0…1 que agranda el anillo del botón de grabar. */
  readonly levelRatio = computed(() => {
    const db = this.levelDb();
    return db === null ? 0 : Math.min(1, Math.max(0, 1 - db / LEVEL_FLOOR_DB));
  });

  setTab(tab: RecordingTab): void {
    this.activeTab.set(tab);
  }

  readonly isClassifying = signal(false);
  readonly classifyError = signal<string | null>(null);
  /** La grabación espera a que el motor de IA despierte para analizarse sola. */
  readonly waitingForEngine = signal(false);
  /** El motor no despertó a tiempo: la grabación sigue en memoria para reintentar. */
  readonly pendingRetry = signal<{ audio: Blob; durationSeconds: number; peakFrequencyHz: number } | null>(null);
  readonly savedOffline = signal(false);
  readonly micDenied = signal(false);
  /** La placa de esta pantalla ya tiene sonograma pintado (se empezó a grabar). */
  readonly hasSonogram = signal(false);

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
        this.hasSonogram.set(true);
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

  /** Reintenta con la misma grabación que esperaba al motor de IA. */
  async retryPending(): Promise<void> {
    const pending = this.pendingRetry();
    if (pending) await this.classifyAndNavigate(pending.audio, pending.durationSeconds, pending.peakFrequencyHz);
  }

  private async classifyAndNavigate(audio: Blob, durationSeconds: number, peakFrequencyHz: number): Promise<void> {
    this.classifyError.set(null);
    this.savedOffline.set(false);
    this.pendingRetry.set(null);

    if (!navigator.onLine) {
      await this.saveForLater(audio, durationSeconds, peakFrequencyHz);
      return;
    }

    // Leo la sesión directamente y no el signal `currentUser`, que se llena cuando
    // resuelve getSession() (ver UserService.isAuthenticated).
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
      if (!(await this.waitForEngine())) {
        this.pendingRetry.set({ audio, durationSeconds, peakFrequencyHz });
        return;
      }
      const { storagePath, signedUrl } = await this.classificationService.uploadRecording(userId, audio);
      let result;
      try {
        result = await this.classificationService.classify(signedUrl, recordedAt, gpsLocation);
      } catch (error) {
        // Se durmió entre la consulta y la clasificación: espero de nuevo y reintento una vez.
        if (!RecordingComponent.isEngineAsleep(error)) throw error;
        this.aiEngine.markAsleep();
        if (!(await this.waitForEngine())) {
          this.pendingRetry.set({ audio, durationSeconds, peakFrequencyHz });
          return;
        }
        result = await this.classificationService.classify(signedUrl, recordedAt, gpsLocation);
      }
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
      // Se cayó la señal al subir o clasificar: igual que grabar sin conexión.
      if (!navigator.onLine) {
        await this.saveForLater(audio, durationSeconds, peakFrequencyHz);
        return;
      }
      this.logger.error('Recording', 'classification failed', error);
      this.classifyError.set(this.resolveClassifyErrorMessage(error));
    } finally {
      this.isClassifying.set(false);
    }
  }

  /** Espera a que el motor responda; mientras tanto se ve el aviso de "encendiendo". */
  private async waitForEngine(): Promise<boolean> {
    if (this.aiEngine.status() !== 'ready') this.waitingForEngine.set(true);
    try {
      return await this.aiEngine.whenReady();
    } finally {
      this.waitingForEngine.set(false);
    }
  }

  private static isEngineAsleep(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    const code = (error.error as { errorCode?: string } | null)?.errorCode;
    return code === AI_ENGINE_UNAVAILABLE_CODE || ENGINE_ASLEEP_STATUSES.includes(error.status);
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
      const body = error.error as { message?: string; errorCode?: string } | null;
      const detail = body?.message;
      if (body?.errorCode === NO_SPECIES_IDENTIFIED_CODE || detail === NO_SPECIES_IDENTIFIED_LEGACY_DETAIL) {
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

  /** Solo decodifico archivos subidos: la grabación en vivo ya lleva su propio tiempo. */
  private async audioDurationSeconds(file: File): Promise<number> {
    if (typeof AudioContext === 'undefined') return RecordingComponent.mediaDurationSeconds(file);
    const audioContext = new AudioContext();
    try {
      const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      return Math.round(buffer.duration);
    } finally {
      await audioContext.close();
    }
  }

  /** Sin Web Audio leo la duración de los metadatos con un <audio>; si tampoco puede, queda en 0. */
  private static mediaDurationSeconds(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const done = (seconds: number) => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(seconds) ? Math.round(seconds) : 0);
      };
      audio.onloadedmetadata = () => done(audio.duration);
      audio.onerror = () => done(0);
      audio.preload = 'metadata';
      audio.src = url;
    });
  }

  /** Devuelve `undefined` (nunca la ubicación de respaldo) si no hay GPS real; el porqué está donde se llama. */
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
