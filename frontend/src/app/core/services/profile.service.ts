import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ObserverRole, Profile } from '../models';
import { SupabaseClientService } from './supabase-client.service';

const AVATAR_BUCKET = 'avatars';

/** Shape returned/expected by the backend, whose ObserverRole enum is uppercase (ORNITHOLOGIST, ...). */
interface BackendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  institution: string | null;
  orcidId: string | null;
  stationName: string | null;
}

export interface ProfileUpdate {
  displayName: string;
  role: ObserverRole;
  avatarUrl?: string;
  institution?: string;
  orcidId?: string;
  stationName?: string;
}

/** Editable profile against GET/PUT /api/profile/me, plus direct avatar uploads to Supabase Storage. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;

  async getMine(): Promise<Profile> {
    const dto = await firstValueFrom(this.http.get<BackendProfile>(`${environment.apiBaseUrl}/profile/me`));
    return this.fromBackend(dto);
  }

  async update(patch: ProfileUpdate): Promise<Profile> {
    const dto = await firstValueFrom(
      this.http.put<BackendProfile>(`${environment.apiBaseUrl}/profile/me`, {
        displayName: patch.displayName,
        avatarUrl: patch.avatarUrl ?? null,
        role: patch.role.toUpperCase(),
        institution: patch.institution ?? null,
        orcidId: patch.orcidId ?? null,
        stationName: patch.stationName ?? null,
      })
    );
    return this.fromBackend(dto);
  }

  /** Uploads directly to the public `avatars` bucket and returns the resulting public URL. */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await this.supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    return this.supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
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
    };
  }
}
