import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { byCategory } from '../../core/analytics';
import { BudgetsStore } from '../../core/budgets.store';
import { CategoriesStore } from '../../core/categories.store';
import { GoalsStore } from '../../core/goals.store';
import { PlansStore } from '../../core/plans.store';
import { TransactionsStore } from '../../core/transactions.store';
import { monthLabel, parseISODate, shiftMonth } from '../../core/util';
import { groupSlices } from '../../shared/charts/donut';
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
  protected readonly plans = inject(PlansStore);
  private readonly cats = inject(CategoriesStore);

  protected readonly month = computed(() => monthLabel(this.txs.currentMonth()));
  /** Nombre del mes en minúsculas, para frases ("Partiste noviembre con…"). */
  protected readonly monthName = computed(() => monthLabel(this.txs.currentMonth()).split(' ')[0].toLowerCase());
  protected readonly nextMonthName = computed(() => monthLabel(shiftMonth(this.txs.currentMonth(), 1)).split(' ')[0].toLowerCase());
  protected readonly prevMonthName = computed(() => monthLabel(shiftMonth(this.txs.currentMonth(), -1)).split(' ')[0].toLowerCase());

  /** Deshace un "Empezar mes nuevo": el mes actual vuelve a empezar el día 1. */
  protected async goBackMonth() {
    if (this.starting()) return;
    this.starting.set(true);
    try {
      const { month, start } = await this.txs.goBackMonth();
      const name = monthLabel(shiftMonth(month, -1)).split(' ')[0];
      this.ui.notify(`Volviste a ${name} ↩`, 'Deshacer', () => this.txs.restoreStart(month, start));
    } catch (e) {
      console.error('[Cuentia] Error volviendo al mes anterior', e);
      this.ui.notify('No se pudo volver al mes anterior');
    } finally {
      this.starting.set(false);
    }
  }

  /** El mes actual se empezó a mano antes del día 1. */
  protected readonly startedEarly = computed(() => !this.txs.currentStart().endsWith('-01'));
  protected readonly starting = signal(false);

  /** Empieza el mes siguiente hoy (p. ej. el día de pago). Se puede deshacer desde el aviso. */
  protected async startNextMonth() {
    if (this.starting()) return;
    this.starting.set(true);
    try {
      const month = await this.txs.startNextMonth();
      const name = monthLabel(month).split(' ')[0];
      this.ui.notify(`¡Empezó ${name}! Tu saldo pasa completo 📅`, 'Deshacer', () => this.txs.undoStartMonth(month));
    } catch (e) {
      console.error('[Cuentia] Error empezando el mes', e);
      this.ui.notify('No se pudo empezar el mes nuevo');
    } finally {
      this.starting.set(false);
    }
  }
  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 20 ? '¡Buenas tardes!' : '¡Buenas noches!';
  });

  protected readonly topSpend = computed(() => byCategory(this.txs.thisMonth(), this.cats.all(), 'expense'));
  protected readonly slices = computed<DonutSlice[]>(() =>
    groupSlices(this.topSpend().map((s) => ({
      id: s.category.id,
      label: s.category.name,
      emoji: s.category.emoji,
      value: s.total,
      color: s.category.color,
    }))),
  );

  /** Porcentaje de ingresos del mes que sigue disponible. */
  protected readonly savingRate = computed(() => {
    const t = this.txs.thisMonthTotals();
    return t.income > 0 ? Math.trunc((t.net / t.income) * 100) : null;
  });

  protected fmtDay(date: string): string {
    return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(parseISODate(date));
  }
}
