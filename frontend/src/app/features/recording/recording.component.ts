import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { GeoLocation } from '../../core/models';

type RecordingTab = 'live' | 'upload';

// Bogotá's Eastern Hills as a stand-in field location when geolocation is
// denied/unavailable, until the real AI phase adds actual GPS tagging.
const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

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
  private readonly draftService = inject(DetectionDraftService);
  private readonly router = inject(Router);

  readonly activeTab = signal<RecordingTab>('live');
  readonly gainDb = signal(12);
  readonly highPassEnabled = signal(true);
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
      this.classifyError.set('recording.notSignedIn');
      return;
    }

    this.isClassifying.set(true);
    try {
      const recordedAt = new Date().toISOString();
      const location = await this.currentLocation();
      const audioUrl = await this.classificationService.uploadRecording(userId, audio);
      const result = await this.classificationService.classify(audioUrl, recordedAt, location);

      this.draftService.set({
        species: result.species,
        recordedAt,
        audioUrl,
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
      this.classifyError.set('recording.classifyError');
    } finally {
      this.isClassifying.set(false);
    }
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

  private currentLocation(): Promise<GeoLocation> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(FALLBACK_LOCATION);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(FALLBACK_LOCATION),
        { timeout: 4000 }
      );
    });
  }
}
