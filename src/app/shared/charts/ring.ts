import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let seq = 0;

/** Anillo de progreso 0–1 con el gradiente de marca. */
@Component({
  selector: 'app-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="gid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5be07a" />
          <stop offset="0.5" stop-color="#22c46e" />
          <stop offset="1" stop-color="#0e8f7e" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" class="track" />
      <circle
        cx="50"
        cy="50"
        r="40"
        class="val"
        [attr.stroke]="'url(#' + gid + ')'"
        [attr.stroke-dasharray]="dash()"
      />
    </svg>
    <div class="label"><ng-content /></div>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-grid;
      place-items: center;
      flex: none;
    }
    svg {
      transform: rotate(-90deg);
      display: block;
    }
    .track {
      fill: none;
      stroke: var(--surface-2);
      stroke-width: 12;
    }
    .val {
      fill: none;
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dasharray 700ms var(--ease-out);
    }
    .label {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      text-align: center;
    }
  `,
})
export class Ring {
  readonly value = input(0);
  readonly size = input(84);
  protected readonly gid = `ring-g-${++seq}`;
  private readonly C = 2 * Math.PI * 40;
  protected readonly dash = computed(() => {
    const v = Math.min(1, Math.max(0, this.value()));
    return `${v * this.C} ${this.C}`;
  });
}
