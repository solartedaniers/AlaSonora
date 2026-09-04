import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { LiveSyncService } from '../../core/services/live-sync.service';
import { Detection } from '../../core/models';

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

  readonly detection = signal<Detection | null>(null);
  readonly isPlaying = signal(false);
  readonly saved = signal(false);
  readonly fieldNotesDraft = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const detection = await this.detectionsService.getById(id);
    if (detection) {
      this.detection.set(detection);
      this.fieldNotesDraft.set(detection.fieldNotes ?? '');
    }
  }

  togglePlayback(): void {
    this.isPlaying.update((v) => !v);
  }

  confirmSave(): void {
    const d = this.detection();
    if (!d) return;
    this.saved.set(true);
    // Notifica a otras pestañas abiertas (ej. el mapa público) vía el
    // Shared Worker, para que el punto aparezca sin recargar.
    this.liveSync.broadcastDetection({
      detectionId: d.id,
      speciesCommonName: d.species.commonName,
      latitude: d.location.latitude,
      longitude: d.location.longitude,
      confidence: d.confidence,
    });
    setTimeout(() => this.saved.set(false), 2400);
  }

  recordAnother(): void {
    this.router.navigateByUrl('/record');
  }
}
