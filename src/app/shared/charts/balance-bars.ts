import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatCompact } from '../../core/money';
import { monthLabel, monthShort } from '../../core/util';
import { ClpPipe } from '../clp.pipe';

const W = 340;
const H = 200;
const PAD = { top: 14, right: 6, bottom: 28, left: 44 };
const BAR = 16;

export interface BalancePoint {
  /** `YYYY-MM` */
  month: string;
  value: number;
}

/** Barras de una serie (saldo por mes) con línea base en 0; los negativos bajan y van en color de alerta. */
@Component({
  selector: 'app-balance-bars',
  imports: [ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="aria()">
        @for (t of ticks(); track t.v) {
          <line class="grid" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="axis" [attr.x]="PAD.left - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.label }}</text>
        }
        @for (b of bars(); track b.month) {
          <g class="group" [class.is-dim]="active() !== null && active() !== $index" (click)="pick($index)">
            <rect class="hit" [attr.x]="b.x - 4" [attr.y]="PAD.top" [attr.width]="BAR + 8" [attr.height]="H - PAD.top - PAD.bottom" />
            <path class="bar" [class.bar--neg]="b.value < 0" [attr.d]="b.path" />
            <text class="axis axis--x" [class.is-now]="$first" [attr.x]="b.x + BAR / 2" [attr.y]="H - 8" text-anchor="middle">
              {{ b.short }}
            </text>
          </g>
        }
        <line class="base" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="zeroY()" [attr.y2]="zeroY()" />
      </svg>

      @if (tip(); as t) {
        <div class="tip" [style.left.%]="t.left">
          <strong>{{ t.label }}</strong>
          <span [class.neg]="t.value < 0">{{ t.value | clp }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .wrap {
      position: relative;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      overflow: visible;
    }
    .grid {
      stroke: var(--line);
      stroke-width: 1;
      stroke-dasharray: 3 4;
    }
    .base {
      stroke: var(--text-3);
      stroke-width: 1.5;
    }
    .axis {
      font-size: 11px;
      font-weight: 700;
      fill: var(--text-3);
      font-family: var(--font-body);
    }
    .axis--x.is-now {
      fill: var(--text);
    }
    .hit {
      fill: transparent;
    }
    .group {
      cursor: pointer;
      transition: opacity 180ms ease;
    }
    .group.is-dim {
      opacity: 0.35;
    }
    .bar {
      fill: var(--income);
    }
    .bar--neg {
      fill: var(--danger);
    }
    .tip {
      position: absolute;
      top: -8px;
      transform: translate(-50%, -100%);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 130px;
      padding: 10px 12px;
      background: var(--surface);
      color: var(--text);
      border: 2.5px solid var(--ink);
      border-radius: 14px;
      box-shadow: 3px 4px 0 var(--ink);
      font-size: 14px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
      z-index: 2;
      white-space: nowrap;
    }
    .tip strong {
      font-family: var(--font-display);
      font-size: 15px;
    }
    .tip .neg {
      color: var(--danger);
    }
  `,
})
export class BalanceBars {
  readonly data = input.required<BalancePoint[]>();

  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD = PAD;
  protected readonly BAR = BAR;
  protected readonly active = signal<number | null>(null);

  /** Redondea hacia arriba a 1 cifra significativa (ej. 2.340.000 → 3.000.000). */
  private nice(v: number): number {
    if (v <= 0) return 0;
    const mag = 10 ** Math.floor(Math.log10(v));
    return Math.ceil(v / mag) * mag;
  }

  private readonly range = computed(() => {
    const values = this.data().map((d) => d.value);
    const hi = this.nice(Math.max(0, ...values));
    const lo = -this.nice(-Math.min(0, ...values));
    return hi === lo ? { hi: 100_000, lo: 0 } : { hi, lo };
  });

  private y(v: number) {
    const { hi, lo } = this.range();
    const bottom = H - PAD.bottom;
    return bottom - ((v - lo) / (hi - lo)) * (bottom - PAD.top);
  }

  protected readonly zeroY = computed(() => this.y(0));

  protected readonly ticks = computed(() => {
    const { hi, lo } = this.range();
    return [hi, lo].filter((v) => v !== 0).map((v) => ({ v, y: this.y(v), label: formatCompact(v) }));
  });

  protected readonly bars = computed(() => {
    const d = this.data();
    const span = (W - PAD.left - PAD.right) / Math.max(1, d.length);
    return d.map((p, i) => {
      const x = PAD.left + span * i + (span - BAR) / 2;
      return { month: p.month, value: p.value, short: monthShort(p.month), x, path: this.barPath(x, p.value) };
    });
  });

  protected readonly tip = computed(() => {
    const i = this.active();
    if (i === null) return null;
    const b = this.bars()[i];
    if (!b) return null;
    const left = Math.min(80, Math.max(20, ((b.x + BAR / 2) / W) * 100));
    return { label: monthLabel(b.month), value: b.value, left };
  });

  protected readonly aria = computed(
    () =>
      'Saldo estimado por mes: ' +
      this.data()
        .map((p) => `${monthShort(p.month)} ${formatCompact(p.value)}`)
        .join('; '),
  );

  protected pick(i: number) {
    this.active.set(this.active() === i ? null : i);
  }

  /** Barra anclada en 0 con las esquinas del extremo redondeadas (4px). */
  private barPath(x: number, v: number): string {
    if (v === 0) return '';
    const z = this.zeroY();
    const end = this.y(v);
    const h = Math.abs(z - end);
    const r = Math.min(4, h, BAR / 2);
    const s = v > 0 ? 1 : -1; // hacia arriba (1) o hacia abajo (-1)
    return (
      `M${x},${z}V${end + s * r}` +
      `Q${x},${end} ${x + r},${end}H${x + BAR - r}` +
      `Q${x + BAR},${end} ${x + BAR},${end + s * r}V${z}Z`
    );
  }
}
