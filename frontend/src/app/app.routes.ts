import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    title: 'AlaSonora — Bioacústica & IA',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'AlaSonora — Iniciar Sesión',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'AlaSonora — Crear Cuenta',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
    title: 'AlaSonora — Recuperar Contraseña',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
    title: 'AlaSonora — Nueva Contraseña',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'AlaSonora — Dashboard',
  },
  {
    path: 'record',
    loadComponent: () =>
      import('./features/recording/recording.component').then((m) => m.RecordingComponent),
    canActivate: [authGuard],
    title: 'AlaSonora — Grabar',
  },
  {
    path: 'result/:id',
    loadComponent: () =>
      import('./features/result/result.component').then((m) => m.ResultComponent),
    canActivate: [authGuard],
    title: 'AlaSonora — Resultado',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
    canActivate: [authGuard],
    title: 'AlaSonora — Mi Historial',
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
    title: 'AlaSonora — Mapa Público',
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    title: 'AlaSonora — Mi Perfil',
  },
  { path: '**', redirectTo: '' },
];
