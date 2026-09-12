import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Species } from '../models';

/** Catálogo de especies contra GET /api/species del backend. */
@Injectable({ providedIn: 'root' })
export class SpeciesCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/species`;

  async getAll(): Promise<Species[]> {
    return firstValueFrom(this.http.get<Species[]>(this.baseUrl));
  }

  async getById(id: string): Promise<Species | undefined> {
    try {
      return await firstValueFrom(this.http.get<Species>(`${this.baseUrl}/${id}`));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return undefined;
      throw err;
    }
  }

  // Sin endpoint de búsqueda dedicado en el backend: filtramos en cliente
  // sobre el catálogo completo (es pequeño, no amerita paginación aún).
  async search(query: string): Promise<Species[]> {
    const all = await this.getAll();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.commonName.toLowerCase().includes(q) ||
        s.commonNameEn.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.family.toLowerCase().includes(q)
    );
  }
}
