import { RecurringPlan, Transaction } from './models';
import { lastMonth } from './plans';
import { MonthStarts, periodOf } from './periods';
import { dateInMonth, monthKey, monthsBetween, shiftMonth } from './util';

/** Un cargo o depósito futuro de un plan. */
export interface FutureCharge {
  planId: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** `YYYY-MM` */
  month: string;
  /** Positivo para sueldo, negativo para créditos y cuotas. */
  delta: number;
}

/**
 * Cargos de los planes activos que aún no se generaron como movimiento, hasta `horizonMonth` inclusive.
 * Cuenta todo mes posterior a `lastGenerated` (aunque su fecha ya pasó), así no se cuenta
 * dos veces lo que ya está en el balance ni se pierde un cargo vencido sin generar.
 */
export function futureCharges(plans: readonly RecurringPlan[], horizonMonth: string): FutureCharge[] {
  const out: FutureCharge[] = [];
  for (const plan of plans) {
    if (plan.paused) continue;
    const end = lastMonth(plan);
    let month = plan.lastGenerated ? shiftMonth(plan.lastGenerated, 1) : plan.startMonth;
    if (month < plan.startMonth) month = plan.startMonth;
    const delta = plan.type === 'salary' ? plan.amount : -plan.amount;
    while (month <= horizonMonth && (!end || month <= end)) {
      out.push({ planId: plan.id, date: dateInMonth(month, plan.day), month, delta });
      month = shiftMonth(month, 1);
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Promedio mensual del gasto variable (gastos sin `planId`) de los 3 meses completos
 * anteriores a `currentMonth`. Divide solo por los meses que tienen algún movimiento;
 * si ninguno tiene, devuelve 0.
 */
export function variableAverage(
  txs: readonly Transaction[],
  currentMonth: string,
  starts: MonthStarts = {},
): number {
  const months = [1, 2, 3].map((n) => shiftMonth(currentMonth, -n));
  const active = new Set<string>();
  let spent = 0;
  for (const t of txs) {
    const m = periodOf(t.date, starts);
    if (!months.includes(m)) continue;
    active.add(m);
    if (t.kind === 'expense' && !t.planId) spent += t.amount;
  }
  return active.size ? Math.round(spent / active.size) : 0;
}

/** Fila de la lista mes a mes. */
export interface ProjectedMonth {
  /** `YYYY-MM` */
  month: string;
  /** Sueldos del mes. */
  income: number;
  /** Créditos + cuotas del mes (positivo). */
  fixedOut: number;
  /** Gasto habitual descontado ese mes (0 en el mes actual). */
  variableOut: number;
  /** Saldo estimado al último día del mes. */
  endBalance: number;
  /** Planes cuya última cuota cae este mes. */
  finishing: RecurringPlan[];
}

/** Resultado de consultar una fecha. */
export interface ProjectionAt {
  date: string;
  /** Balance total hoy. */
  start: number;
  income: number;
  incomeCount: number;
  fixedOut: number;
  fixedCount: number;
  variableOut: number;
  variableMonths: number;
  total: number;
}

/**
 * Saldo estimado a fin de cada mes, desde el mes de `today` y por `count` meses.
 * El gasto habitual no se descuenta en el mes actual; sí el promedio completo en cada mes siguiente.
 */
export function projectMonths(
  start: number,
  plans: readonly RecurringPlan[],
  today: string,
  variableAvg: number,
  count = 12,
): ProjectedMonth[] {
  const current = monthKey(today);
  const horizon = shiftMonth(current, count - 1);
  const charges = futureCharges(plans, horizon);
  const rows: ProjectedMonth[] = [];
  let balance = start;
  for (let i = 0; i < count; i++) {
    const month = shiftMonth(current, i);
    // En el mes actual también entran los cargos vencidos de meses anteriores que no se generaron.
    const inMonth = charges.filter((c) => (i === 0 ? c.month <= month : c.month === month));
    const income = inMonth.filter((c) => c.delta > 0).reduce((s, c) => s + c.delta, 0);
    const fixedOut = inMonth.filter((c) => c.delta < 0).reduce((s, c) => s - c.delta, 0);
    const variableOut = i === 0 ? 0 : variableAvg;
    balance += income - fixedOut - variableOut;
    const ids = new Set(inMonth.map((c) => c.planId));
    const finishing = plans.filter((p) => ids.has(p.id) && lastMonth(p) === month);
    rows.push({ month, income, fixedOut, variableOut, endBalance: balance, finishing });
  }
  return rows;
}

/** Saldo estimado al día `date` (inclusive), con su desglose. */
export function projectAt(
  start: number,
  plans: readonly RecurringPlan[],
  today: string,
  date: string,
  variableAvg: number,
): ProjectionAt {
  const charges = futureCharges(plans, monthKey(date)).filter((c) => c.date <= date);
  const ins = charges.filter((c) => c.delta > 0);
  const outs = charges.filter((c) => c.delta < 0);
  const income = ins.reduce((s, c) => s + c.delta, 0);
  const fixedOut = outs.reduce((s, c) => s - c.delta, 0);
  const variableMonths = Math.max(0, monthsBetween(monthKey(today), monthKey(date)));
  const variableOut = variableAvg * variableMonths;
  return {
    date,
    start,
    income,
    incomeCount: ins.length,
    fixedOut,
    fixedCount: outs.length,
    variableOut,
    variableMonths,
    total: start + income - fixedOut - variableOut,
  };
}
