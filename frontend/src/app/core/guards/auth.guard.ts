import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

/** Bloqueo las rutas protegidas cuando no hay sesión activa de Supabase. */
export const authGuard: CanActivateFn = async () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (await userService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
