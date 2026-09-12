import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { AppUser, ObserverRole, UserStats } from '../models';
import { SupabaseClientService } from './supabase-client.service';

const DEFAULT_ROLE: ObserverRole = 'hobbyist';

/**
 * Session state backed by Supabase Auth directly (sign in/up/out, password
 * reset, session refresh all handled by the SDK). Profile fields beyond
 * what Supabase Auth stores in user_metadata (institution, avatarUrl, etc.)
 * are filled in from our backend's Profile once that integration lands.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly supabase = inject(SupabaseClientService).client;

  readonly currentUser = signal<AppUser | null>(null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUser.set(this.toAppUser(data.session?.user ?? null));
    });
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(this.toAppUser(session?.user ?? null));
    });
  }

  /**
   * Reads Supabase's local session directly instead of the `currentUser`
   * signal, which is only populated once the initial getSession() promise
   * resolves — route guards run before that, so relying on the signal here
   * would bounce a logged-in user on a hard refresh.
   */
  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return data.session !== null;
  }

  /** Supabase access token (JWT) for the current session, if any — used by authInterceptor. */
  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Same rationale as {@link isAuthenticated}: reads the session directly instead of the `currentUser` signal. */
  async getUserId(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async getStats(): Promise<UserStats> {
    return {
      totalRecordings: 412,
      validatedRecordings: 384,
      pendingSyncRecordings: 8,
      distinctSpecies: 148,
      averageConfidence: 98.4,
      activeStreakDays: 18,
    };
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
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  /**
   * Mirrors a backend Profile edit into Supabase Auth's user_metadata, so
   * `currentUser` (and anything reading it, like nav-header's avatar) stays
   * in sync without a second data source for the same display fields.
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
