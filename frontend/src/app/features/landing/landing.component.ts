import { Component, OnInit, OnDestroy, computed, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { SiteFooterComponent } from '../../shared/components/site-footer/site-footer.component';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { SongSonogramComponent } from '../../shared/components/song-sonogram/song-sonogram.component';
import { SpectrogramWaterfallComponent } from '../../shared/components/spectrogram-waterfall/spectrogram-waterfall.component';
import { SyntheticSongSignal } from '../../shared/sonogram/synthetic-song-signal';
import { PHRASE_MAX_KHZ } from '../../shared/sonogram/song-phrase';
import { NetworkStatsService } from '../../core/services/network-stats.service';
import { ViewportService } from '../../core/services/viewport.service';
import { NetworkStats } from '../../core/models';

interface NetworkReading {
  labelKey: string;
  /** null mientras llegan los datos vivos: el servidor envía las etiquetas sin cifras. */
  value: number | null;
  suffixKey?: string;
}

// Cascada del hero: 64 filas a 20 por segundo = la frase completa (3.2 s) en pantalla.
const HERO_ROWS = 64;
const HERO_ROWS_PER_SECOND = 20;
const PIPELINE_COLUMNS = 96;
const PIPELINE_STEP_COUNT = 4;
const PIPELINE_INTERVAL_MS = 3200;
const FREQ_STEP_KHZ = 2;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslatePipe, NavHeaderComponent, SiteFooterComponent, CountUpComponent, SpectrogramViewComponent, SongSonogramComponent, SpectrogramWaterfallComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly statsService = inject(NetworkStatsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  readonly viewport = inject(ViewportService);

  readonly stats = signal<NetworkStats | null>(null);
  readonly readings = computed<NetworkReading[]>(() => {
    const s = this.stats();
    return [
      { labelKey: 'landing.stats.totalDetections', value: s?.totalPublicDetections ?? null },
      { labelKey: 'landing.stats.species', value: s?.totalSpecies ?? null },
      { labelKey: 'landing.stats.observers', value: s?.distinctObservers ?? null },
      { labelKey: 'landing.stats.accuracy', value: s?.averageConfidencePct ?? null, suffixKey: 'units.percent' },
    ];
  });

  // Hero: el espectrograma real de la app, alimentado con la frase sintética.
  private readonly heroSignal = new SyntheticSongSignal(HERO_ROWS_PER_SECOND);
  readonly heroRows = HERO_ROWS;
  readonly heroInitialRows = this.heroSignal.backfill(HERO_ROWS);
  readonly heroFrame = () => this.heroSignal.nextFrame();
  readonly maxKhz = PHRASE_MAX_KHZ;
  readonly freqStepKhz = FREQ_STEP_KHZ;
  readonly windowSeconds = Math.floor(HERO_ROWS / HERO_ROWS_PER_SECOND);

  readonly howSteps = [
    { titleKey: 'landing.how.step1Title', bodyKey: 'landing.how.step1Body' },
    { titleKey: 'landing.how.step2Title', bodyKey: 'landing.how.step2Body' },
    { titleKey: 'landing.how.step3Title', bodyKey: 'landing.how.step3Body' },
  ];

  // Recorrido "Cómo AlaSonora escucha": 0 Grabación, 1 Espectrograma, 2 Red neuronal, 3 Resultado.
  readonly pipelineStep = signal(0);
  readonly pipelineSteps = Array.from({ length: PIPELINE_STEP_COUNT }, (_, i) => i);
  private readonly pipelineSignal = new SyntheticSongSignal();
  readonly pipelineColumns = PIPELINE_COLUMNS;
  readonly pipelineInitialColumns = this.pipelineSignal.backfill(PIPELINE_COLUMNS);
  readonly pipelineFrame = () => (this.pipelineStep() === 1 ? this.pipelineSignal.nextFrame() : null);
  readonly waveformLevels = [30, 55, 80, 45, 95, 60, 35, 70, 50, 85, 40, 65];
  readonly networkLayers = [3, 5, 5, 3].map((size) => Array.from({ length: size }, (_, i) => i));
  readonly resultAnatomy = [
    { labelKey: 'landing.pipeline.anatomy.species', width: 72 },
    { labelKey: 'landing.pipeline.anatomy.scientificName', width: 56 },
    { labelKey: 'landing.pipeline.anatomy.confidence', width: 88 },
    { labelKey: 'landing.pipeline.anatomy.candidates', width: 44 },
  ];
  private pipelineIntervalId?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    // Esta página se prerenderiza en build (SSG): las estadísticas son datos
    // vivos, así que se piden solo en el navegador (si no, quedarían
    // congeladas con los números del momento del build) y el setInterval
    // nunca debe correr en el servidor (la app no llegaría a quedar estable
    // y el prerender se colgaría).
    if (!this.isBrowser) return;
    this.stats.set(await this.statsService.get());
    this.pipelineIntervalId = setInterval(() => {
      this.pipelineStep.set((this.pipelineStep() + 1) % PIPELINE_STEP_COUNT);
    }, PIPELINE_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pipelineIntervalId) clearInterval(this.pipelineIntervalId);
  }

  stepNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** Flechas arriba/abajo recorren las pestañas (patrón ARIA de tablist vertical). */
  moveTab(delta: number, event: Event): void {
    event.preventDefault();
    const next = (this.pipelineStep() + delta + PIPELINE_STEP_COUNT) % PIPELINE_STEP_COUNT;
    this.pipelineStep.set(next);
    this.document.getElementById(`pipeline-tab-${next}`)?.focus();
  }
}
