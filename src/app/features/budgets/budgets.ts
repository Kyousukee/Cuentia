import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BudgetsStore } from '../../core/budgets.store';
import { CategoriesStore } from '../../core/categories.store';
import { TransactionsStore } from '../../core/transactions.store';
import { periodStart } from '../../core/periods';
import { daysUntil, monthLabel, shiftMonth } from '../../core/util';
import { ClpPipe } from '../../shared/clp.pipe';
import { Sparks, Squiggle } from '../../shared/deco';
import { Icon } from '../../shared/icon';
import { MoneyInput } from '../../shared/money-input';
import { Sheet } from '../../shared/sheet';
import { UiService } from '../../shared/ui.service';

interface Editor {
  categoryId: string | null;
  limit: number;
  isNew: boolean;
}

@Component({
  selector: 'app-budgets',
  imports: [ClpPipe, DecimalPipe, Icon, Sheet, MoneyInput, Squiggle, Sparks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class Budgets {
  protected readonly store = inject(BudgetsStore);
  protected readonly cats = inject(CategoriesStore);
  private readonly txs = inject(TransactionsStore);
  private readonly ui = inject(UiService);

  protected readonly month = computed(() => monthLabel(this.txs.currentMonth()));
  protected readonly editor = signal<Editor | null>(null);

  protected readonly daysLeft = computed(() => {
    // Si el mes se empezó antes (p. ej. el 25), dura hasta que empiece el siguiente.
    const end = periodStart(shiftMonth(this.txs.currentMonth(), 1), this.txs.starts());
    return Math.max(1, daysUntil(end));
  });

  protected readonly perDay = computed(() => {
    const t = this.store.totals();
    return Math.max(0, t.limit - t.spent) / this.daysLeft();
  });

  protected readonly available = computed(() => {
    const used = new Set(this.store.all().map((b) => b.categoryId));
    return this.cats.expense().filter((c) => !used.has(c.id));
  });

  protected openNew() {
    this.editor.set({ categoryId: this.available()[0]?.id ?? null, limit: 0, isNew: true });
  }

  protected openEdit(categoryId: string, limit: number) {
    this.editor.set({ categoryId, limit, isNew: false });
  }

  protected patch(p: Partial<Editor>) {
    this.editor.update((e) => (e ? { ...e, ...p } : e));
  }

  protected async save() {
    const e = this.editor();
    if (!e?.categoryId || e.limit <= 0) return;
    await this.store.set(e.categoryId, e.limit);
    this.editor.set(null);
    this.ui.notify(e.isNew ? 'Presupuesto creado 🎯' : 'Presupuesto actualizado');
  }

  protected async remove() {
    const e = this.editor();
    if (!e?.categoryId) return;
    const prev = this.store.all().find((b) => b.categoryId === e.categoryId);
    await this.store.remove(e.categoryId);
    this.editor.set(null);
    this.ui.notify('Presupuesto eliminado', 'Deshacer', () => prev && this.store.set(prev.categoryId, prev.limit));
  }

  protected width(ratio: number) {
    return Math.min(100, ratio * 100);
  }
}
