import { Injectable, signal } from '@angular/core';
import { AppUser, UserStats } from '../models';

/**
 * Sesión del usuario actual. Mock: mantiene un usuario "logueado" en memoria
 * con un signal, para que dashboard/perfil/nav puedan reaccionar a cambios
 * (ej. tras un login simulado) sin acoplarse a cómo se obtiene ese dato.
 * En la fase de backend, este servicio pasará a delegar en un AuthService
 * real basado en Supabase Auth + interceptor de token.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly currentUser = signal<AppUser>({
    id: 'user-001',
    fullName: 'Dra. Elena Valenzuela',
    email: 'elena.valenzuela@biota.org',
    role: 'biologist',
    institution: 'Instituto de Investigaciones Neotropicales',
    avatarUrl: 'assets/avatars/elena-valenzuela.jpg',
    orcidId: '0000-0002-1825-0097',
    stationName: 'Reserva Biológica Chocó · Estación 4B',
  });

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

  login(email: string, _password: string): Promise<AppUser> {
    // Simulación: en la fase de backend esto llamará a Supabase Auth.
    return Promise.resolve({ ...this.currentUser(), email });
  }

  register(fullName: string, email: string, role: AppUser['role']): Promise<AppUser> {
    const user: AppUser = { ...this.currentUser(), fullName, email, role };
    this.currentUser.set(user);
    return Promise.resolve(user);
  }
}
