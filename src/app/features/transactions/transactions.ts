import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { inMonth, totals } from '../../core/analytics';
import { CategoriesStore } from '../../core/categories.store';
import { Transaction, TxKind } from '../../core/models';
import { TransactionsStore } from '../../core/transactions.store';
import { dayLabel } from '../../core/util';
import { ClpPipe } from '../../shared/clp.pipe';
import { Squiggle } from '../../shared/deco';
import { Icon } from '../../shared/icon';
import { MonthSwitcher } from '../../shared/month-switcher';
import { TxRow } from '../../shared/tx-row';
import { UiService } from '../../shared/ui.service';

interface DayGroup {
  date: string;
  label: string;
  net: number;
  items: Transaction[];
}

@Component({
  selector: 'app-transactions',
  imports: [ClpPipe, Icon, TxRow, MonthSwitcher, Squiggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <span class="eyebrow">Todo lo que entra y sale</span>
          <h1>Historial</h1>
          <app-squiggle />
        </div>
      </header>

      <app-month-switcher [(month)]="month" [max]="txs.currentMonth()" />

      <div class="sum">
        <div class="sum-tile sum-tile--in">
          <small>Entró</small>
          <strong class="num">{{ monthTotals().income | clp }}</strong>
        </div>
        <div class="sum-tile sum-tile--out">
          <small>Salió</small>
          <strong class="num">{{ monthTotals().expense | clp }}</strong>
        </div>
        <div class="sum-tile sum-tile--net">
          <small>Neto</small>
          <strong class="num">{{ monthTotals().net | clp: 'signed' }}</strong>
        </div>
      </div>

      <div class="filters">
        <div class="chip-row" role="group" aria-label="Tipo">
          @for (k of kinds; track k.value) {
            <button type="button" class="chip" [attr.aria-pressed]="kind() === k.value" (click)="setKind(k.value)">
              {{ k.label }}
            </button>
          }
        </div>
        <div class="chip-row" role="group" aria-label="Categoría">
          <button type="button" class="chip" [attr.aria-pressed]="cat() === null" (click)="cat.set(null)">Todas</button>
          @for (c of catOptions(); track c.id) {
            <button type="button" class="chip" [attr.aria-pressed]="cat() === c.id" (click)="cat.set(cat() === c.id ? null : c.id)">
              {{ c.emoji }} {{ c.name }}
            </button>
          }
        </div>
      </div>

      @for (g of groups(); track g.date) {
        <section class="card day">
          <header class="day-head">
            <h2>{{ g.label }}</h2>
            <span class="num" [class.pos]="g.net > 0">{{ g.net | clp: 'signed' }}</span>
          </header>
          <div class="list">
            @for (t of g.items; track t.id) {
              <app-tx-row [tx]="t" [showDate]="false" />
            }
          </div>
        </section>
      } @empty {
        <section class="card card--mint">
          <div class="empty">
            <span class="empty-emoji">🧾</span>
            <h3>Nada por aquí</h3>
            <p>No hay movimientos {{ kind() || cat() ? 'con estos filtros' : 'en este mes' }}.</p>
            <button type="button" class="btn btn--navy" (click)="ui.openNewTx(kind() ?? 'expense')">
              <app-icon name="plus" [size]="20" [stroke]="3" /> Agregar
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .sum {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .sum-tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px;
      border: var(--border);
      border-radius: var(--r-md);
      box-shadow: var(--shadow-hard-sm);
      color: var(--navy);
      min-width: 0;
    }
    .sum-tile small {
      font-weight: 800;
      font-size: 13px;
    }
    .sum-tile strong {
      font-size: 17px;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .sum-tile--in {
      background: var(--lime);
    }
    .sum-tile--out {
      background: #ff8a4c;
    }
    .sum-tile--net {
      background: var(--sun);
    }
    .filters {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .day {
      padding: 16px 14px 8px;
    }
    .day-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      padding: 0 6px 6px;
      border-bottom: 2px dashed var(--line);
    }
    .day-head h2 {
      font-size: 19px;
    }
    .day-head .num {
      font-size: 16px;
      color: var(--text-2);
    }
    .list {
      display: flex;
      flex-direction: column;
      margin: 4px -6px 0;
    }
  `,
})
export class Transactions {
  protected readonly txs = inject(TransactionsStore);
  protected readonly ui = inject(UiService);
  private readonly cats = inject(CategoriesStore);

  /** Sigue al mes actual (p. ej. al empezar un mes nuevo), pero se puede cambiar a mano. */
  protected readonly month = linkedSignal(() => this.txs.currentMonth());
  protected readonly kind = signal<TxKind | null>(null);
  protected readonly cat = signal<string | null>(null);

  protected readonly kinds: { value: TxKind | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 'expense', label: '↘ Gastos' },
    { value: 'income', label: '↗ Ingresos' },
  ];

  protected readonly monthTxs = computed(() => inMonth(this.txs.all(), this.month(), this.txs.starts()));
  protected readonly monthTotals = computed(() => totals(this.monthTxs()));
  protected readonly catOptions = computed(() => {
    const k = this.kind();
    return k ? this.cats.ofKind(k) : this.cats.all();
  });

  protected readonly groups = computed<DayGroup[]>(() => {
    const k = this.kind();
    const c = this.cat();
    const list = this.monthTxs().filter((t) => (!k || t.kind === k) && (!c || t.categoryId === c));
    const map = new Map<string, Transaction[]>();
    for (const t of list) (map.get(t.date) ?? map.set(t.date, []).get(t.date)!).push(t);
    return [...map].map(([date, items]) => ({
      date,
      label: dayLabel(date),
      items,
      net: totals(items).net,
    }));
  });

  protected setKind(k: TxKind | null) {
    this.kind.set(k);
    const c = this.cat();
    if (c && k && this.cats.get(c)?.kind !== k) this.cat.set(null);
  }
}
