import { Injectable, inject } from '@angular/core';
import { Detection } from '../models';
import { SpeciesCatalogService } from './species-catalog.service';

/**
 * Fuente de detecciones del cuaderno de campo. Implementación mock: genera
 * datos de ejemplo con la misma forma que devolverá `GET /api/detections`
 * en la fase de backend. Cualquier componente que dependa de esta interfaz
 * (dashboard, historial, mapa, resultado) seguirá funcionando sin cambios
 * cuando se sustituya por un HttpClient real.
 */
@Injectable({ providedIn: 'root' })
export class DetectionsService {
  private readonly catalog = inject(SpeciesCatalogService);
  private cache: Detection[] | null = null;

  async getAll(): Promise<Detection[]> {
    if (this.cache) return this.cache;
    const species = await this.catalog.getAll();
    const [chiguanco, colibri, chucao, chara, quetzal, harpia, gallito, tangara] = species;

    this.cache = [
      {
        id: 'det-001',
        recordedAt: '2025-05-14T05:44:00-05:00',
        durationSeconds: 8,
        species: chiguanco,
        confidence: 98.4,
        peakFrequencyHz: 3800,
        alternatives: [
          { species: chucao, confidence: 1.2 },
          { species: gallito, confidence: 0.4 },
        ],
        location: {
          latitude: -13.1631,
          longitude: -72.545,
          altitudeMeters: 2430,
          placeName: 'Valle Sagrado, Cusco, Perú',
        },
        observerName: 'Dra. Elena Valenzuela',
        fieldNotes:
          'Canto escuchado en estrato medio, individuo solitario, respuesta territorial positiva.',
        syncStatus: 'synced',
      },
      {
        id: 'det-002',
        recordedAt: '2025-05-13T18:42:00-05:00',
        durationSeconds: 12,
        species: colibri,
        confidence: 94.7,
        peakFrequencyHz: 8200,
        alternatives: [],
        location: {
          latitude: 4.7261,
          longitude: -74.0751,
          altitudeMeters: 3150,
          placeName: 'Parque Nacional Chingaza',
        },
        observerName: 'Dra. Elena Valenzuela',
        syncStatus: 'pending-sync',
      },
      {
        id: 'det-003',
        recordedAt: '2025-05-12T11:15:00-05:00',
        durationSeconds: 4,
        species: chara,
        confidence: 96.2,
        peakFrequencyHz: 5800,
        alternatives: [],
        location: {
          latitude: -12.871,
          longitude: -71.411,
          placeName: 'Manu, Estación Pakitza',
        },
        observerName: 'Investigador R. Torres',
        syncStatus: 'synced',
      },
      {
        id: 'det-004',
        recordedAt: '2025-05-11T06:12:00-05:00',
        durationSeconds: 12,
        species: quetzal,
        confidence: 98.2,
        peakFrequencyHz: 2600,
        alternatives: [],
        location: {
          latitude: -12.86,
          longitude: -71.34,
          placeName: 'Estación San Pedro, P.N. Manu',
        },
        observerName: 'Guardaparques M. Condori',
        syncStatus: 'synced',
      },
      {
        id: 'det-005',
        recordedAt: '2025-05-10T21:04:00-05:00',
        durationSeconds: 45,
        species: harpia,
        confidence: 89.3,
        peakFrequencyHz: 1900,
        alternatives: [],
        location: {
          latitude: -3.72,
          longitude: -73.25,
          placeName: 'Torre Mirador 2, Canopi',
        },
        observerName: 'Guardaparque Marco Condori',
        syncStatus: 'needs-review',
      },
      {
        id: 'det-006',
        recordedAt: '2025-05-09T05:12:00-05:00',
        durationSeconds: 24,
        species: gallito,
        confidence: 91.4,
        peakFrequencyHz: 4400,
        alternatives: [],
        location: {
          latitude: -12.9,
          longitude: -71.38,
          placeName: 'Lek Bosque de Nubes',
        },
        observerName: 'Nodo Pasivo #04-Lek',
        syncStatus: 'synced',
      },
      {
        id: 'det-007',
        recordedAt: '2025-05-08T05:42:00-05:00',
        durationSeconds: 6,
        species: tangara,
        confidence: 96.2,
        peakFrequencyHz: 6800,
        alternatives: [],
        location: {
          latitude: 4.61,
          longitude: -74.08,
          placeName: 'Bogotá, Colombia',
        },
        observerName: 'Dra. M. Arboleda',
        syncStatus: 'synced',
      },
    ];

    return this.cache;
  }

  async getById(id: string): Promise<Detection | undefined> {
    const all = await this.getAll();
    return all.find((d) => d.id === id);
  }

  async getRecent(limit = 5): Promise<Detection[]> {
    const all = await this.getAll();
    return [...all]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, limit);
  }
}
