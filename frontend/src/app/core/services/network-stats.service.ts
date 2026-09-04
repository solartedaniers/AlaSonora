import { Injectable } from '@angular/core';
import { NetworkStats } from '../models';

/** Estadísticas globales mock para el landing y el mapa público. */
@Injectable({ providedIn: 'root' })
export class NetworkStatsService {
  async get(): Promise<NetworkStats> {
    return {
      recordingsToday: 18450,
      recordingsTodayDeltaPct: 14,
      catalogedSpecies: 482,
      activeObservers: 1240,
      countriesCount: 14,
      validatedAccuracyPct: 99.1,
      activeNodes: 92,
      threatenedSpeciesFlags: 34,
    };
  }
}
