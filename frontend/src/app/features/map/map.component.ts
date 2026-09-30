import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
// Solo tipos: Leaflet toca `window` apenas se importa, así que el módulo
// real se carga con import() dinámico y únicamente en el navegador (esta
// ruta se renderiza en el servidor con SSR).
import type * as Leaflet from 'leaflet';
import { NavHeaderComponent } from '../../shared/components/nav-header/nav-header.component';
import { ConfidenceBadgeComponent } from '../../shared/components/confidence-badge/confidence-badge.component';
import { SoftAuroraComponent } from '../../shared/components/soft-aurora/soft-aurora.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { DetectionsService } from '../../core/services/detections.service';
import { LiveSyncService } from '../../core/services/live-sync.service';
import { Detection } from '../../core/models';

// Vista inicial antes de tener detecciones reales que encuadrar: Colombia
// continental (mismo fallback de campo usado en el flujo de grabación).
const DEFAULT_CENTER: Leaflet.LatLngExpression = [4.6097, -74.0817];
const DEFAULT_ZOOM = 5;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NavHeaderComponent, ConfidenceBadgeComponent, SoftAuroraComponent, TranslatePipe, SpeciesNamePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './map.component.html',
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly detectionsService = inject(DetectionsService);
  readonly liveSync = inject(LiveSyncService);

  @ViewChild('mapContainer', { static: true }) private readonly mapContainerRef!: ElementRef<HTMLDivElement>;

  readonly feed = signal<Detection[]>([]);
  readonly threatenedOnly = signal(false);
  readonly heatmapLayer = signal(true);
  readonly selected = signal<Detection | null>(null);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private leaflet?: typeof Leaflet;
  private map?: Leaflet.Map;
  private markersLayer?: Leaflet.LayerGroup;
  private destroyed = false;

  constructor() {
    // Redibuja los pines cada vez que cambia el feed, incluida la primera
    // carga (ngOnInit resuelve la promesa antes o después de ngAfterViewInit
    // según la latencia de red, así que no se puede asumir un orden fijo).
    effect(() => {
      const detections = this.feed();
      if (this.map) this.renderMarkers(detections);
    });
  }

  async ngOnInit(): Promise<void> {
    const all = await this.detectionsService.getAll();
    this.feed.set(all);
    this.selected.set(all[0] ?? null);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;
    // Leaflet es CommonJS: al importarlo dinámicamente el bundler entrega el
    // módulo dentro de `default` (con el import estático eso era transparente).
    const leafletModule = await import('leaflet');
    const L = ((leafletModule as { default?: typeof Leaflet }).default ?? leafletModule) as typeof Leaflet;
    if (this.destroyed) return; // se salió de /map antes de que terminara de cargar Leaflet
    this.leaflet = L;

    // Los íconos por defecto de Leaflet referencian imágenes vía CSS
    // relativo, que el bundler de Angular no resuelve; se sirven en su
    // lugar desde public/images/leaflet (mismos nombres de archivo que
    // Leaflet espera).
    L.Icon.Default.mergeOptions({
      imagePath: '/images/leaflet/',
    });

    this.map = L.map(this.mapContainerRef.nativeElement, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers(this.feed());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
  }

  select(d: Detection): void {
    this.selected.set(d);
  }

  /**
   * Pines en Detection.location: dónde el observador grabó/subió el audio,
   * nunca una ubicación inferida de la especie.
   */
  private renderMarkers(detections: Detection[]): void {
    const L = this.leaflet;
    const layer = this.markersLayer;
    if (!L || !layer) return;
    layer.clearLayers();
    const points: Leaflet.LatLngTuple[] = detections.map((d) => [d.location.latitude, d.location.longitude]);

    points.forEach((point, index) => {
      const detection = detections[index];
      L.marker(point)
        .addTo(layer)
        .on('click', () => this.select(detection));
    });

    if (points.length > 0) {
      this.map!.fitBounds(L.latLngBounds(points), { maxZoom: 12, padding: [40, 40] });
    }
  }
}
