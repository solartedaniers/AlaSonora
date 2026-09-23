import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { PointerGlowDirective } from '../../shared/directives/pointer-glow.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AudioCaptureService } from '../../core/services/audio-capture.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { ClassificationService } from '../../core/services/classification.service';
import { UserService } from '../../core/services/user.service';
import { I18nService } from '../../core/services/i18n.service';
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { GeoLocation } from '../../core/models';

type RecordingTab = 'live' | 'upload';

// Bogotá's Eastern Hills as a stand-in field location when geolocation is
// denied/unavailable, until the real AI phase adds actual GPS tagging.
const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

// Texto exacto que DetectionClassificationService.runClassification lanza
// cuando BirdNET no encuentra ninguna especie con confianza suficiente (422
// legítimo, nada que ver con la red). No hay un código de error dedicado en
// la API todavía, así que se distingue por este texto — si el backend lo
// cambia, hay que actualizarlo aquí también.
const NO_SPECIES_IDENTIFIED_DETAIL = 'No bird species were identified in this recording';

@Component({
  selector: 'app-recording',
  standalone: true,
  imports: [
    DecimalPipe,
    NavHeaderComponent,
    OfflineBannerComponent,
    SpectrogramViewComponent,
    SoftAuroraComponent,
    PointerGlowDirective,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './recording.component.html',
})
export class RecordingComponent {
  readonly capture = inject(AudioCaptureService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly classificationService = inject(ClassificationService);
  private readonly userService = inject(UserService);
  private readonly i18n = inject(I18nService);
  private readonly draftService = inject(DetectionDraftService);
  private readonly router = inject(Router);

  readonly activeTab = signal<RecordingTab>('live');
  readonly isDragOver = signal(false);

  // Se pasa como función (no como valor) para que el componente de canvas
  // pueda leer el signal en cada tick de rAF sin que este componente padre
  // tenga que re-renderizarse en cada frame de audio.
  readonly getLatestFrame = () => this.capture.latestFrame();

  setTab(tab: RecordingTab): void {
    this.activeTab.set(tab);
  }

  readonly isClassifying = signal(false);
  readonly classifyError = signal<string | null>(null);

  async toggleRecording(): Promise<void> {
    if (this.capture.isRecording()) {
      const durationSeconds = Math.round(this.capture.elapsedSeconds());
      const peakFrequencyHz = this.capture.latestFrame()?.peakFrequencyHz ?? 0;
      const wavBlob = await this.capture.stop();
      await this.classifyAndNavigate(wavBlob, durationSeconds, peakFrequencyHz);
    } else {
      try {
        await this.capture.start();
      } catch {
        // Permiso de micrófono denegado o no disponible: no interrumpimos
        // el flujo, el usuario puede intentar de nuevo o usar "Subir archivo".
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
      console.error('Classification failed', error);
      this.classifyError.set(this.resolveClassifyErrorMessage(error));
    } finally {
      this.isClassifying.set(false);
    }
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
