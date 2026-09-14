import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ProfileService } from '../services/profile.service';

/** Blocks /admin for anyone without an active session and systemRole 'admin'. */
export const adminGuard: CanActivateFn = async () => {
  const userService = inject(UserService);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  if (!(await userService.isAuthenticated())) {
    return router.createUrlTree(['/login']);
  }

  try {
    const profile = await profileService.getMine();
    return profile.systemRole === 'admin' ? true : router.createUrlTree(['/dashboard']);
  } catch (error) {
    // Un getMine() rechazado sin capturar dejaba la promesa de la guardia
    // colgada (Angular Router la trata como navegación cancelada, sin
    // redirigir ni mostrar nada) en vez de degradar de forma visible.
    console.error('adminGuard: no se pudo verificar el rol de administrador', error);
    return router.createUrlTree(['/dashboard']);
  }
};
