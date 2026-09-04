/** Estadísticas globales de la red bioacústica, mostradas en el landing y el mapa público. */
export interface NetworkStats {
  recordingsToday: number;
  recordingsTodayDeltaPct: number;
  catalogedSpecies: number;
  activeObservers: number;
  countriesCount: number;
  validatedAccuracyPct: number;
  activeNodes: number;
  threatenedSpeciesFlags: number;
}
