import { RecurringPlan } from './models';
import { dueCharges, nextMonthFor, planStatus, upcomingCharges } from './plans';
import { dateInMonth } from './util';

const base = (p: Partial<RecurringPlan>): RecurringPlan => ({
  id: 'p',
  type: 'loan',
  name: 'Crédito',
  emoji: '🏦',
  amount: 100_000,
  day: 5,
  categoryId: 'creditos',
  totalInstallments: 24,
  firstInstallment: 1,
  startMonth: '2026-11',
  totalPrice: null,
  lastGenerated: null,
  paused: false,
  createdAt: 0,
  ...p,
});

describe('pagos fijos', () => {
  it('ajusta el día 31 al último día del mes', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28');
    expect(dateInMonth('2028-02', 31)).toBe('2028-02-29');
    expect(dateInMonth('2026-11', 31)).toBe('2026-11-30');
  });

  it('sueldo día 31 se genera el 28 de febrero', () => {
    const p = base({ type: 'salary', day: 31, totalInstallments: null, startMonth: '2027-02' });
    expect(dueCharges(p, '2027-02-28')).toEqual([{ month: '2027-02', date: '2027-02-28', installment: null }]);
    expect(dueCharges(p, '2027-02-27')).toEqual([]);
  });

  it('crédito "voy en la 5 de 24" numera desde la 5', () => {
    const p = base({ firstInstallment: 5, startMonth: '2026-09' });
    const due = dueCharges(p, '2026-11-13');
    expect(due.map((c) => c.installment)).toEqual([5, 6, 7]);
    expect(due.map((c) => c.date)).toEqual(['2026-09-05', '2026-10-05', '2026-11-05']);
  });

  it('se detiene en la última cuota', () => {
    const p = base({ totalInstallments: 3, firstInstallment: 2, startMonth: '2026-06' });
    expect(dueCharges(p, '2026-12-31').map((c) => c.installment)).toEqual([2, 3]);
    const done = { ...p, lastGenerated: '2026-07' };
    expect(dueCharges(done, '2027-06-01')).toEqual([]);
    expect(planStatus(done)).toMatchObject({ paid: 3, remaining: 0, finished: true, debt: 0 });
  });

  it('no duplica: después de generar, no hay pendientes', () => {
    const p = base({ startMonth: '2026-10' });
    const due = dueCharges(p, '2026-11-13');
    expect(due.length).toBe(2);
    const after = { ...p, lastGenerated: due[due.length - 1].month };
    expect(dueCharges(after, '2026-11-13')).toEqual([]);
    expect(dueCharges(after, '2026-12-05').map((c) => c.installment)).toEqual([3]);
  });

  it('plan pausado no genera', () => {
    expect(dueCharges(base({ paused: true }), '2027-01-01')).toEqual([]);
  });

  it('estado: cuotas pagadas y deuda', () => {
    const s = planStatus(base({ firstInstallment: 5, startMonth: '2026-12' }));
    expect(s).toMatchObject({ paid: 4, remaining: 20, debt: 2_000_000, finished: false });
    expect(s.next).toEqual({ month: '2026-12', date: '2026-12-05', installment: 5 });
  });

  it('mes de inicio según si el día ya pasó', () => {
    expect(nextMonthFor(5, '2026-11-13')).toBe('2026-12');
    expect(nextMonthFor(20, '2026-11-13')).toBe('2026-11');
    expect(nextMonthFor(5, '2026-11-13', true)).toBe('2026-11');
    expect(nextMonthFor(31, '2026-12-31')).toBe('2026-12');
  });

  it('próximos cargos en 30 días', () => {
    const p = base({ startMonth: '2026-11', day: 20 });
    expect(upcomingCharges(p, '2026-11-13', 30).map((c) => c.date)).toEqual(['2026-11-20']);
  });
});
