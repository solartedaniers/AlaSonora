import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { LiveSyncService } from '../../core/services/live-sync.service';
import { Detection } from '../../core/models';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [DatePipe, NavHeaderComponent, ConfidenceBadgeComponent, TranslatePipe],
  templateUrl: './map.component.html',
})
export class MapComponent implements OnInit {
  private readonly detectionsService = inject(DetectionsService);
  readonly liveSync = inject(LiveSyncService);

  readonly feed = signal<Detection[]>([]);
  readonly threatenedOnly = signal(false);
  readonly heatmapLayer = signal(true);
  readonly selected = signal<Detection | null>(null);

  async ngOnInit(): Promise<void> {
    const all = await this.detectionsService.getAll();
    this.feed.set(all);
    this.selected.set(all[0] ?? null);
  }

  select(d: Detection): void {
    this.selected.set(d);
  }

  markerOffset(index: number): { top: string; left: string } {
    // Distribución determinista y estable en el "mapa" (imagen de fondo
    // estática) a partir del índice, para no depender de un proveedor de
    // mapas real todavía.
    const top = 20 + ((index * 137) % 60);
    const left = 15 + ((index * 211) % 70);
    return { top: `${top}%`, left: `${left}%` };
  }
}
