import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../services/user.service';

// Lecturas públicas: mismas rutas que PublicEndpoints en el backend (mantenerlas alineadas).
const PUBLIC_READ_PREFIXES = [`${environment.apiBaseUrl}/species`];
const PUBLIC_READ_PATHS = [`${environment.apiBaseUrl}/network-stats`];
const PUBLIC_DETECTIONS_PATH = `${environment.apiBaseUrl}/detections`;
const PUBLIC_VISIBILITY = 'public';

/** Sin token en las lecturas públicas: un token vencido no debe dejar sin datos al mapa ni a la landing. */
function isPublicRead(req: HttpRequest<unknown>): boolean {
  if (req.method !== 'GET') return false;
  const path = req.url.split('?')[0];
  return (
    PUBLIC_READ_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ||
    PUBLIC_READ_PATHS.includes(path) ||
    (path === PUBLIC_DETECTIONS_PATH && req.params.get('visibility') === PUBLIC_VISIBILITY)
  );
}

/** Adjunta el token de Supabase a las peticiones a nuestro backend, salvo a las lecturas públicas. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl) || isPublicRead(req)) {
    return next(req);
  }

  const userService = inject(UserService);
  return from(userService.getAccessToken()).pipe(
    switchMap((token) => {
      const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authedReq);
    })
  );
};
