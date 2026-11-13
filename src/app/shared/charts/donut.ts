import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { ClpPipe } from '../clp.pipe';

export interface DonutSlice {
  id: string;
  label: string;
  emoji: string;
  value: number;
  /** Ranura de color 1–8 */
  color: number;
}

const R = 80;
const C = 2 * Math.PI * R;
const GAP = 4;

@Component({
  selector: 'app-donut',
  imports: [ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut" [style.width.px]="size()" [style.height.px]="size()">
      <svg viewBox="0 0 200 200" role="img" [attr.aria-label]="ariaLabel()">
        <circle class="track" cx="100" cy="100" [attr.r]="R" />
        @for (s of arcs(); track s.id) {
          <circle
            class="arc"
            [class.is-dim]="selected() && selected() !== s.id"
            [class.is-on]="selected() === s.id"
            cx="100"
            cy="100"
            [attr.r]="R"
            [style.stroke]="'var(--cat-' + s.color + ')'"
            [attr.stroke-dasharray]="s.dash"
            [attr.stroke-dashoffset]="s.offset"
            (click)="toggle(s.id)"
          >
            <title>{{ s.label }}: {{ s.value | clp }}</title>
          </circle>
        }
      </svg>
      <div class="center">
        @if (active(); as a) {
          <span class="emoji">{{ a.emoji }}</span>
          <strong class="num">{{ a.value | clp: 'compact' }}</strong>
          <small>{{ a.label }} · {{ pct(a.value) }}</small>
        } @else {
          <small>{{ caption() }}</small>
          <strong class="num">{{ total() | clp: 'compact' }}</strong>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .donut {
      position: relative;
      margin: 0 auto;
    }
    svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
      overflow: visible;
    }
    .track {
      fill: none;
      stroke: var(--surface-2);
      stroke-width: 34;
    }
    .arc {
      fill: none;
      stroke-width: 34;
      cursor: pointer;
      transition:
        opacity 200ms ease,
        stroke-width 200ms var(--ease-out);
    }
    .arc.is-dim {
      opacity: 0.3;
    }
    .arc.is-on {
      stroke-width: 42;
    }
    .center {
      position: absolute;
      inset: 22%;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      pointer-events: none;
      line-height: 1.1;
    }
    .center strong {
      font-size: 28px;
    }
    .center small {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-2);
      max-width: 11ch;
    }
    .emoji {
      font-size: 22px;
    }
  `,
})
export class Donut {
  readonly slices = input.required<DonutSlice[]>();
  readonly size = input(220);
  readonly caption = input('Total');
  readonly selected = model<string | null>(null);

  protected readonly R = R;

  protected readonly total = computed(() => this.slices().reduce((s, x) => s + x.value, 0));

  protected readonly arcs = computed(() => {
    const total = this.total();
    const list = this.slices().filter((s) => s.value > 0);
    const gap = list.length > 1 ? GAP : 0;
    let start = 0;
    return list.map((s) => {
      const len = total ? (s.value / total) * C : 0;
      const visible = Math.max(1.5, len - gap);
      const arc = { ...s, dash: `${visible} ${C}`, offset: -start };
      start += len;
      return arc;
    });
  });

  protected readonly active = computed(() => {
    const id = this.selected();
    return id ? (this.slices().find((s) => s.id === id) ?? null) : null;
  });

  protected readonly ariaLabel = computed(
    () =>
      'Gráfico de dona: ' +
      this.slices()
        .map((s) => `${s.label} ${this.pct(s.value)}`)
        .join(', '),
  );

  protected pct(v: number): string {
    const t = this.total();
    return t ? `${Math.round((v / t) * 100)}%` : '0%';
  }

  protected toggle(id: string) {
    this.selected.set(this.selected() === id ? null : id);
  }
}
