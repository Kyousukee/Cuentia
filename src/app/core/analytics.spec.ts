import { budgetStatus, byCategory, goalProgress, inMonth, monthlySeries, totals } from './analytics';
import { Category, Goal, Transaction } from './models';
import { shiftMonth } from './util';

const cats: Category[] = [
  { id: 'comida', name: 'Comida', emoji: '🍔', color: 2, kind: 'expense', order: 0 },
  { id: 'hogar', name: 'Hogar', emoji: '🏠', color: 1, kind: 'expense', order: 1 },
  { id: 'sueldo', name: 'Sueldo', emoji: '💼', color: 1, kind: 'income', order: 0 },
];

let n = 0;
const tx = (kind: Transaction['kind'], amount: number, categoryId: string, date: string): Transaction => ({
  id: String(++n),
  kind,
  amount,
  categoryId,
  date,
  note: '',
  createdAt: n,
});

const txs = [
  tx('income', 1_000_000, 'sueldo', '2026-11-01'),
  tx('expense', 30_000, 'comida', '2026-11-03'),
  tx('expense', 10_000, 'comida', '2026-11-04'),
  tx('expense', 60_000, 'hogar', '2026-11-05'),
  tx('expense', 50_000, 'hogar', '2026-10-20'),
];

describe('analytics', () => {
  it('totales y filtro por mes', () => {
    const nov = inMonth(txs, '2026-11');
    expect(nov.length).toBe(4);
    expect(totals(nov)).toEqual({ income: 1_000_000, expense: 100_000, net: 900_000 });
  });

  it('agrupa gasto por categoría ordenado', () => {
    const s = byCategory(inMonth(txs, '2026-11'), cats);
    expect(s.map((x) => x.category.id)).toEqual(['hogar', 'comida']);
    expect(s[0].share).toBeCloseTo(0.6);
    expect(s[1].count).toBe(2);
  });

  it('serie mensual incluye meses vacíos', () => {
    const s = monthlySeries(txs, '2026-11', 3);
    expect(s.map((p) => p.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(s[0].expense).toBe(0);
    expect(s[1].expense).toBe(50_000);
  });

  it('cambia de año al desplazar meses', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('estado de presupuestos', () => {
    const st = budgetStatus(
      [
        { categoryId: 'comida', limit: 50_000 },
        { categoryId: 'hogar', limit: 50_000 },
      ],
      cats,
      inMonth(txs, '2026-11'),
    );
    expect(st[0]).toMatchObject({ state: 'over', spent: 60_000, remaining: -10_000 });
    expect(st[1]).toMatchObject({ state: 'warn', spent: 40_000 });
  });

  it('progreso de metas acotado a 0–1', () => {
    const g: Goal = {
      id: 'g',
      name: 'Viaje',
      emoji: '✈️',
      target: 100,
      deadline: null,
      color: 1,
      createdAt: 0,
      contributions: [{ amount: 150, date: '2026-11-01' }],
    };
    expect(goalProgress(g)).toBe(1);
    expect(goalProgress({ ...g, contributions: [] })).toBe(0);
  });
});
