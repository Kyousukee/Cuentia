import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlansStore } from './core/plans.store';
import { SettingsStore } from './core/settings.store';
import { TabBar } from './layout/tab-bar';
import { Toaster } from './layout/toaster';
import { TxSheet } from './shared/tx-sheet';
import { UiService } from './shared/ui.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TabBar, TxSheet, Toaster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <router-outlet />
    </main>
    <app-tab-bar />
    <app-toaster />
    @if (ui.txSheet()) {
      <app-tx-sheet />
    }
  `,
})
export class App {
  protected readonly ui = inject(UiService);
  // Inicializa el tema al arrancar.
  private readonly settings = inject(SettingsStore);
  private readonly plans = inject(PlansStore);

  constructor() {
    this.syncPlans();
    const onVisible = () => document.visibilityState === 'visible' && this.syncPlans();
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }

  /** Agrega sueldos y cuotas que vencieron desde la última vez que se abrió la app. */
  private async syncPlans() {
    try {
      const n = await this.plans.sync();
      if (n) this.ui.notify(n === 1 ? 'Se agregó 1 pago automático 🔁' : `Se agregaron ${n} pagos automáticos 🔁`);
    } catch (e) {
      console.error('[Cuentia] Error generando pagos fijos', e);
    }
  }
}
