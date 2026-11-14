import { RecurringPlan, Transaction } from './models';
import { futureCharges, projectAt, projectMonths, variableAverage } from './projection';

const plan = (p: Partial<RecurringPlan>): RecurringPlan => ({
  id: 'p',
  type: 'installment',
  name: 'Notebook',
  emoji: '💻',
  amount: 100_000,
  day: 20,
  categoryId: 'cuotas',
  totalInstallments: 6,
  firstInstallment: 1,
  startMonth: '2026-11',
  totalPrice: null,
  lastGenerated: null,
  paused: false,
  createdAt: 0,
  ...p,
});

const tx = (t: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  kind: 'expense',
  amount: 10_000,
  categoryId: 'comida',
  date: '2026-10-10',
  note: '',
  createdAt: 0,
  ...t,
});

describe('proyección · cargos futuros', () => {
  it('con lastGenerated nulo parte desde startMonth', () => {
    const c = futureCharges([plan({})], '2027-01');
    expect(c.map((x) => x.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(c.every((x) => x.delta === -100_000)).toBe(true);
  });

  it('salta los meses ya generados', () => {
    const c = futureCharges([plan({ lastGenerated: '2026-11' })], '2027-01');
    expect(c.map((x) => x.month)).toEqual(['2026-12', '2027-01']);
  });

  it('se detiene en la última cuota', () => {
    const c = futureCharges([plan({ totalInstallments: 3, lastGenerated: '2026-11' })], '2027-12');
    expect(c.map((x) => x.month)).toEqual(['2026-12', '2027-01']);
  });

  it('un plan terminado no aporta cargos', () => {
    expect(futureCharges([plan({ totalInstallments: 3, lastGenerated: '2027-01' })], '2027-12')).toEqual([]);
  });

  it('ignora planes pausados', () => {
    expect(futureCharges([plan({ paused: true })], '2027-12')).toEqual([]);
  });

  it('el sueldo suma y no tiene fin', () => {
    const s = plan({ id: 's', type: 'salary', amount: 1_000_000, day: 31, totalInstallments: null });
    const c = futureCharges([s], '2027-02');
    expect(c.map((x) => x.date)).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
    expect(c.every((x) => x.delta === 1_000_000)).toBe(true);
  });
});

describe('proyección · gasto variable', () => {
  it('promedia los gastos sin planId de los 3 meses completos anteriores', () => {
    const txs = [
      tx({ date: '2026-08-05', amount: 300_000 }),
      tx({ date: '2026-09-05', amount: 200_000 }),
      tx({ date: '2026-10-05', amount: 100_000 }),
      tx({ date: '2026-10-06', amount: 50_000, planId: 'p' }), // pago fijo: no cuenta
      tx({ date: '2026-11-02', amount: 999_000 }), // mes actual: no cuenta
      tx({ date: '2026-07-02', amount: 999_000 }), // fuera de la ventana
    ];
    expect(variableAverage(txs, '2026-11')).toBe(200_000);
  });

  it('divide solo por los meses con movimientos', () => {
    const txs = [
      tx({ date: '2026-10-05', amount: 300_000 }),
      tx({ date: '2026-09-25', kind: 'income', amount: 1_000_000 }),
    ];
    expect(variableAverage(txs, '2026-11')).toBe(150_000);
  });

  it('sin historial devuelve 0', () => {
    expect(variableAverage([tx({ date: '2026-11-01' })], '2026-11')).toBe(0);
  });
});

describe('proyección · saldo', () => {
  const TODAY = '2026-11-14';
  const salary = plan({ id: 's', type: 'salary', name: 'Sueldo', amount: 1_000_000, day: 30, totalInstallments: null });
  const cuota = plan({ id: 'c', amount: 100_000, day: 28, totalInstallments: 6 });

  it('sin planes, todos los meses quedan en el balance', () => {
    const rows = projectMonths(500_000, [], TODAY, 0);
    expect(rows).toHaveLength(12);
    expect(rows[0].month).toBe('2026-11');
    expect(rows.every((r) => r.endBalance === 500_000)).toBe(true);
  });

  it('un sueldo y una cuota a 3 meses', () => {
    const rows = projectMonths(0, [salary, cuota], TODAY, 0);
    expect(rows.slice(0, 3).map((r) => r.endBalance)).toEqual([900_000, 1_800_000, 2_700_000]);
    const at = projectAt(0, [salary, cuota], TODAY, '2027-01-29', 0);
    // Sueldo de enero (30) aún no llega; la cuota de enero (28) sí.
    expect(at).toMatchObject({ income: 2_000_000, incomeCount: 2, fixedOut: 300_000, fixedCount: 3, total: 1_700_000 });
  });

  it('la cuota deja de restar después de terminar y avisa el mes de la última', () => {
    const short = plan({ id: 'c', name: 'Notebook', totalInstallments: 3, lastGenerated: '2026-11' });
    const rows = projectMonths(0, [short], TODAY, 0);
    expect(rows.map((r) => r.fixedOut).slice(0, 4)).toEqual([0, 100_000, 100_000, 0]);
    expect(rows[2].finishing.map((p) => p.name)).toEqual(['Notebook']);
    expect(rows.filter((r) => r.finishing.length)).toHaveLength(1);
    expect(rows[11].endBalance).toBe(-200_000);
  });

  it('el gasto habitual no se descuenta en el mes actual', () => {
    const rows = projectMonths(1_000_000, [], TODAY, 200_000);
    expect(rows.slice(0, 3).map((r) => r.endBalance)).toEqual([1_000_000, 800_000, 600_000]);
    const at = projectAt(1_000_000, [], TODAY, '2027-01-01', 200_000);
    expect(at).toMatchObject({ variableMonths: 2, variableOut: 400_000, total: 600_000 });
    expect(projectAt(1_000_000, [], TODAY, '2026-11-30', 200_000).variableOut).toBe(0);
  });

  it('el desglose cuadra con el total', () => {
    const at = projectAt(250_000, [salary, cuota], TODAY, '2027-06-15', 150_000);
    expect(at.start + at.income - at.fixedOut - at.variableOut).toBe(at.total);
  });
});
