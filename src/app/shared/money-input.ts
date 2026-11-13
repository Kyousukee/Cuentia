import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { formatNumber, parseCLP } from '../core/money';

/** Campo de monto CLP con teclado numérico y separador de miles. */
@Component({
  selector: 'app-money-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      <span>{{ label() }}</span>
      <div class="wrap">
        <b aria-hidden="true">$</b>
        <input
          type="text"
          inputmode="numeric"
          autocomplete="off"
          [value]="text()"
          (input)="onInput($event)"
          [placeholder]="placeholder()"
          enterkeyhint="done"
        />
      </div>
    </label>
  `,
  styles: `
    .wrap {
      position: relative;
    }
    b {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--font-display);
      font-size: 24px;
      color: var(--text-3);
    }
    input {
      padding-left: 38px !important;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 26px !important;
      min-height: 62px !important;
    }
  `,
})
export class MoneyInput {
  readonly value = model(0);
  readonly label = input('Monto');
  readonly placeholder = input('0');
  protected readonly text = computed(() => (this.value() ? formatNumber(this.value()) : ''));

  protected onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    const v = Math.min(parseCLP(el.value), 99_999_999_999);
    this.value.set(v);
    el.value = v ? formatNumber(v) : '';
  }
}
