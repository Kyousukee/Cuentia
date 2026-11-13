export type TxKind = 'expense' | 'income';

/** Ranura de color de la paleta validada (1–8 → `--cat-N`). */
export type ColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: ColorSlot;
  kind: TxKind;
  order: number;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  /** Monto en CLP, entero positivo. */
  amount: number;
  categoryId: string;
  /** Fecha local `YYYY-MM-DD`. */
  date: string;
  note: string;
  createdAt: number;
}

/** Presupuesto mensual recurrente por categoría de gasto. */
export interface Budget {
  categoryId: string;
  limit: number;
}

export interface GoalContribution {
  amount: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  deadline: string | null;
  color: ColorSlot;
  contributions: GoalContribution[];
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface BackupFile {
  app: 'cuentia';
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}
