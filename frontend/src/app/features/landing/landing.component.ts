import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LangToggleComponent } from '../../shared/components/lang-toggle/lang-toggle.component';
import { NetworkStatsService } from '../../core/services/network-stats.service';
import { NetworkStats } from '../../core/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DecimalPipe, TranslatePipe, ThemeToggleComponent, LangToggleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit {
  private readonly statsService = inject(NetworkStatsService);
  readonly stats = signal<NetworkStats | null>(null);

  async ngOnInit(): Promise<void> {
    this.stats.set(await this.statsService.get());
  }
}
