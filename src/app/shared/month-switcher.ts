import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { monthLabel, shiftMonth } from '../core/util';
import { Icon } from './icon';

@Component({
  selector: 'app-month-switcher',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ms">
      <button type="button" class="icon-btn" (click)="month.set(prev())" aria-label="Mes anterior">
        <app-icon name="left" [size]="22" [stroke]="3" />
      </button>
      <strong aria-live="polite">{{ label() }}</strong>
      <button type="button" class="icon-btn" (click)="month.set(next())" [disabled]="atMax()" aria-label="Mes siguiente">
        <app-icon name="right" [size]="22" [stroke]="3" />
      </button>
    </div>
  `,
  styles: `
    .ms {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px;
      border: var(--border);
      border-radius: 22px;
      background: var(--surface);
    }
    strong {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 20px;
    }
    .icon-btn {
      width: 44px;
      height: 44px;
      box-shadow: none;
      border-width: 2.5px;
      background: var(--surface-2);
    }
    .icon-btn:disabled {
      opacity: 0.35;
    }
  `,
})
export class MonthSwitcher {
  readonly month = model.required<string>();
  readonly max = input<string | null>(null);
  protected readonly label = computed(() => monthLabel(this.month()));
  protected readonly prev = computed(() => shiftMonth(this.month(), -1));
  protected readonly next = computed(() => shiftMonth(this.month(), 1));
  protected readonly atMax = computed(() => !!this.max() && this.month() >= this.max()!);
}
