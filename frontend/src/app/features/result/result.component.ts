import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecordingSpectrogramComponent } from '../../shared/components/recording-spectrogram/recording-spectrogram.component';
import { FrequencyAxisComponent } from '../../shared/components/frequency-axis/frequency-axis.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { VocalizationTagPipe } from '../../shared/pipes/vocalization-tag.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { LiveSyncService } from '../../core/services/live-sync.service';
import { UserService } from '../../core/services/user.service';
import { DetectionDraft, DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { Detection, Visibility } from '../../core/models';

type ResultLoadState = 'loading' | 'ready' | 'missing';

// La placa muestra 0–12 kHz, la misma banda que Grabar y la landing.
const PLATE_MAX_KHZ = 12;
const PLATE_STEP_KHZ = 2;

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [LoadingStateComponent, RouterLink, DatePipe, DecimalPipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe, SpeciesNamePipe, VocalizationTagPipe, RecordingSpectrogramComponent, FrequencyAxisComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
})
export class ResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly detectionsService = inject(DetectionsService);
  private readonly liveSync = inject(LiveSyncService);
  private readonly user = inject(UserService);
  private readonly draftService = inject(DetectionDraftService);

  @ViewChild('audioPlayer') private readonly audioPlayerRef?: ElementRef<HTMLAudioElement>;

  private readonly detection = signal<Detection | null>(null);
  private readonly draft = signal<DetectionDraft | null>(null);

  // View model shared by both a not-yet-saved draft and an already-saved
  // detection, since the result card renders the same fields for either.
  readonly view = computed(() => this.detection() ?? this.draft());
  readonly isDraft = computed(() => this.detection() === null && this.draft() !== null);
  /** Solo estado de vista: evita una pantalla en blanco si la detección no existe o falla al cargar. */
  readonly loadState = signal<ResultLoadState>('loading');
  readonly plateMaxKhz = PLATE_MAX_KHZ;
  readonly plateStepKhz = PLATE_STEP_KHZ;

  readonly visibility = signal<Visibility>('PRIVATE');
  readonly visibilityOptions: { value: Visibility; icon: string; labelKey: string }[] = [
    { value: 'PRIVATE', icon: 'lock', labelKey: 'result.visibilityPrivate' },
    { value: 'PUBLIC', icon: 'public', labelKey: 'result.visibilityPublic' },
  ];
  readonly isPlaying = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly fieldNotesDraft = signal('');
  readonly uploadingPhoto = signal(false);
  readonly photoUploadError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadState.set('missing');
      return;
    }

    if (id === DRAFT_DETECTION_ID) {
      const draft = this.draftService.draft();
      if (!draft) {
        await this.router.navigateByUrl('/record');
        return;
      }
      this.draft.set(draft);
      this.loadState.set('ready');
      return;
    }

    try {
      const detection = await this.detectionsService.getById(id);
      if (detection) {
        this.detection.set(detection);
        this.fieldNotesDraft.set(detection.fieldNotes ?? '');
      }
      this.loadState.set(detection ? 'ready' : 'missing');
    } catch (error) {
      console.error('Detection load failed', error);
      this.loadState.set('missing');
    }
  }

  /**
   * El botón solo alternaba un signal booleano sin tocar ningún elemento
   * <audio> real, por lo que nunca sonaba nada; ahora controla directamente
   * el <audio> enlazado a `d.audioUrl` y `isPlaying` se sincroniza con sus
   * eventos nativos (play/pause/ended) en vez de asumir el estado.
   */
  togglePlayback(): void {
    const audio = this.audioPlayerRef?.nativeElement;
    const audioUrl = this.view()?.audioUrl;
    if (!audio || !audioUrl) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  setVisibility(value: Visibility): void {
    this.visibility.set(value);
  }

  async confirmSave(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;

    this.saving.set(true);
    try {
      const created = await this.detectionsService.create({
        speciesId: draft.species.id,
        recordedAt: draft.recordedAt,
        audioStoragePath: draft.audioStoragePath,
        durationSeconds: draft.durationSeconds,
        confidence: draft.confidence,
        peakFrequencyHz: draft.peakFrequencyHz,
        alternatives: draft.alternatives.map((a) => ({ speciesId: a.species.id, confidence: a.confidence })),
        location: draft.location,
        observerName: this.user.currentUser()?.fullName,
        fieldNotes: this.fieldNotesDraft() || undefined,
        visibility: this.visibility(),
      });

      this.draftService.clear();
      this.draft.set(null);
      this.detection.set(created);

      // Solo se notifica al mapa público (otras pestañas vía Shared Worker)
      // cuando la detección es PUBLIC: una PRIVATE nunca debe filtrarse ahí.
      if (created.visibility === 'PUBLIC') {
        this.liveSync.broadcastDetection({
          detectionId: created.id,
          speciesCommonName: created.species.commonName,
          latitude: created.location.latitude,
          longitude: created.location.longitude,
          confidence: created.confidence,
        });
      }

      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2400);
    } finally {
      this.saving.set(false);
    }
  }

  recordAnother(): void {
    this.router.navigateByUrl('/record');
  }

  // Solo aplica sobre una detección ya guardada (necesita un id real de
  // backend); el resultado de un draft aún no confirmado no admite foto
  // propia todavía.
  async onObserverPhotoSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const detection = this.detection();
    const userId = await this.user.getUserId();
    if (!file || !detection || !userId) return;

    this.photoUploadError.set(null);
    this.uploadingPhoto.set(true);
    try {
      this.detection.set(await this.detectionsService.uploadObserverPhoto(detection.id, userId, file));
    } catch (error) {
      console.error('Observer photo upload failed', error);
      this.photoUploadError.set('result.observerPhotoError');
    } finally {
      this.uploadingPhoto.set(false);
    }
  }
}
