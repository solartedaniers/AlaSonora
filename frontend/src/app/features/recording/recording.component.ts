import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AudioCaptureService } from '../../core/services/audio-capture.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';

type RecordingTab = 'live' | 'upload';

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
    // En la fase de backend, aquí se sube el audio a la API FastAPI y se
    // usa el `id` real devuelto. Por ahora navegamos a un resultado mock.
    await this.router.navigate(['/result', 'det-001']);
  }
}
