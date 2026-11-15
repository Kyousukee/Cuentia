import { Injectable, computed, signal } from '@angular/core';
import { inMonth, monthlySeries, totals } from './analytics';
import { db } from './db';
import { liveSignal } from './live';
import { Transaction } from './models';
import { MonthStarts, canStartNext, periodOf, periodStart } from './periods';
import { shiftMonth, today, uid } from './util';

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt'>;

/** Clave en `db.settings` con los inicios de mes adelantados a mano. */
export const MONTH_STARTS_KEY = 'monthStarts';

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly live = liveSignal(
    () => db.transactions.orderBy('date').reverse().toArray(),
    [] as Transaction[],
  );
  private readonly liveStarts = liveSignal(
    async () => ((await db.settings.get(MONTH_STARTS_KEY))?.value ?? {}) as MonthStarts,
    {} as MonthStarts,
  );

  /** Fecha de hoy (`YYYY-MM-DD`); se refresca al volver a la app. */
  readonly today = signal(today());
  readonly starts = this.liveStarts.value;

  /** Mes de referencia actual (`YYYY-MM`). Puede adelantarse con "Empezar mes nuevo". */
  readonly currentMonth = computed(() => periodOf(this.today(), this.starts()));
  /** Fecha en que empezó el mes actual. */
  readonly currentStart = computed(() => periodStart(this.currentMonth(), this.starts()));
  readonly canStartNext = computed(() => canStartNext(this.today(), this.starts()));

  /** Todos los movimientos, más recientes primero. */
  readonly all = computed(() =>
    [...this.live.value()].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
    ),
  );
  readonly loaded = this.live.loaded;

  readonly balance = computed(() => totals(this.all()).net);
  readonly thisMonth = computed(() => inMonth(this.all(), this.currentMonth(), this.starts()));
  readonly thisMonthTotals = computed(() => totals(this.thisMonth()));
  /** Saldo con que partió el mes actual (todo lo anterior a su inicio). */
  readonly openingBalance = computed(() => {
    const start = this.currentStart();
    return totals(this.all().filter((t) => t.date < start)).net;
  });
  readonly recent = computed(() => this.all().slice(0, 5));
  readonly last6Months = computed(() => monthlySeries(this.all(), this.currentMonth(), 6, this.starts()));

  refreshToday() {
    this.today.set(today());
  }

  /**
   * Empieza el mes siguiente hoy, sin esperar al día 1. El saldo sigue igual;
   * los totales del mes y los presupuestos parten de cero. Devuelve el mes nuevo.
   */
  async startNextMonth(): Promise<string> {
    const t = today();
    this.today.set(t);
    const starts = this.starts();
    if (!canStartNext(t, starts)) throw new Error('Ya empezaste el mes siguiente.');
    const next = shiftMonth(periodOf(t, starts), 1);
    await db.settings.put({ key: MONTH_STARTS_KEY, value: { ...starts, [next]: t } });
    return next;
  }

  /** Deshace "Empezar mes nuevo": el mes vuelve a empezar el día 1. */
  async undoStartMonth(month: string): Promise<void> {
    const { [month]: _, ...rest } = this.starts();
    await db.settings.put({ key: MONTH_STARTS_KEY, value: rest });
  }

  async add(draft: TransactionDraft): Promise<string> {
    const id = uid();
    await db.transactions.add({ ...draft, amount: Math.round(draft.amount), id, createdAt: Date.now() });
    return id;
  }

  async update(id: string, draft: TransactionDraft): Promise<void> {
    await db.transactions.update(id, { ...draft, amount: Math.round(draft.amount) });
  }

  async remove(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  async restore(tx: Transaction): Promise<void> {
    await db.transactions.put(tx);
  }
}
