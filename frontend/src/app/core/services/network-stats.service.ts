import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NetworkStats } from '../models';

/** Estadísticas globales contra GET /api/network-stats del backend (público, sin auth). */
@Injectable({ providedIn: 'root' })
export class NetworkStatsService {
  private readonly http = inject(HttpClient);

  async get(): Promise<NetworkStats> {
    return firstValueFrom(this.http.get<NetworkStats>(`${environment.apiBaseUrl}/network-stats`));
  }
}
