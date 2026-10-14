import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { InfiniteSpiralComponent, SpiralItem } from '../../shared/components/infinite-spiral/infinite-spiral.component';
import { SongSonogramComponent } from '../../shared/components/song-sonogram/song-sonogram.component';
import { RecordingSpectrogramComponent } from '../../shared/components/recording-spectrogram/recording-spectrogram.component';
import { ActivityStripComponent } from './activity-strip/activity-strip.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { UserService } from '../../core/services/user.service';
import { DetectionsService } from '../../core/services/detections.service';
import { I18nService } from '../../core/services/i18n.service';
import { Detection, UserStats, speciesDisplayName } from '../../core/models';
import { AiEngineStatusService } from '../../core/services/ai-engine-status.service';

interface PersonalReading {
  labelKey: string;
  icon: string;
  value: number;
  suffixKey?: string;
}

const RECENT_DETECTIONS = 5;
const LATEST_PLATE_MAX_KHZ = 12;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    NavHeaderComponent,
    ConfidenceBadgeComponent,
    CountUpComponent,
    InfiniteSpiralComponent,
    SongSonogramComponent,
    RecordingSpectrogramComponent,
    ActivityStripComponent,
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
  private readonly aiEngine = inject(AiEngineStatusService);

  /** La miniatura del canto usa la misma banda que Grabar y Resultado. */
  readonly latestMaxKhz = LATEST_PLATE_MAX_KHZ;

  /** Abre Grabar directo en la pestaña de subir archivo. */
  readonly uploadTabQuery = { tab: 'upload' };

  readonly stats = signal<UserStats | null>(null);
  /** Todo mi historial, de la más reciente a la más antigua; null mientras carga. */
  readonly mine = signal<Detection[] | null>(null);
  readonly recent = computed(() => (this.mine() ?? []).slice(0, RECENT_DETECTIONS));
  readonly latest = computed(() => this.mine()?.[0] ?? null);

  readonly readings = computed<PersonalReading[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { labelKey: 'dashboard.metrics.species', icon: 'flutter_dash', value: s.distinctSpecies },
      { labelKey: 'dashboard.metrics.recordings', icon: 'mic', value: s.totalRecordings },
      { labelKey: 'dashboard.metrics.streak', icon: 'forest', value: s.activeStreakDays },
      { labelKey: 'dashboard.metrics.confidence', icon: 'check_circle', value: s.averageConfidence, suffixKey: 'units.percent' },
    ];
  });

  readonly spiralItems = computed<SpiralItem[]>(() => {
    const lang = this.i18n.lang();
    return this.recent()
      .map((d) => ({
        imageUrl: d.species.imageUrl ?? null,
        commonName: speciesDisplayName(d.species, lang),
        scientificName: d.species.scientificName,
      }));
  });

  async ngOnInit(): Promise<void> {
    // Calentamiento silencioso del motor de IA (una vez; se repite solo si pasó readyFreshMs).
    this.aiEngine.warmUp();
    // Sin catch, un fallo de las métricas impediría cargar también las
    // detecciones recientes; si fallan, la sección simplemente no se muestra.
    this.user.getStats().then((stats) => this.stats.set(stats)).catch(() => undefined);
    // Una sola petición alimenta el carrusel, la última detección y la franja de actividad.
    this.mine.set(await this.detectionsService.getMineNewestFirst());
  }
}
