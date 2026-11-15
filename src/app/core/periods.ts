import { monthKey, parseISODate, shiftMonth } from './util';

/**
 * Inicios de mes adelantados a mano: `{ 'YYYY-MM': 'YYYY-MM-DD' }`.
 * Un mes sin entrada empieza el día 1. Cuando el usuario toca "Empezar mes nuevo",
 * el mes siguiente queda registrado aquí con la fecha de ese día.
 */
export type MonthStarts = Readonly<Record<string, string>>;

/** Fecha en que empieza el mes `YYYY-MM`. */
export function periodStart(month: string, starts: MonthStarts): string {
  return starts[month] ?? `${month}-01`;
}

/** Mes (`YYYY-MM`) al que pertenece una fecha `YYYY-MM-DD`. */
export function periodOf(date: string, starts: MonthStarts): string {
  const m = monthKey(date);
  const next = shiftMonth(m, 1);
  const s = starts[next];
  return s && s <= date ? next : m;
}

/** Días entre el inicio del mes y `until` (inclusive), o el largo total del mes si ya terminó. */
export function periodDays(month: string, starts: MonthStarts, until: string): number {
  const start = parseISODate(periodStart(month, starts)).getTime();
  const endExcl = parseISODate(periodStart(shiftMonth(month, 1), starts)).getTime();
  const end = Math.min(endExcl, parseISODate(until).getTime() + 86_400_000);
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

/**
 * ¿Se puede empezar el mes siguiente hoy? Solo si el mes actual coincide con el del
 * calendario (no se puede adelantar dos meses) y no empezó hoy mismo.
 */
export function canStartNext(today: string, starts: MonthStarts): boolean {
  const current = periodOf(today, starts);
  return current === monthKey(today) && periodStart(current, starts) !== today;
}
