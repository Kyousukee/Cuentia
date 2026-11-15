import { Budget, Category, Goal, Transaction, TxKind } from './models';
import { MonthStarts, periodOf } from './periods';
import { shiftMonth } from './util';

export interface Totals {
  income: number;
  expense: number;
  net: number;
}

export function totals(txs: readonly Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.kind === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Movimientos del mes `month`, respetando los inicios de mes adelantados. */
export function inMonth(txs: readonly Transaction[], month: string, starts: MonthStarts = {}): Transaction[] {
  return txs.filter((t) => periodOf(t.date, starts) === month);
}

export interface CategorySlice {
  category: Category;
  total: number;
  share: number;
  count: number;
}

/** Totales por categoría (desc), para un tipo y un conjunto de movimientos. */
export function byCategory(
  txs: readonly Transaction[],
  categories: readonly Category[],
  kind: TxKind = 'expense',
): CategorySlice[] {
  const sums = new Map<string, { total: number; count: number }>();
  let all = 0;
  for (const t of txs) {
    if (t.kind !== kind) continue;
    const s = sums.get(t.categoryId) ?? { total: 0, count: 0 };
    s.total += t.amount;
    s.count++;
    sums.set(t.categoryId, s);
    all += t.amount;
  }
  const catById = new Map(categories.map((c) => [c.id, c]));
  const slices: CategorySlice[] = [];
  for (const [id, s] of sums) {
    const category = catById.get(id) ?? {
      id,
      name: 'Sin categoría',
      emoji: '❔',
      color: 7 as const,
      kind,
      order: 99,
    };
    slices.push({ category, total: s.total, count: s.count, share: all ? s.total / all : 0 });
  }
  return slices.sort((a, b) => b.total - a.total);
}

export interface MonthPoint extends Totals {
  month: string;
}

/** Serie de `count` meses terminando en `endMonth` (inclusive), en orden cronológico. */
export function monthlySeries(
  txs: readonly Transaction[],
  endMonth: string,
  count: number,
  starts: MonthStarts = {},
): MonthPoint[] {
  const points: MonthPoint[] = [];
  const byMonth = new Map<string, Transaction[]>();
  for (const t of txs) {
    const k = periodOf(t.date, starts);
    (byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(t);
  }
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonth(endMonth, -i);
    points.push({ month, ...totals(byMonth.get(month) ?? []) });
  }
  return points;
}

export type BudgetState = 'ok' | 'warn' | 'over';

export interface BudgetStatus {
  budget: Budget;
  category: Category;
  spent: number;
  remaining: number;
  ratio: number;
  state: BudgetState;
}

export function budgetStatus(
  budgets: readonly Budget[],
  categories: readonly Category[],
  monthTxs: readonly Transaction[],
): BudgetStatus[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const spentBy = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.kind === 'expense') spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount);
  }
  return budgets
    .filter((b) => catById.has(b.categoryId))
    .map((budget) => {
      const spent = spentBy.get(budget.categoryId) ?? 0;
      const ratio = budget.limit > 0 ? spent / budget.limit : 0;
      const state: BudgetState = ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok';
      return {
        budget,
        category: catById.get(budget.categoryId)!,
        spent,
        remaining: budget.limit - spent,
        ratio,
        state,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export function goalSaved(goal: Goal): number {
  return goal.contributions.reduce((s, c) => s + c.amount, 0);
}

export function goalProgress(goal: Goal): number {
  return goal.target > 0 ? Math.min(1, Math.max(0, goalSaved(goal) / goal.target)) : 0;
}
