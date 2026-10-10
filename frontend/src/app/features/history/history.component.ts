import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { SonogramGlyphComponent } from '../../shared/components/sonogram-glyph/sonogram-glyph.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { Detection, SyncStatus } from '../../core/models';

type HistoryView = 'gallery' | 'list';
type StatusFilter = 'all' | SyncStatus;
type HistoryLoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CountUpComponent, LoadingStateComponent, 
    RouterLink,
    DatePipe,
    NavHeaderComponent,
    ConfidenceBadgeComponent,
    SonogramGlyphComponent,
    TranslatePipe,
    SpeciesNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private readonly detectionsService = inject(DetectionsService);

  readonly all = signal<Detection[]>([]);
  readonly view = signal<HistoryView>('gallery');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchTerm = signal('');
  /** Solo estado de vista: distingue "cargando" y "error de red" de un historial realmente vacío. */
  readonly loadState = signal<HistoryLoadState>('loading');

  readonly views: { id: HistoryView; icon: string; labelKey: string }[] = [
    { id: 'gallery', icon: 'grid_view', labelKey: 'history.viewGallery' },
    { id: 'list', icon: 'format_list_bulleted', labelKey: 'history.viewList' },
  ];
  readonly statusFilters: { id: StatusFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'history.statusAll' },
    { id: 'synced', labelKey: 'history.statusValidated' },
    { id: 'pending-sync', labelKey: 'history.statusPending' },
  ];

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
    try {
      this.all.set(await this.detectionsService.getMine());
      this.loadState.set('ready');
    } catch (error) {
      console.error('History load failed', error);
      this.loadState.set('error');
    }
  }

  setView(view: HistoryView): void {
    this.view.set(view);
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }
}
