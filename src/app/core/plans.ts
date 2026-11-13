import { RecurringPlan } from './models';
import { dateInMonth, monthKey, monthsBetween, shiftMonth } from './util';

export interface Charge {
  month: string;
  date: string;
  /** Número de cuota; `null` para el sueldo. */
  installment: number | null;
}

/** Número de cuota que corresponde a un mes (o `null` si no tiene cuotas). */
export function installmentFor(plan: RecurringPlan, month: string): number | null {
  if (plan.totalInstallments === null) return null;
  return plan.firstInstallment + monthsBetween(plan.startMonth, month);
}

/** Mes de la última cuota (o `null` si es indefinido, como el sueldo). */
export function lastMonth(plan: RecurringPlan): string | null {
  if (plan.totalInstallments === null) return null;
  return shiftMonth(plan.startMonth, plan.totalInstallments - plan.firstInstallment);
}

/** Cargos que ya vencieron (fecha ≤ hoy) y aún no se han generado. */
export function dueCharges(plan: RecurringPlan, today: string): Charge[] {
  if (plan.paused) return [];
  const end = lastMonth(plan);
  let month = plan.lastGenerated ? shiftMonth(plan.lastGenerated, 1) : plan.startMonth;
  if (month < plan.startMonth) month = plan.startMonth;
  const current = monthKey(today);
  const out: Charge[] = [];
  while (month <= current && (!end || month <= end)) {
    const date = dateInMonth(month, plan.day);
    if (date > today) break;
    out.push({ month, date, installment: installmentFor(plan, month) });
    month = shiftMonth(month, 1);
  }
  return out;
}

/** Próximo cargo pendiente (mirando desde hoy), o `null` si ya terminó. */
export function nextCharge(plan: RecurringPlan): Charge | null {
  const end = lastMonth(plan);
  let month = plan.lastGenerated ? shiftMonth(plan.lastGenerated, 1) : plan.startMonth;
  if (month < plan.startMonth) month = plan.startMonth;
  // Si el cargo de ese mes ya pasó pero no se ha generado, igual es el "próximo".
  if (end && month > end) return null;
  return { month, date: dateInMonth(month, plan.day), installment: installmentFor(plan, month) };
}

export interface PlanStatus {
  plan: RecurringPlan;
  /** Cuotas pagadas (incluye las que ya venían pagadas antes de registrar). */
  paid: number;
  remaining: number;
  progress: number;
  debt: number;
  next: Charge | null;
  finished: boolean;
}

export function planStatus(plan: RecurringPlan): PlanStatus {
  const next = nextCharge(plan);
  if (plan.totalInstallments === null) {
    return { plan, paid: 0, remaining: 0, progress: 0, debt: 0, next: plan.paused ? null : next, finished: false };
  }
  const total = plan.totalInstallments;
  const paid = next?.installment != null ? next.installment - 1 : total;
  const remaining = Math.max(0, total - paid);
  return {
    plan,
    paid,
    remaining,
    progress: total ? paid / total : 1,
    debt: remaining * plan.amount,
    next,
    finished: remaining === 0,
  };
}

/** Cargos programados entre hoy y `days` días adelante (para "Próximos pagos"). */
export function upcomingCharges(plan: RecurringPlan, today: string, days: number): Charge[] {
  if (plan.paused) return [];
  const limit = new Date(today + 'T00:00:00');
  limit.setDate(limit.getDate() + days);
  const limitStr = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
  const end = lastMonth(plan);
  const out: Charge[] = [];
  let month = plan.lastGenerated ? shiftMonth(plan.lastGenerated, 1) : plan.startMonth;
  if (month < plan.startMonth) month = plan.startMonth;
  for (let i = 0; i < 3 && (!end || month <= end); i++) {
    const date = dateInMonth(month, plan.day);
    if (date > limitStr) break;
    if (date >= today) out.push({ month, date, installment: installmentFor(plan, month) });
    month = shiftMonth(month, 1);
  }
  return out;
}

/**
 * Mes del próximo cargo para un día de pago dado.
 * Si el día de este mes ya pasó, es el mes siguiente — salvo que `includePassed` sea true
 * (ej. "ya me depositaron este mes": se registra el de este mes).
 */
export function nextMonthFor(day: number, todayStr: string, includePassed = false): string {
  const month = monthKey(todayStr);
  const passed = dateInMonth(month, day) < todayStr;
  return passed && !includePassed ? shiftMonth(month, 1) : month;
}
