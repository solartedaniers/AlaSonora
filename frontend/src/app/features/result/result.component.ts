import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { LiveSyncService } from '../../core/services/live-sync.service';
import { UserService } from '../../core/services/user.service';
import { DetectionDraft, DetectionDraftService, DRAFT_DETECTION_ID } from '../../core/services/detection-draft.service';
import { Detection, Visibility } from '../../core/models';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [RouterLink, DecimalPipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './result.component.html',
})
export class ResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly detectionsService = inject(DetectionsService);
  private readonly liveSync = inject(LiveSyncService);
  private readonly user = inject(UserService);
  private readonly draftService = inject(DetectionDraftService);

  private readonly detection = signal<Detection | null>(null);
  private readonly draft = signal<DetectionDraft | null>(null);

  // View model shared by both a not-yet-saved draft and an already-saved
  // detection, since the result card renders the same fields for either.
  readonly view = computed(() => this.detection() ?? this.draft());
  readonly isDraft = computed(() => this.detection() === null && this.draft() !== null);

  readonly visibility = signal<Visibility>('PRIVATE');
  readonly isPlaying = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly fieldNotesDraft = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    if (id === DRAFT_DETECTION_ID) {
      const draft = this.draftService.draft();
      if (!draft) {
        await this.router.navigateByUrl('/record');
        return;
      }
      this.draft.set(draft);
      return;
    }

    const detection = await this.detectionsService.getById(id);
    if (detection) {
      this.detection.set(detection);
      this.fieldNotesDraft.set(detection.fieldNotes ?? '');
    }
  }

  togglePlayback(): void {
    this.isPlaying.update((v) => !v);
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
        audioUrl: draft.audioUrl,
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
}
