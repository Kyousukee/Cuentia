import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiService } from '../shared/ui.service';

@Component({
  selector: 'app-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" role="status" aria-live="polite">
      @if (ui.toast(); as t) {
        @for (k of [t.id]; track k) {
          <div class="toast">
            <span>{{ t.message }}</span>
            @if (t.action) {
              <button type="button" (click)="run()">{{ t.actionLabel }}</button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 26px);
      z-index: 60;
      display: flex;
      justify-content: center;
      padding: 0 16px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: 480px;
      padding: 12px 14px 12px 18px;
      background: var(--sun);
      color: var(--navy);
      border: 3px solid var(--ink);
      border-radius: 20px;
      box-shadow: 3px 5px 0 var(--ink);
      font-weight: 800;
      animation: in 380ms var(--ease-spring) both;
    }
    button {
      border: 2.5px solid var(--navy);
      background: var(--navy);
      color: #fff;
      border-radius: 999px;
      min-height: 36px;
      padding: 0 14px;
      font-family: var(--font-display);
      font-weight: 600;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.9) rotate(-2deg);
      }
    }
  `,
})
export class Toaster {
  protected readonly ui = inject(UiService);
  run() {
    this.ui.toast()?.action?.();
    this.ui.dismissToast();
  }
}
