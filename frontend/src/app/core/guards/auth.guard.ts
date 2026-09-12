import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

/** Blocks protected routes when there is no active Supabase session. */
export const authGuard: CanActivateFn = async () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (await userService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
