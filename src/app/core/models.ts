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
  /** Pago fijo que generó este movimiento. */
  planId?: string;
  /** Número de cuota (si aplica). */
  installment?: number;
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
  version: 1 | 2;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  plans?: RecurringPlan[];
  /** Meses empezados a mano antes del día 1: `{ 'YYYY-MM': 'YYYY-MM-DD' }`. */
  monthStarts?: Record<string, string>;
}

export type PlanType = 'installment' | 'loan' | 'salary';

/** Pago fijo mensual: compra en cuotas, crédito o sueldo. Genera movimientos solo. */
export interface RecurringPlan {
  id: string;
  type: PlanType;
  name: string;
  emoji: string;
  /** Valor de la cuota o del sueldo (CLP). */
  amount: number;
  /** Día del mes (1–31). En meses más cortos se usa el último día. */
  day: number;
  categoryId: string;
  /** Total de cuotas; `null` para el sueldo. */
  totalInstallments: number | null;
  /** Número de la cuota que corresponde a `startMonth`. */
  firstInstallment: number;
  /** Primer mes a generar, `YYYY-MM`. */
  startMonth: string;
  /** Precio total de la compra (informativo). */
  totalPrice: number | null;
  /** Último mes ya generado; evita duplicados y que reaparezcan movimientos borrados. */
  lastGenerated: string | null;
  paused: boolean;
  createdAt: number;
}
