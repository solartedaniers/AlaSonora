import { Injectable, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ObserverRole, Profile } from '../models';
import { SupabaseClientService } from './supabase-client.service';
import { UserService } from './user.service';

const AVATAR_BUCKET = 'avatars';

/** Forma que devuelve y espera el backend; sus enums ObserverRole/SystemRole van en mayúsculas. */
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

export interface ProfileUpdate {
  displayName: string;
  role: ObserverRole;
  avatarUrl?: string;
  institution?: string;
  orcidId?: string;
  stationName?: string;
}

/** Perfil editable con GET/PUT /api/profile/me, más la subida directa del avatar a Supabase Storage. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly user = inject(UserService);
  /** Perfil de la sesión actual; la clave es el id del usuario para no servir nunca el de otro. */
  private cached: { userId: string; profile: Promise<Profile> } | null = null;

  constructor() {
    // Al cerrar sesión o entrar con otra cuenta descarto el perfil guardado.
    effect(() => {
      const userId = this.user.currentUser()?.id ?? null;
      if (this.cached?.userId !== userId) this.cached = null;
    });
  }

  getMine(): Promise<Profile> {
    const userId = this.user.currentUser()?.id;
    if (!userId) return this.fetchMine();
    if (this.cached?.userId !== userId) {
      const profile = this.fetchMine();
      this.cached = { userId, profile };
      // Un fallo no se queda en caché: la próxima lectura vuelve a intentar.
      profile.catch(() => {
        if (this.cached?.profile === profile) this.cached = null;
      });
    }
    return this.cached.profile;
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
    const profile = this.fromBackend(dto);
    this.cached = { userId: profile.id, profile: Promise.resolve(profile) };
    return profile;
  }

  /** Subo directo al bucket público `avatars` y devuelvo la URL pública. */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await this.supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    return this.supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  private async fetchMine(): Promise<Profile> {
    const dto = await firstValueFrom(this.http.get<BackendProfile>(`${environment.apiBaseUrl}/profile/me`));
    return this.fromBackend(dto);
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
      systemRole: dto.systemRole.toLowerCase() as Profile['systemRole'],
      suspended: dto.suspended,
    };
  }
}
