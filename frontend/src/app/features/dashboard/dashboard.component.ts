import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { InfiniteSpiralComponent, SpiralItem } from '../../shared/components/infinite-spiral/infinite-spiral.component';
import { FieldBackdropComponent } from '../../shared/components/field-backdrop/field-backdrop.component';
import { SongSonogramComponent } from '../../shared/components/song-sonogram/song-sonogram.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { UserService } from '../../core/services/user.service';
import { DetectionsService } from '../../core/services/detections.service';
import { I18nService } from '../../core/services/i18n.service';
import { Detection, UserStats, speciesDisplayName } from '../../core/models';

interface PersonalReading {
  labelKey: string;
  value: number;
  suffixKey?: string;
}

const RECENT_DETECTIONS = 5;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    NavHeaderComponent,
    ConfidenceBadgeComponent,
    CountUpComponent,
    InfiniteSpiralComponent,
    FieldBackdropComponent,
    SongSonogramComponent,
    TranslatePipe,
    SpeciesNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly user = inject(UserService);
  private readonly detectionsService = inject(DetectionsService);
  private readonly i18n = inject(I18nService);

  /** Abre Grabar directo en la pestaña de subir archivo. */
  readonly uploadTabQuery = { tab: 'upload' };

  readonly stats = signal<UserStats | null>(null);
  readonly latest = signal<Detection | null>(null);
  readonly recent = signal<Detection[]>([]);

  readonly readings = computed<PersonalReading[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { labelKey: 'dashboard.metrics.species', value: s.distinctSpecies },
      { labelKey: 'dashboard.metrics.recordings', value: s.totalRecordings },
      { labelKey: 'dashboard.metrics.streak', value: s.activeStreakDays },
      { labelKey: 'dashboard.metrics.confidence', value: s.averageConfidence, suffixKey: 'units.percent' },
    ];
  });

  readonly spiralItems = computed<SpiralItem[]>(() => {
    const lang = this.i18n.lang();
    return this.recent()
      .filter((d) => d.species.imageUrl)
      .map((d) => ({
        imageUrl: d.species.imageUrl!,
        commonName: speciesDisplayName(d.species, lang),
        scientificName: d.species.scientificName,
      }));
  });

  async ngOnInit(): Promise<void> {
    // Sin catch, un fallo de las métricas impediría cargar también las
    // detecciones recientes; si fallan, la sección simplemente no se muestra.
    this.user.getStats().then((stats) => this.stats.set(stats)).catch(() => undefined);
    const recent = await this.detectionsService.getRecent(RECENT_DETECTIONS);
    this.recent.set(recent);
    this.latest.set(recent[0] ?? null);
  }
}
