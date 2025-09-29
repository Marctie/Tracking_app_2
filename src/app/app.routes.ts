import { Routes } from '@angular/router';
import { ErrorPage } from './features/error-page';
import { authGuard } from './features/auth/auth-guard';

export const routes: Routes = [
  {
    path: 'landing-page',
    loadComponent: () => import('./features/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/user-login').then((m) => m.Login),
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./features/vehicles/dashboard').then((m) => m.Dashboard),
    canActivate:[authGuard]
  },
  {
    path: 'localize',
    loadComponent: () => import('./features/vehicles/localize').then((m) => m.Localize),
    canActivate:[authGuard]
  },

  {
    path: '',
    redirectTo: 'landing-page',
    pathMatch: 'full',
  },
    { path: '**', component: ErrorPage },
];
