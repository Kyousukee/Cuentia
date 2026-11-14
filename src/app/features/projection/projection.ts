import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlansStore } from '../../core/plans.store';
import { projectAt, projectMonths, variableAverage } from '../../core/projection';
import { SettingsStore } from '../../core/settings.store';
import { TransactionsStore } from '../../core/transactions.store';
import { dateInMonth, monthKey, monthLabel, parseISODate, shiftMonth, today } from '../../core/util';
import { BalanceBars, BalancePoint } from '../../shared/charts/balance-bars';
import { ClpPipe } from '../../shared/clp.pipe';
import { Sparks, Squiggle } from '../../shared/deco';

/** Meses hacia adelante que se pueden consultar con el selector de fecha. */
const MAX_MONTHS = 36;

const longDate = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

@Component({
  selector: 'app-projection',
  imports: [BalanceBars, ClpPipe, RouterLink, Squiggle, Sparks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projection.html',
  styleUrl: './projection.scss',
})
export class Projection {
  protected readonly txs = inject(TransactionsStore);
  private readonly plans = inject(PlansStore);
  protected readonly settings = inject(SettingsStore);

  /** Fecha de referencia: se recalcula junto con el mes actual al volver a la app. */
  private readonly today = computed(() => {
    this.txs.currentMonth();
    return today();
  });

  private readonly activePlans = computed(() => this.plans.all().map((s) => s.plan));

  /** Sin planes activos y sin gasto habitual: la proyección es plana. */
  protected readonly isEmpty = computed(
    () =>
      this.plans.loaded() &&
      !this.settings.projectionVariable() &&
      !this.plans.all().some((s) => !s.plan.paused && !s.finished),
  );

  /** Promedio del gasto variable de los 3 meses completos anteriores. */
  protected readonly variableAvg = computed(() => variableAverage(this.txs.all(), this.txs.currentMonth()));

  /** Gasto habitual que se aplica: el promedio si el interruptor está encendido. */
  private readonly variableUsed = computed(() => (this.settings.projectionVariable() ? this.variableAvg() : 0));

  protected readonly months = computed(() =>
    projectMonths(this.txs.balance(), this.activePlans(), this.today(), this.variableUsed()),
  );

  protected readonly chartData = computed<BalancePoint[]>(() =>
    this.months().map((m) => ({ month: m.month, value: m.endBalance })),
  );

  /** Rango permitido del selector: de hoy a hoy + 36 meses. */
  protected readonly minDate = computed(() => this.today());
  protected readonly maxDate = computed(() => {
    const t = this.today();
    return dateInMonth(shiftMonth(monthKey(t), MAX_MONTHS), Number(t.slice(8)));
  });

  /** Fecha elegida; `null` = la por defecto (último día del mes siguiente). */
  private readonly picked = signal<string | null>(null);

  protected readonly date = computed(() => {
    const p = this.picked();
    if (p && p >= this.minDate() && p <= this.maxDate()) return p;
    return dateInMonth(shiftMonth(monthKey(this.today()), 1), 31);
  });

  protected readonly at = computed(() =>
    projectAt(this.txs.balance(), this.activePlans(), this.today(), this.date(), this.variableUsed()),
  );

  protected readonly dateLabel = computed(() => longDate.format(parseISODate(this.date())));

  protected pickDate(input: HTMLInputElement) {
    const value = input.value;
    // Vacío: vuelve a la fecha por defecto. Fuera de rango: se ignora y se restaura el valor.
    if (!value) this.picked.set(null);
    else if (value >= this.minDate() && value <= this.maxDate()) this.picked.set(value);
    input.value = this.date();
  }

  protected readonly label = monthLabel;
}
