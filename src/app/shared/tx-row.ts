import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CategoriesStore } from '../core/categories.store';
import { Transaction } from '../core/models';
import { dayLabel } from '../core/util';
import { ClpPipe } from './clp.pipe';
import { UiService } from './ui.service';

@Component({
  selector: 'app-tx-row',
  imports: [ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="row" (click)="ui.openEditTx(tx())">
      <span class="cat-dot" [style.background]="tint()">{{ cat()?.emoji ?? '❔' }}</span>
      <span class="txt">
        <strong>{{ tx().note || cat()?.name || 'Sin categoría' }}</strong>
        <small>{{ tx().note ? cat()?.name : '' }}{{ tx().note && showDate() ? ' · ' : '' }}{{ showDate() ? day() : '' }}</small>
      </span>
      <span class="amt num" [class.is-in]="tx().kind === 'income'">
        {{ (tx().kind === 'income' ? tx().amount : -tx().amount) | clp: 'signed' }}
      </span>
    </button>
  `,
  styles: `
    .row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 6px;
      border: 0;
      background: transparent;
      text-align: left;
      border-radius: 18px;
      transition: background-color 150ms;
    }
    .row:active {
      background: var(--surface-2);
    }
    .txt {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .txt strong {
      font-weight: 800;
      font-size: 16.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .txt small {
      color: var(--text-2);
      font-size: 13.5px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .txt small:empty {
      display: none;
    }
    .amt {
      font-size: 18px;
      white-space: nowrap;
    }
    .amt.is-in {
      color: var(--teal-deep);
    }
    :host-context([data-theme='dark']) .amt.is-in {
      color: var(--lime);
    }
    @media (prefers-color-scheme: dark) {
      :host-context(:root:not([data-theme='light'])) .amt.is-in {
        color: var(--lime);
      }
    }
  `,
})
export class TxRow {
  readonly tx = input.required<Transaction>();
  readonly showDate = input(true);
  protected readonly ui = inject(UiService);
  private readonly cats = inject(CategoriesStore);

  protected readonly cat = computed(() => this.cats.get(this.tx().categoryId));
  protected readonly tint = computed(() => {
    const c = this.cat()?.color ?? 7;
    return `color-mix(in srgb, var(--cat-${c}) 28%, var(--surface))`;
  });
  protected readonly day = computed(() => dayLabel(this.tx().date));
}
