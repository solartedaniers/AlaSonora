import { Routes } from '@angular/router';

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
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'AlaSonora — Dashboard',
  },
  {
    path: 'record',
    loadComponent: () =>
      import('./features/recording/recording.component').then((m) => m.RecordingComponent),
    title: 'AlaSonora — Grabar',
  },
  {
    path: 'result/:id',
    loadComponent: () =>
      import('./features/result/result.component').then((m) => m.ResultComponent),
    title: 'AlaSonora — Resultado',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
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
    title: 'AlaSonora — Mi Perfil',
  },
  { path: '**', redirectTo: '' },
];
