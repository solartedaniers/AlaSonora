import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UserService } from '../../core/services/user.service';
import { DetectionsService } from '../../core/services/detections.service';
import { Detection, UserStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NavHeaderComponent, OfflineBannerComponent, ConfidenceBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly user = inject(UserService);
  private readonly detectionsService = inject(DetectionsService);

  readonly stats = signal<UserStats | null>(null);
  readonly latest = signal<Detection | null>(null);
  readonly recent = signal<Detection[]>([]);

  async ngOnInit(): Promise<void> {
    this.stats.set(await this.user.getStats());
    const recent = await this.detectionsService.getRecent(5);
    this.recent.set(recent);
    this.latest.set(recent[0] ?? null);
  }
}
