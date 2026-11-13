/**
 * Id único. No usa `crypto.randomUUID` porque solo existe en contextos seguros (HTTPS),
 * y en el iPhone la app se sirve por HTTP en la red local.
 */
export function uid(): string {
  const rand = new Uint32Array(2);
  crypto.getRandomValues(rand);
  return Date.now().toString(36) + rand[0].toString(36) + rand[1].toString(36);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` en hora local. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return toISODate(new Date());
}

/** `YYYY-MM` */
export function monthKey(date: string | Date): string {
  return typeof date === 'string' ? date.slice(0, 7) : toISODate(date).slice(0, 7);
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d ?? 1);
}

/** Desplaza un `YYYY-MM` en `delta` meses. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const monthFmt = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
const monthShortFmt = new Intl.DateTimeFormat('es-CL', { month: 'short' });
const dayFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function monthLabel(key: string): string {
  return cap(monthFmt.format(parseISODate(key + '-01')));
}

export function monthShort(key: string): string {
  return cap(monthShortFmt.format(parseISODate(key + '-01')).replace('.', ''));
}

export function dayLabel(date: string): string {
  const t = today();
  if (date === t) return 'Hoy';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (date === toISODate(y)) return 'Ayer';
  return cap(dayFmt.format(parseISODate(date)));
}

/** Días completos entre hoy y `date` (negativo si ya pasó). */
export function daysUntil(date: string): number {
  const ms = parseISODate(date).getTime() - parseISODate(today()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Meses entre dos `YYYY-MM` (b − a). */
export function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/** Fecha `YYYY-MM-DD` del día `day` en el mes `YYYY-MM`, ajustada al último día si no existe. */
export function dateInMonth(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(Math.max(1, day), last)).padStart(2, '0')}`;
}
