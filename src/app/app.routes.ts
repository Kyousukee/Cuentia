import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Cuentia', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'movimientos',
    title: 'Historial · Cuentia',
    loadComponent: () => import('./features/transactions/transactions').then((m) => m.Transactions),
  },
  {
    path: 'presupuestos',
    title: 'Presupuestos · Cuentia',
    loadComponent: () => import('./features/budgets/budgets').then((m) => m.Budgets),
  },
  {
    path: 'resumen',
    title: 'Resumen · Cuentia',
    loadComponent: () => import('./features/summary/summary').then((m) => m.Summary),
  },
  { path: 'metas', title: 'Metas · Cuentia', loadComponent: () => import('./features/goals/goals').then((m) => m.Goals) },
  {
    path: 'ajustes',
    title: 'Ajustes · Cuentia',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '**', redirectTo: '' },
];
