import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { Detection, SyncStatus } from '../../core/models';

type HistoryView = 'gallery' | 'list';
type StatusFilter = 'all' | SyncStatus;

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    NavHeaderComponent,
    ConfidenceBadgeComponent,
    OfflineBannerComponent,
    SoftAuroraComponent,
    TranslatePipe,
    SpeciesNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private readonly detectionsService = inject(DetectionsService);

  readonly all = signal<Detection[]>([]);
  readonly view = signal<HistoryView>('gallery');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchTerm = signal('');

  readonly stats = computed(() => {
    const all = this.all();
    return {
      recordings: all.length,
      validated: all.filter((d) => d.syncStatus === 'synced').length,
      pending: all.filter((d) => d.syncStatus === 'pending-sync').length,
      species: new Set(all.map((d) => d.species.scientificName)).size,
    };
  });

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();
    return this.all().filter((d) => {
      const matchesStatus = status === 'all' || d.syncStatus === status;
      const matchesTerm =
        !term ||
        d.species.commonName.toLowerCase().includes(term) ||
        d.species.commonNameEn.toLowerCase().includes(term) ||
        d.species.scientificName.toLowerCase().includes(term) ||
        (d.location.placeName ?? '').toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  async ngOnInit(): Promise<void> {
    this.all.set(await this.detectionsService.getMine());
  }

  setView(view: HistoryView): void {
    this.view.set(view);
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }
}
