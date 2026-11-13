import { Injectable, computed, signal } from '@angular/core';
import { inMonth, monthlySeries, totals } from './analytics';
import { db } from './db';
import { liveSignal } from './live';
import { Transaction } from './models';
import { monthKey, today, uid } from './util';

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt'>;

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly live = liveSignal(
    () => db.transactions.orderBy('date').reverse().toArray(),
    [] as Transaction[],
  );

  /** Mes de referencia actual (`YYYY-MM`), se refresca al volver a la app. */
  readonly currentMonth = signal(monthKey(today()));

  /** Todos los movimientos, más recientes primero. */
  readonly all = computed(() =>
    [...this.live.value()].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
    ),
  );
  readonly loaded = this.live.loaded;

  readonly balance = computed(() => totals(this.all()).net);
  readonly thisMonth = computed(() => inMonth(this.all(), this.currentMonth()));
  readonly thisMonthTotals = computed(() => totals(this.thisMonth()));
  readonly recent = computed(() => this.all().slice(0, 5));
  readonly last6Months = computed(() => monthlySeries(this.all(), this.currentMonth(), 6));

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.currentMonth.set(monthKey(today()));
      });
    }
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
