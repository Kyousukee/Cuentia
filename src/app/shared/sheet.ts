import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';

/** Hoja inferior estilo iOS. Se cierra con el fondo, el botón o arrastrando hacia abajo. */
@Component({
  selector: 'app-sheet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div class="scrim" [class.is-leaving]="leaving()" (click)="close()"></div>
    <section
      #panel
      class="panel"
      [class.is-leaving]="leaving()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      [style.transform]="drag() ? 'translateY(' + drag() + 'px)' : null"
    >
      <header
        class="head"
        (touchstart)="dragStart($event)"
        (touchmove)="dragMove($event)"
        (touchend)="dragEnd()"
      >
        <span class="grip" aria-hidden="true"></span>
        <h2>{{ title() }}</h2>
        <button type="button" class="icon-btn close" (click)="close()" aria-label="Cerrar">
          <app-icon name="x" [size]="22" />
        </button>
      </header>
      <div class="body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(10, 17, 36, 0.55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      animation: fade 220ms ease both;
    }
    .scrim.is-leaving {
      animation: fade 200ms ease reverse both;
    }
    .panel {
      position: relative;
      width: 100%;
      max-width: 640px;
      max-height: calc(100dvh - var(--safe-top) - 16px);
      display: flex;
      flex-direction: column;
      background: var(--bg);
      border: var(--border);
      border-bottom: 0;
      border-radius: var(--r-xl) var(--r-xl) 0 0;
      box-shadow: 0 -6px 0 var(--ink);
      animation: up 380ms var(--ease-out) both;
      transition: transform 120ms linear;
    }
    .panel.is-leaving {
      animation: down 220ms ease-in both;
    }
    .head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 18px 10px;
      touch-action: none;
    }
    .head h2 {
      font-size: 28px;
    }
    .grip {
      position: absolute;
      top: 9px;
      left: 50%;
      width: 46px;
      height: 6px;
      margin-left: -23px;
      border-radius: 99px;
      background: var(--text-3);
      opacity: 0.5;
    }
    .close {
      width: 42px;
      height: 42px;
      border-radius: 14px;
    }
    .body {
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 6px 18px calc(var(--safe-bottom) + 22px);
    }
    @keyframes up {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes down {
      to {
        transform: translateY(100%);
      }
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class Sheet {
  readonly title = input('');
  readonly closed = output<void>();

  protected readonly leaving = signal(false);
  protected readonly drag = signal(0);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private startY = 0;
  private prevFocus: HTMLElement | null = null;

  constructor() {
    this.prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => (document.body.style.overflow = ''));
    afterNextRender(() => this.panel().nativeElement.querySelector<HTMLElement>('.close')?.focus({ preventScroll: true }));
  }

  close() {
    if (this.leaving()) return;
    this.leaving.set(true);
    setTimeout(() => {
      document.body.style.overflow = '';
      this.prevFocus?.focus?.({ preventScroll: true });
      this.closed.emit();
    }, 200);
  }

  protected dragStart(e: TouchEvent) {
    this.startY = e.touches[0].clientY;
  }

  protected dragMove(e: TouchEvent) {
    this.drag.set(Math.max(0, e.touches[0].clientY - this.startY));
  }

  protected dragEnd() {
    if (this.drag() > 90) this.close();
    else this.drag.set(0);
  }
}
