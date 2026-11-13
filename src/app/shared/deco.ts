import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Los dos "destellos" del logo. */
@Component({
  selector: 'app-sparks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-block;line-height:0' },
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" fill="none">
    <path d="M22 4l6 10M6 17l11 5" [attr.stroke]="color()" stroke-width="6" stroke-linecap="round" />
  </svg>`,
})
export class Sparks {
  readonly size = input(34);
  readonly color = input('var(--lime)');
}

/** Subrayado ondulado del tagline del logo. */
@Component({
  selector: 'app-squiggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'squiggle' },
  template: `<svg width="100%" height="100%" viewBox="0 0 120 12" preserveAspectRatio="none" fill="none">
    <path d="M3 9C35 3 80 2 117 5" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
  </svg>`,
})
export class Squiggle {}

/** Marca "C" del logo, simplificada como vector. */
@Component({
  selector: 'app-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-block;line-height:0' },
  template: `<img src="brand/cuentia-mark.png" [width]="size()" [height]="size() * 0.81" alt="" decoding="async" />`,
})
export class Mark {
  readonly size = input(44);
}
