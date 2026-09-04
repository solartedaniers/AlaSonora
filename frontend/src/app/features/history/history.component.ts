import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { Detection, SyncStatus } from '../../core/models';

type HistoryView = 'gallery' | 'list';
type StatusFilter = 'all' | SyncStatus;

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, DatePipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private readonly detectionsService = inject(DetectionsService);

  readonly all = signal<Detection[]>([]);
  readonly view = signal<HistoryView>('gallery');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchTerm = signal('');

  readonly filtered = computed(() => {
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();
    return this.all().filter((d) => {
      const matchesStatus = status === 'all' || d.syncStatus === status;
      const matchesTerm =
        !term ||
        d.species.commonName.toLowerCase().includes(term) ||
        d.species.scientificName.toLowerCase().includes(term) ||
        (d.location.placeName ?? '').toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  async ngOnInit(): Promise<void> {
    this.all.set(await this.detectionsService.getAll());
  }

  setView(view: HistoryView): void {
    this.view.set(view);
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }
}
