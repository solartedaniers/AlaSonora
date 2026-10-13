import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { User } from '@supabase/supabase-js';
import { AppUser, ObserverRole, UserStats } from '../models';
import { SUPABASE_SESSION_STORAGE_KEY, SupabaseClientService } from './supabase-client.service';
import { environment } from '../../../environments/environment';

const DEFAULT_ROLE: ObserverRole = 'hobbyist';

/**
 * Estado de sesión sobre Supabase Auth (el SDK maneja entrar, registrarse, salir,
 * recuperar contraseña y refrescar la sesión). Los campos de perfil que no están
 * en user_metadata (institución, avatarUrl, etc.) vienen del Profile del backend.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<AppUser | null>(null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUser.set(this.toAppUser(data.session?.user ?? this.storedSession()?.user ?? null));
    });
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(this.toAppUser(session?.user ?? null));
    });
  }

  /**
   * Leo la sesión local de Supabase directamente y no el signal `currentUser`, que
   * se llena cuando resuelve getSession(); los guards corren antes y, con el signal,
   * sacarían a un usuario con sesión al recargar la página.
   */
  async isAuthenticated(): Promise<boolean> {
    // Modo campo: sin conexión un token vencido no se puede refrescar y getSession()
    // reintentaría ~25 s para luego decir que no hay sesión, mandando al usuario a un
    // /login que no sirve sin señal. Me basta la sesión guardada en el dispositivo; al
    // volver la conexión se refresca como siempre (o falla y pide entrar de nuevo).
    if (!navigator.onLine) return this.storedSession() !== null;
    const { data } = await this.supabase.auth.getSession();
    return data.session !== null;
  }

  /** Token de acceso (JWT) de la sesión actual, si la hay; lo usa authInterceptor. */
  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Igual que {@link isAuthenticated}: leo la sesión directamente y no el signal `currentUser`. */
  async getUserId(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.user.id ?? null;
  }

  // Se envía la zona horaria del navegador para que la racha cuente días
  // del calendario del usuario, no del servidor.
  async getStats(): Promise<UserStats> {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return firstValueFrom(
      this.http.get<UserStats>(`${environment.apiBaseUrl}/detections/mine/stats`, { params: { zone } })
    );
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async register(fullName: string, email: string, password: string, role: ObserverRole): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  /**
   * Copio la edición del Profile del backend a user_metadata de Supabase Auth, así
   * `currentUser` (y quien lo lee, como el avatar del nav-header) queda al día sin
   * una segunda fuente para los mismos campos.
   */
  async syncMetadata(patch: {
    full_name?: string;
    avatar_url?: string;
    institution?: string;
    orcid_id?: string;
    station_name?: string;
  }): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ data: patch });
    if (error) throw error;
  }

  private storedSession(): { user: User } | null {
    try {
      return JSON.parse(localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  private toAppUser(user: User | null): AppUser | null {
    if (!user) return null;
    const metadata = user.user_metadata ?? {};
    return {
      id: user.id,
      fullName: metadata['full_name'] ?? user.email ?? '',
      email: user.email ?? '',
      role: (metadata['role'] as ObserverRole) ?? DEFAULT_ROLE,
      institution: metadata['institution'],
      avatarUrl: metadata['avatar_url'],
      orcidId: metadata['orcid_id'],
      stationName: metadata['station_name'],
    };
  }
}
