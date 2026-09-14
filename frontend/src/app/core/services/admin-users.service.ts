import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ObserverRole, Profile, SystemRole } from '../models';

/** Shape returned/expected by the backend for admin user-management endpoints. */
interface BackendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  institution: string | null;
  orcidId: string | null;
  stationName: string | null;
  systemRole: string;
  suspended: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface UpdateUserRequest {
  displayName: string;
  role: ObserverRole;
  institution?: string;
  orcidId?: string;
  stationName?: string;
}

/** Panel de administración: alta, edición, suspensión y cambio de rol de usuarios (GET/POST/PUT /api/admin/users). */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  async list(): Promise<Profile[]> {
    const users = await firstValueFrom(this.http.get<BackendProfile[]>(this.baseUrl));
    return users.map((u) => this.fromBackend(u));
  }

  async create(request: CreateUserRequest): Promise<Profile> {
    const created = await firstValueFrom(this.http.post<BackendProfile>(this.baseUrl, request));
    return this.fromBackend(created);
  }

  async update(id: string, request: UpdateUserRequest): Promise<Profile> {
    const updated = await firstValueFrom(
      this.http.put<BackendProfile>(`${this.baseUrl}/${id}`, {
        displayName: request.displayName,
        avatarUrl: null,
        role: request.role.toUpperCase(),
        institution: request.institution ?? null,
        orcidId: request.orcidId ?? null,
        stationName: request.stationName ?? null,
      })
    );
    return this.fromBackend(updated);
  }

  async setSystemRole(id: string, systemRole: SystemRole): Promise<Profile> {
    const updated = await firstValueFrom(
      this.http.put<BackendProfile>(`${this.baseUrl}/${id}/role`, { systemRole: systemRole.toUpperCase() })
    );
    return this.fromBackend(updated);
  }

  async suspend(id: string): Promise<Profile> {
    const updated = await firstValueFrom(this.http.put<BackendProfile>(`${this.baseUrl}/${id}/suspend`, {}));
    return this.fromBackend(updated);
  }

  async activate(id: string): Promise<Profile> {
    const updated = await firstValueFrom(this.http.put<BackendProfile>(`${this.baseUrl}/${id}/activate`, {}));
    return this.fromBackend(updated);
  }

  private fromBackend(dto: BackendProfile): Profile {
    return {
      id: dto.id,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl ?? undefined,
      role: dto.role.toLowerCase() as ObserverRole,
      institution: dto.institution ?? undefined,
      orcidId: dto.orcidId ?? undefined,
      stationName: dto.stationName ?? undefined,
      systemRole: dto.systemRole.toLowerCase() as SystemRole,
      suspended: dto.suspended,
    };
  }
}
