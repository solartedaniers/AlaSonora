import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AudioCaptureService } from '../../core/services/audio-capture.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { SpeciesCatalogService } from '../../core/services/species-catalog.service';
import { DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { GeoLocation } from '../../core/models';

type RecordingTab = 'live' | 'upload';

// Bogotá's Eastern Hills as a stand-in field location when geolocation is
// denied/unavailable, until the real AI phase adds actual GPS tagging.
const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

@Component({
  selector: 'app-recording',
  standalone: true,
  imports: [DecimalPipe, NavHeaderComponent, OfflineBannerComponent, SpectrogramViewComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './recording.component.html',
})
export class RecordingComponent {
  readonly capture = inject(AudioCaptureService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly speciesCatalog = inject(SpeciesCatalogService);
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

  async toggleRecording(): Promise<void> {
    if (this.capture.isRecording()) {
      this.capture.stop();
      await this.classifyAndNavigate();
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
    if (file) await this.classifyAndNavigate();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) await this.classifyAndNavigate();
  }

  private async classifyAndNavigate(): Promise<void> {
    // La IA real (FastAPI) llega en una fase futura; mientras tanto
    // simulamos una clasificación plausible sobre el catálogo real de
    // especies, y el usuario confirma/guarda contra el backend real.
    const species = await this.speciesCatalog.getAll();
    if (species.length === 0) return;

    const [primary, ...rest] = [...species].sort(() => Math.random() - 0.5);
    const alternatives = rest.slice(0, 2).map((s, i) => ({
      species: s,
      confidence: Math.round((65 - i * 15 + Math.random() * 10) * 10) / 10,
    }));

    this.draftService.set({
      species: primary,
      recordedAt: new Date().toISOString(),
      durationSeconds: Math.round(this.capture.elapsedSeconds() || 8),
      confidence: Math.round((88 + Math.random() * 11) * 10) / 10,
      peakFrequencyHz: Math.round(2000 + Math.random() * 4000),
      alternatives,
      location: await this.currentLocation(),
    });

    await this.router.navigate(['/result', DRAFT_DETECTION_ID]);
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
