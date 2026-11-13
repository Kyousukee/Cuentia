import { Category } from './models';

export const SEED_CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', emoji: '🍔', color: 2, kind: 'expense', order: 0 },
  { id: 'super', name: 'Súper', emoji: '🛒', color: 8, kind: 'expense', order: 1 },
  { id: 'transporte', name: 'Transporte', emoji: '🚌', color: 3, kind: 'expense', order: 2 },
  { id: 'hogar', name: 'Hogar', emoji: '🏠', color: 1, kind: 'expense', order: 3 },
  { id: 'servicios', name: 'Cuentas', emoji: '💡', color: 5, kind: 'expense', order: 4 },
  { id: 'ocio', name: 'Ocio', emoji: '🎉', color: 6, kind: 'expense', order: 5 },
  { id: 'salud', name: 'Salud', emoji: '💊', color: 4, kind: 'expense', order: 6 },
  { id: 'cuotas', name: 'Cuotas', emoji: '💳', color: 4, kind: 'expense', order: 7 },
  { id: 'creditos', name: 'Créditos', emoji: '🏦', color: 6, kind: 'expense', order: 8 },
  { id: 'otros-g', name: 'Otros', emoji: '📦', color: 7, kind: 'expense', order: 9 },
  { id: 'sueldo', name: 'Sueldo', emoji: '💼', color: 1, kind: 'income', order: 0 },
  { id: 'extra', name: 'Pega extra', emoji: '⚡', color: 3, kind: 'income', order: 1 },
  { id: 'regalo', name: 'Regalos', emoji: '🎁', color: 4, kind: 'income', order: 2 },
  { id: 'otros-i', name: 'Otros', emoji: '✨', color: 8, kind: 'income', order: 3 },
];
