import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
