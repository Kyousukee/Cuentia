import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../shared/icon';
import { UiService } from '../shared/ui.service';

interface Tab {
  path: string;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabbar" aria-label="Principal">
      @for (t of left; track t.path) {
        <a class="tab" [routerLink]="t.path" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: t.path === '/' }" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">
          <span class="ico"><app-icon [name]="t.icon" [size]="24" /></span>
          <span class="lbl">{{ t.label }}</span>
        </a>
      }
      <button type="button" class="fab" (click)="ui.openNewTx()" aria-label="Agregar movimiento">
        <app-icon name="plus" [size]="34" [stroke]="3.4" />
      </button>
      @for (t of right; track t.path) {
        <a class="tab" [routerLink]="t.path" routerLinkActive="is-active" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">
          <span class="ico"><app-icon [name]="t.icon" [size]="24" /></span>
          <span class="lbl">{{ t.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      padding: 0 12px calc(var(--safe-bottom) + 10px);
      pointer-events: none;
    }
    .tabbar {
      pointer-events: auto;
      max-width: 520px;
      margin: 0 auto;
      height: var(--tabbar-h);
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      align-items: center;
      background: var(--navy);
      border: 3px solid var(--ink);
      border-radius: 30px;
      box-shadow: 0 6px 0 var(--ink), 0 18px 40px -12px rgba(15, 24, 48, 0.55);
      padding: 0 6px;
    }
    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-decoration: none;
      color: #9fb0c9;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 11.5px;
      letter-spacing: -0.01em;
      white-space: nowrap;
      padding: 6px 0;
      transition: color 160ms;
    }
    .ico {
      display: grid;
      place-items: center;
      width: 46px;
      height: 32px;
      border-radius: 999px;
      transition:
        background-color 200ms,
        transform 260ms var(--ease-spring);
    }
    .tab.is-active {
      color: #fff;
    }
    .tab.is-active .ico {
      background: var(--lime);
      color: var(--navy);
      transform: translateY(-2px);
    }
    .fab {
      justify-self: center;
      display: grid;
      place-items: center;
      width: 70px;
      height: 70px;
      border-radius: 24px;
      border: 3px solid var(--ink);
      background: var(--brand-gradient);
      color: var(--navy);
      /* anillo del color de fondo para que se despegue de la barra */
      box-shadow:
        0 0 0 5px var(--bg),
        0 10px 0 2px var(--ink);
      transform: translateY(-30px) rotate(-6deg);
      transition:
        transform 200ms var(--ease-spring),
        box-shadow 120ms;
    }
    .fab:active {
      transform: translateY(-26px) rotate(0deg) scale(0.96);
      box-shadow:
        0 0 0 5px var(--bg),
        0 4px 0 2px var(--ink);
    }
    :host-context([data-theme='dark']) .tabbar {
      background: #0a1226;
    }
  `,
})
export class TabBar {
  protected readonly ui = inject(UiService);
  protected readonly left: Tab[] = [
    { path: '/', label: 'Inicio', icon: 'home' },
    { path: '/movimientos', label: 'Historial', icon: 'list' },
  ];
  protected readonly right: Tab[] = [
    { path: '/presupuestos', label: 'Presupuesto', icon: 'wallet' },
    { path: '/metas', label: 'Metas', icon: 'target' },
  ];
}
