import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    title: 'app.tagline',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'routeTitle.login',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'routeTitle.register',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
    title: 'routeTitle.forgotPassword',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
    title: 'routeTitle.resetPassword',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'routeTitle.dashboard',
  },
  {
    path: 'record',
    loadComponent: () =>
      import('./features/recording/recording.component').then((m) => m.RecordingComponent),
    canActivate: [authGuard],
    title: 'routeTitle.record',
  },
  {
    path: 'result/:id',
    loadComponent: () =>
      import('./features/result/result.component').then((m) => m.ResultComponent),
    canActivate: [authGuard],
    title: 'routeTitle.result',
  },
  {
    path: 'photo-id',
    loadComponent: () =>
      import('./features/photo-id/photo-id.component').then((m) => m.PhotoIdComponent),
    canActivate: [authGuard],
    title: 'routeTitle.photoId',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
    canActivate: [authGuard],
    title: 'routeTitle.history',
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
    title: 'routeTitle.map',
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    title: 'routeTitle.profile',
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
    title: 'routeTitle.admin',
  },
  { path: '**', redirectTo: '' },
];
