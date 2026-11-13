import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { byCategory } from '../../core/analytics';
import { BudgetsStore } from '../../core/budgets.store';
import { CategoriesStore } from '../../core/categories.store';
import { GoalsStore } from '../../core/goals.store';
import { TransactionsStore } from '../../core/transactions.store';
import { monthLabel } from '../../core/util';
import { Donut, DonutSlice } from '../../shared/charts/donut';
import { Ring } from '../../shared/charts/ring';
import { ClpPipe } from '../../shared/clp.pipe';
import { Mark, Sparks, Squiggle } from '../../shared/deco';
import { Icon } from '../../shared/icon';
import { TxRow } from '../../shared/tx-row';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe, ClpPipe, Icon, TxRow, Donut, Ring, Sparks, Squiggle, Mark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly txs = inject(TransactionsStore);
  protected readonly budgets = inject(BudgetsStore);
  protected readonly goals = inject(GoalsStore);
  protected readonly ui = inject(UiService);
  private readonly cats = inject(CategoriesStore);

  protected readonly month = computed(() => monthLabel(this.txs.currentMonth()));
  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 20 ? '¡Buenas tardes!' : '¡Buenas noches!';
  });

  protected readonly topSpend = computed(() => byCategory(this.txs.thisMonth(), this.cats.all(), 'expense'));
  protected readonly slices = computed<DonutSlice[]>(() =>
    this.topSpend().map((s) => ({
      id: s.category.id,
      label: s.category.name,
      emoji: s.category.emoji,
      value: s.total,
      color: s.category.color,
    })),
  );

  /** Porcentaje de ingresos del mes que sigue disponible. */
  protected readonly savingRate = computed(() => {
    const t = this.txs.thisMonthTotals();
    return t.income > 0 ? Math.round((t.net / t.income) * 100) : null;
  });
}
