import { Injectable, effect, inject, signal } from '@angular/core';
import { UserService } from './user.service';
import { ProfileService } from './profile.service';

/** Expone si la sesión activa tiene systemRole 'admin', reactivo a login/logout, para condicionar la UI (p. ej. el link de navegación). */
@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  private readonly user = inject(UserService);
  private readonly profileService = inject(ProfileService);

  readonly isAdmin = signal(false);

  constructor() {
    effect(() => {
      if (!this.user.currentUser()) {
        this.isAdmin.set(false);
        return;
      }
      // Sin este catch, un fallo en GET /api/profile/me (401 transitorio, fila
      // sin permisos, etc.) dejaba isAdmin en false de forma silenciosa, sin
      // rastro en consola para diagnosticar por qué no aparecía el panel.
      this.profileService
        .getMine()
        .then((profile) => this.isAdmin.set(profile.systemRole === 'admin'))
        .catch((error) => {
          console.error('AdminAccessService: no se pudo resolver el perfil para verificar el rol de administrador', error);
          this.isAdmin.set(false);
        });
    });
  }
}
