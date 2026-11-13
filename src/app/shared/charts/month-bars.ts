import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MonthPoint } from '../../core/analytics';
import { formatCompact } from '../../core/money';
import { monthLabel, monthShort } from '../../core/util';
import { ClpPipe } from '../clp.pipe';

const W = 340;
const H = 210;
const PAD = { top: 14, right: 6, bottom: 28, left: 44 };
const BAR = 13;
const PAIR_GAP = 3;

/** Barras agrupadas: ingresos vs. gastos por mes (un solo eje). */
@Component({
  selector: 'app-month-bars',
  imports: [ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend" aria-hidden="true">
      <span><i class="sw sw--in"></i>Ingresos</span>
      <span><i class="sw sw--out"></i>Gastos</span>
    </div>
    <div class="wrap">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="aria()">
        @for (t of ticks(); track t.v) {
          <line class="grid" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="axis" [attr.x]="PAD.left - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.label }}</text>
        }
        @for (g of groups(); track g.month) {
          <g class="group" [class.is-dim]="active() !== null && active() !== $index" (click)="pick($index)">
            <rect class="hit" [attr.x]="g.x - 4" [attr.y]="PAD.top" [attr.width]="g.w + 8" [attr.height]="H - PAD.top - PAD.bottom" />
            <path class="bar bar--in" [attr.d]="g.inPath" />
            <path class="bar bar--out" [attr.d]="g.outPath" />
            <text class="axis axis--x" [class.is-now]="$last" [attr.x]="g.x + g.w / 2" [attr.y]="H - 8" text-anchor="middle">
              {{ g.short }}
            </text>
          </g>
        }
        <line class="base" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="baseY" [attr.y2]="baseY" />
      </svg>

      @if (tip(); as t) {
        <div class="tip" [style.left.%]="t.left">
          <strong>{{ t.label }}</strong>
          <span><i class="sw sw--in"></i>{{ t.income | clp }}</span>
          <span><i class="sw sw--out"></i>{{ t.expense | clp }}</span>
          <span class="net" [class.neg]="t.net < 0">Neto {{ t.net | clp: 'signed' }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .legend {
      display: flex;
      gap: 16px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-2);
      margin-bottom: 6px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .sw {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 4px;
    }
    .sw--in {
      background: var(--income);
    }
    .sw--out {
      background: var(--expense);
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
    .bar--in {
      fill: var(--income);
    }
    .bar--out {
      fill: var(--expense);
    }
    .tip {
      position: absolute;
      top: -8px;
      transform: translate(-50%, -100%);
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 150px;
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
    .tip span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tip .net {
      color: var(--text-2);
      border-top: 1px dashed var(--line);
      padding-top: 4px;
      margin-top: 2px;
    }
  `,
})
export class MonthBars {
  readonly data = input.required<MonthPoint[]>();

  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD = PAD;
  protected readonly baseY = H - PAD.bottom;
  protected readonly active = signal<number | null>(null);

  private readonly max = computed(() => {
    const m = Math.max(0, ...this.data().flatMap((d) => [d.income, d.expense]));
    if (!m) return 100_000;
    const mag = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / mag) * mag;
  });

  private y(v: number) {
    return this.baseY - (v / this.max()) * (this.baseY - PAD.top);
  }

  protected readonly ticks = computed(() =>
    [0.5, 1].map((f) => {
      const v = this.max() * f;
      return { v, y: this.y(v), label: formatCompact(v) };
    }),
  );

  protected readonly groups = computed(() => {
    const d = this.data();
    const span = (W - PAD.left - PAD.right) / Math.max(1, d.length);
    const w = BAR * 2 + PAIR_GAP;
    return d.map((p, i) => {
      const x = PAD.left + span * i + (span - w) / 2;
      return {
        month: p.month,
        short: monthShort(p.month),
        x,
        w,
        inPath: this.barPath(x, p.income),
        outPath: this.barPath(x + BAR + PAIR_GAP, p.expense),
      };
    });
  });

  protected readonly tip = computed(() => {
    const i = this.active();
    if (i === null) return null;
    const p = this.data()[i];
    const g = this.groups()[i];
    if (!p || !g) return null;
    const left = Math.min(78, Math.max(22, ((g.x + g.w / 2) / W) * 100));
    return { ...p, label: monthLabel(p.month), left };
  });

  protected readonly aria = computed(
    () =>
      'Ingresos y gastos por mes: ' +
      this.data()
        .map((p) => `${monthShort(p.month)} ingresos ${formatCompact(p.income)}, gastos ${formatCompact(p.expense)}`)
        .join('; '),
  );

  protected pick(i: number) {
    this.active.set(this.active() === i ? null : i);
  }

  /** Barra anclada a la base con esquinas superiores redondeadas (4px). */
  private barPath(x: number, v: number): string {
    if (v <= 0) return '';
    const top = this.y(v);
    const h = this.baseY - top;
    const r = Math.min(4, h, BAR / 2);
    const b = this.baseY;
    return `M${x},${b}V${top + r}Q${x},${top} ${x + r},${top}H${x + BAR - r}Q${x + BAR},${top} ${x + BAR},${top + r}V${b}Z`;
  }
}
