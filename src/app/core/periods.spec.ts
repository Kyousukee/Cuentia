import { inMonth, monthlySeries } from './analytics';
import { Transaction } from './models';
import { canStartNext, periodDays, periodOf, periodStart } from './periods';

const tx = (date: string, amount: number, kind: Transaction['kind'] = 'expense'): Transaction => ({
  id: date + amount,
  kind,
  amount,
  categoryId: 'x',
  date,
  note: '',
  createdAt: 0,
});

describe('periods', () => {
  const starts = { '2026-12': '2026-11-25' };

  it('sin inicios adelantados usa el mes del calendario', () => {
    expect(periodOf('2026-11-30', {})).toBe('2026-11');
    expect(periodStart('2026-11', {})).toBe('2026-11-01');
  });

  it('un mes empezado a mano incluye los días desde ese inicio', () => {
    expect(periodOf('2026-11-24', starts)).toBe('2026-11');
    expect(periodOf('2026-11-25', starts)).toBe('2026-12');
    expect(periodOf('2026-12-31', starts)).toBe('2026-12');
    expect(periodOf('2027-01-01', starts)).toBe('2027-01');
  });

  it('inMonth y monthlySeries respetan los inicios', () => {
    const txs = [tx('2026-11-20', 100), tx('2026-11-26', 50), tx('2026-12-10', 30)];
    expect(inMonth(txs, '2026-12', starts).map((t) => t.amount)).toEqual([50, 30]);
    const series = monthlySeries(txs, '2026-12', 2, starts);
    expect(series.map((p) => p.expense)).toEqual([100, 80]);
  });

  it('solo deja empezar un mes por adelantado', () => {
    expect(canStartNext('2026-11-25', {})).toBe(true);
    // Ya empezó diciembre hoy: no se puede empezar otra vez ni adelantar enero.
    expect(canStartNext('2026-11-25', starts)).toBe(false);
    expect(canStartNext('2026-11-28', starts)).toBe(false);
    // Ya en diciembre del calendario, se puede empezar enero.
    expect(canStartNext('2026-12-25', starts)).toBe(true);
    // El día 1 el mes recién empezó.
    expect(canStartNext('2026-12-01', {})).toBe(false);
  });

  it('al quitar el inicio adelantado, los movimientos vuelven al mes anterior', () => {
    const txs = [tx('2026-11-26', 50)];
    expect(inMonth(txs, '2026-12', starts)).toHaveLength(1);
    expect(inMonth(txs, '2026-11', {})).toHaveLength(1);
    expect(periodOf('2026-11-26', {})).toBe('2026-11');
  });

  it('periodDays cuenta desde el inicio real del mes', () => {
    expect(periodDays('2026-12', starts, '2026-12-03')).toBe(9);
    expect(periodDays('2026-11', starts, '2026-12-03')).toBe(24);
    expect(periodDays('2026-11', {}, '2026-11-10')).toBe(10);
  });
});
