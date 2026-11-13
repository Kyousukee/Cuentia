import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { byCategory, inMonth, monthlySeries, totals } from '../../core/analytics';
import { CategoriesStore } from '../../core/categories.store';
import { TxKind } from '../../core/models';
import { TransactionsStore } from '../../core/transactions.store';
import { monthKey, parseISODate, today } from '../../core/util';
import { Donut, DonutSlice } from '../../shared/charts/donut';
import { MonthBars } from '../../shared/charts/month-bars';
import { ClpPipe } from '../../shared/clp.pipe';
import { Squiggle } from '../../shared/deco';
import { MonthSwitcher } from '../../shared/month-switcher';

@Component({
  selector: 'app-summary',
  imports: [ClpPipe, DecimalPipe, Donut, MonthBars, MonthSwitcher, Squiggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  protected readonly txs = inject(TransactionsStore);
  private readonly cats = inject(CategoriesStore);

  protected readonly month = signal(this.txs.currentMonth());
  protected readonly kind = signal<TxKind>('expense');
  protected readonly selected = signal<string | null>(null);

  private readonly monthTxs = computed(() => inMonth(this.txs.all(), this.month()));
  protected readonly t = computed(() => totals(this.monthTxs()));
  protected readonly slices = computed(() => byCategory(this.monthTxs(), this.cats.all(), this.kind()));
  protected readonly donut = computed<DonutSlice[]>(() =>
    this.slices().map((s) => ({
      id: s.category.id,
      label: s.category.name,
      emoji: s.category.emoji,
      value: s.total,
      color: s.category.color,
    })),
  );
  protected readonly series = computed(() => monthlySeries(this.txs.all(), this.month(), 6));

  /** Gasto promedio por día transcurrido del mes. */
  protected readonly dailyAvg = computed(() => {
    const m = this.month();
    const isCurrent = m === monthKey(today());
    const d = parseISODate(m + '-01');
    const days = isCurrent ? new Date().getDate() : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return this.t().expense / days;
  });

  protected readonly biggest = computed(() => {
    let max = null as null | { amount: number; note: string; cat: string };
    for (const tx of this.monthTxs()) {
      if (tx.kind !== 'expense') continue;
      if (!max || tx.amount > max.amount) {
        const c = this.cats.get(tx.categoryId);
        max = { amount: tx.amount, note: tx.note || c?.name || '', cat: c?.emoji ?? '' };
      }
    }
    return max;
  });

  protected setKind(k: TxKind) {
    this.kind.set(k);
    this.selected.set(null);
  }
}
