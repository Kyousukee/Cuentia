import { Injectable, computed, inject } from '@angular/core';
import { budgetStatus } from './analytics';
import { CategoriesStore } from './categories.store';
import { db } from './db';
import { liveSignal } from './live';
import { Budget } from './models';
import { TransactionsStore } from './transactions.store';

@Injectable({ providedIn: 'root' })
export class BudgetsStore {
  private readonly categories = inject(CategoriesStore);
  private readonly txs = inject(TransactionsStore);
  private readonly live = liveSignal(() => db.budgets.toArray(), [] as Budget[]);

  readonly all = this.live.value;
  readonly loaded = this.live.loaded;

  /** Estado de cada presupuesto en el mes actual. */
  readonly status = computed(() =>
    budgetStatus(this.all(), this.categories.all(), this.txs.thisMonth()),
  );

  readonly totals = computed(() => {
    const s = this.status();
    const limit = s.reduce((a, b) => a + b.budget.limit, 0);
    const spent = s.reduce((a, b) => a + b.spent, 0);
    return { limit, spent, ratio: limit ? spent / limit : 0 };
  });

  async set(categoryId: string, limit: number): Promise<void> {
    await db.budgets.put({ categoryId, limit: Math.round(limit) });
  }

  async remove(categoryId: string): Promise<void> {
    await db.budgets.delete(categoryId);
  }
}
