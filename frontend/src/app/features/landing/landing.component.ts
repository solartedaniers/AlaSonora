import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { CountUpComponent } from '../../shared/components/count-up/count-up.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { SpectrogramViewComponent } from '../../shared/components/spectrogram-view/spectrogram-view.component';
import { PointerGlowDirective } from '../../shared/directives/pointer-glow.directive';
import { SpotlightCarouselDirective } from '../../shared/directives/spotlight-carousel.directive';
import { NetworkStatsService } from '../../core/services/network-stats.service';
import { NetworkStats } from '../../core/models';
import { SpectrogramFrame } from '../../core/services/audio-capture.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ThemeToggleComponent,
    LangToggleComponent,
    SoftAuroraComponent,
    CountUpComponent,
    ConfidenceBadgeComponent,
    SpectrogramViewComponent,
    PointerGlowDirective,
    SpotlightCarouselDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly statsService = inject(NetworkStatsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly stats = signal<NetworkStats | null>(null);

  // Recorrido animado de la sección "Cómo AlaSonora escucha e identifica":
  // 0 Grabación, 1 Espectrograma, 2 Red Neuronal, 3 Resultado.
  readonly pipelineStep = signal(0);
  readonly pipelineSteps = [0, 1, 2, 3];
  private pipelineIntervalId?: ReturnType<typeof setInterval>;
  private pipelineFrameTick = 0;

  /**
   * Alimenta el mismo `SpectrogramViewComponent` usado en grabación real,
   * pero con una señal sintética (no hay micrófono en la landing): un
   * "bulto" de energía que se desplaza en frecuencia, suficiente para que
   * el visualizador dibuje un espectrograma con aspecto de canto real.
   */
  readonly getPipelineFrame = (): SpectrogramFrame | null => {
    if (this.pipelineStep() !== 1) return null;
    this.pipelineFrameTick++;
    const bins = 32;
    const magnitudes = new Float32Array(bins);
    const t = this.pipelineFrameTick * 0.08;
    const center = bins * 0.55 + Math.sin(t) * 5;
    for (let i = 0; i < bins; i++) {
      const band = Math.exp(-((i - center) ** 2) / 8);
      magnitudes[i] = band * (0.5 + 0.5 * Math.sin(t * 3 + i));
    }
    return { magnitudes, peakFrequencyHz: 3200, rmsDb: -18 };
  };

  async ngOnInit(): Promise<void> {
    // Esta página se prerenderiza en build (SSG): las estadísticas son datos
    // vivos, así que se piden solo en el navegador (si no, quedarían
    // congeladas con los números del momento del build) y el setInterval
    // nunca debe correr en el servidor (la app no llegaría a quedar estable
    // y el prerender se colgaría).
    if (!this.isBrowser) return;
    this.stats.set(await this.statsService.get());
    this.pipelineIntervalId = setInterval(() => {
      this.pipelineStep.set((this.pipelineStep() + 1) % 4);
    }, 3200);
  }

  ngOnDestroy(): void {
    if (this.pipelineIntervalId) clearInterval(this.pipelineIntervalId);
  }
}
