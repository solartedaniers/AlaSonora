import { Component, DestroyRef, afterNextRender, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { ClassificationResult, ClassificationService, UploadedRecording } from '../../core/services/classification.service';
import { UserService } from '../../core/services/user.service';
import { I18nService } from '../../core/services/i18n.service';
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { FALLBACK_LOCATION, PendingRecordingsSyncService } from '../../core/services/pending-recordings-sync.service';
import { GeoLocation } from '../../core/models';
import { LoggerService } from '../../core/services/logger.service';
import { AiEngineStatusService } from '../../core/services/ai-engine-status.service';
import {
  AUDIO_UPLOAD_ACCEPT,
  AUDIO_UPLOAD_MAX_MB,
  audioUploadProblem,
} from '../../core/validators/audio-upload.validator';
import { ClassificationProgress } from './classification-progress';
import { ClassificationProgressComponent } from './classification-progress/classification-progress.component';

type RecordingTab = 'live' | 'upload';
type SonogramView = 'flat' | 'waterfall';

/** Audio a clasificar: la duración se conoce al grabar; para un archivo se mide al verificarlo. */
interface AudioSubmission {
  audio: Blob;
  peakFrequencyHz: number;
  durationSeconds?: number;
}

/** Último intento, para reintentar sin volver a grabar ni (si ya subió) volver a subir. */
interface ClassificationAttempt {
  submission: AudioSubmission;
  uploaded?: UploadedRecording;
}

// 422 legítimo cuando BirdNET no encuentra especie: identifico por el código estable
// (ApiErrorCode en el backend) y acepto el texto antiguo mientras haya backends sin el código.
const NO_SPECIES_IDENTIFIED_CODE = 'NO_SPECIES_IDENTIFIED';
const NO_SPECIES_IDENTIFIED_LEGACY_DETAIL = 'No bird species were identified in this recording';
// Motor dormido: código estable del backend o las respuestas del proxy de Render mientras arranca.
const AI_ENGINE_UNAVAILABLE_CODE = 'AI_ENGINE_UNAVAILABLE';
const ENGINE_ASLEEP_STATUSES = [502, 503, 504];
// Audio rechazado por el backend (formato o tamaño): mismos textos que la validación local.
const AUDIO_TOO_LARGE_CODE = 'AUDIO_TOO_LARGE';
const AUDIO_UNSUPPORTED_CODE = 'AUDIO_UNSUPPORTED';
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
    ClassificationProgressComponent,
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
    // Si salgo de la pantalla a mitad del análisis, el avance estimado deja de correr.
    inject(DestroyRef).onDestroy(() => this.progress.reset());
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

  /** Barra de subida → verificación → análisis; si falla, guarda el error y ofrece reintentar. */
  readonly progress = new ClassificationProgress();
  readonly isClassifying = computed(() => this.progress.active() && !this.progress.error());
  /** Errores antes de empezar (formato, tamaño, sin sesión); los de la clasificación van en la barra. */
  readonly classifyError = signal<string | null>(null);
  readonly uploadAccept = AUDIO_UPLOAD_ACCEPT;
  readonly uploadMaxMb = AUDIO_UPLOAD_MAX_MB;
  private lastAttempt: ClassificationAttempt | null = null;
  readonly savedOffline = signal(false);
  readonly micDenied = signal(false);
  /** La placa de esta pantalla ya tiene sonograma pintado (se empezó a grabar). */
  readonly hasSonogram = signal(false);

  async toggleRecording(): Promise<void> {
    if (this.capture.isRecording()) {
      const durationSeconds = Math.round(this.capture.elapsedSeconds());
      const peakFrequencyHz = this.capture.latestFrame()?.peakFrequencyHz ?? 0;
      const wavBlob = await this.capture.stop();
      await this.classifyAndNavigate({ audio: wavBlob, durationSeconds, peakFrequencyHz });
    } else {
      try {
        // Una grabación nueva reemplaza al intento anterior que hubiera fallado.
        this.progress.reset();
        this.classifyError.set(null);
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
    if (file) await this.classifyFile(file);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Limpio el selector para que elegir el mismo archivo otra vez vuelva a disparar change.
    input.value = '';
    if (file) await this.classifyFile(file);
  }

  private async classifyFile(file: File): Promise<void> {
    const problem = audioUploadProblem(file);
    if (problem) {
      this.progress.reset();
      this.classifyError.set(this.uploadProblemMessage(problem));
      return;
    }
    await this.classifyAndNavigate({ audio: file, peakFrequencyHz: 0 });
  }

  private uploadProblemMessage(problem: 'unsupported' | 'tooLarge'): string {
    return problem === 'tooLarge'
      ? this.i18n.translate('recording.fileTooLarge', { max: this.uploadMaxMb })
      : this.i18n.translate('recording.fileUnsupported');
  }

  /** Reintenta el último audio desde la barra; si ya había subido, no lo vuelve a subir. */
  async retryClassification(): Promise<void> {
    const attempt = this.lastAttempt;
    if (attempt) await this.classifyAndNavigate(attempt.submission, attempt.uploaded);
  }

  private async classifyAndNavigate(submission: AudioSubmission, uploaded?: UploadedRecording): Promise<void> {
    this.classifyError.set(null);
    this.savedOffline.set(false);

    if (!navigator.onLine) {
      this.progress.reset();
      await this.saveForLater(submission);
      return;
    }

    // Leo la sesión directamente y no el signal `currentUser`, que se llena cuando
    // resuelve getSession() (ver UserService.isAuthenticated).
    const userId = await this.userService.getUserId();
    if (!userId) {
      this.classifyError.set(this.i18n.translate('recording.notSignedIn'));
      return;
    }

    const attempt: ClassificationAttempt = { submission, uploaded };
    this.lastAttempt = attempt;
    this.progress.start();
    // Solo se pasa a BirdNET cuando es un GPS real: el fallback de campo no representa dónde se
    // grabó y acotaría los candidatos a una región inventada. Lo pido ya y lo espero al clasificar.
    const gpsLocation = this.currentLocation();
    try {
      const recordedAt = new Date().toISOString();
      attempt.uploaded = await this.upload(userId, attempt);

      this.progress.verifying();
      const durationSeconds = submission.durationSeconds ?? (await this.audioDurationSeconds(submission.audio));
      this.progress.verified();

      const result = await this.classifyWhenEngineReady(attempt.uploaded.signedUrl, recordedAt, await gpsLocation);
      if (!result) {
        this.progress.fail(this.i18n.translate('recording.engine.timeout'));
        return;
      }
      this.progress.complete();

      this.draftService.set({
        species: result.species,
        recordedAt,
        audioStoragePath: attempt.uploaded.storagePath,
        // Válida solo por unos minutos; suficiente para revisar el resultado
        // antes de guardarlo. Tras guardar, el backend firma una nueva URL
        // cada vez que se pide la detección, a partir de audioStoragePath.
        audioUrl: attempt.uploaded.signedUrl,
        durationSeconds,
        confidence: result.confidence,
        peakFrequencyHz: submission.peakFrequencyHz,
        alternatives: result.alternatives,
        location: (await gpsLocation) ?? FALLBACK_LOCATION,
        disclaimer: result.disclaimer,
      });

      await this.router.navigate(['/result', DRAFT_DETECTION_ID]);
    } catch (error) {
      // Se cayó la señal al subir o clasificar: igual que grabar sin conexión.
      if (!navigator.onLine) {
        this.progress.reset();
        await this.saveForLater(submission);
        return;
      }
      this.logger.error('Recording', 'classification failed', error);
      this.progress.fail(this.resolveClassifyErrorMessage(error));
    }
  }

  /** Sube con progreso real; al reintentar un audio ya subido solo pido una URL firmada nueva. */
  private async upload(userId: string, attempt: ClassificationAttempt): Promise<UploadedRecording> {
    if (attempt.uploaded) {
      const signedUrl = await this.classificationService.signRecording(attempt.uploaded.storagePath);
      this.progress.uploaded(1);
      return { ...attempt.uploaded, signedUrl };
    }
    return this.classificationService.uploadRecording(userId, attempt.submission.audio, (fraction) => this.progress.uploaded(fraction));
  }

  /** null si el motor no despertó a tiempo; si se durmió entre la consulta y la clasificación, espero y reintento una vez. */
  private async classifyWhenEngineReady(
    signedUrl: string,
    recordedAt: string,
    location: GeoLocation | undefined
  ): Promise<ClassificationResult | null> {
    if (!(await this.engineReady())) return null;
    try {
      return await this.classificationService.classify(signedUrl, recordedAt, location);
    } catch (error) {
      if (!RecordingComponent.isEngineAsleep(error)) throw error;
      this.aiEngine.markAsleep();
      if (!(await this.engineReady())) return null;
      return this.classificationService.classify(signedUrl, recordedAt, location);
    }
  }

  /** Mientras el motor arranca la etapa dice "Encendiendo…", sin perder el avance ya hecho. */
  private async engineReady(): Promise<boolean> {
    this.progress.analyzing(this.aiEngine.status() !== 'ready');
    const ready = await this.aiEngine.whenReady();
    if (ready) this.progress.analyzing();
    return ready;
  }

  private static isEngineAsleep(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    const code = (error.error as { errorCode?: string } | null)?.errorCode;
    return code === AI_ENGINE_UNAVAILABLE_CODE || ENGINE_ASLEEP_STATUSES.includes(error.status);
  }

  // Sin señal: la grabación queda en la cola de IndexedDB y
  // PendingRecordingsSyncService la clasifica y guarda sola al volver la
  // conexión. El GPS sí se intenta: no depende de datos móviles.
  private async saveForLater(submission: AudioSubmission): Promise<void> {
    await this.pendingSync.enqueue({
      recordedAt: new Date().toISOString(),
      audioBlob: submission.audio,
      durationSeconds: submission.durationSeconds ?? (await this.audioDurationSeconds(submission.audio)),
      peakFrequencyHz: submission.peakFrequencyHz,
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
    const code = error instanceof HttpErrorResponse ? (error.error as { errorCode?: string } | null)?.errorCode : undefined;
    if (code === AUDIO_TOO_LARGE_CODE) return this.uploadProblemMessage('tooLarge');
    if (code === AUDIO_UNSUPPORTED_CODE) return this.uploadProblemMessage('unsupported');
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

  /**
   * Solo decodifico archivos subidos: la grabación en vivo ya lleva su propio tiempo. Si el navegador
   * no sabe decodificarlo, leo los metadatos; el backend vuelve a validar el contenido real.
   */
  private async audioDurationSeconds(audio: Blob): Promise<number> {
    if (typeof AudioContext === 'undefined') return RecordingComponent.mediaDurationSeconds(audio);
    const audioContext = new AudioContext();
    try {
      const buffer = await audioContext.decodeAudioData(await audio.arrayBuffer());
      return Math.round(buffer.duration);
    } catch {
      return RecordingComponent.mediaDurationSeconds(audio);
    } finally {
      await audioContext.close();
    }
  }

  /** Sin Web Audio leo la duración de los metadatos con un <audio>; si tampoco puede, queda en 0. */
  private static mediaDurationSeconds(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
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
