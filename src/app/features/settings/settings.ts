import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackupService } from '../../core/backup.service';
import { PlansStore } from '../../core/plans.store';
import { SettingsStore, ThemePref } from '../../core/settings.store';
import { TransactionsStore } from '../../core/transactions.store';
import { Mark, Squiggle } from '../../shared/deco';
import { Icon, IconName } from '../../shared/icon';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-settings',
  imports: [Icon, Squiggle, Mark, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <a class="back" routerLink="/"><app-icon name="back" [size]="18" [stroke]="3" /> Inicio</a>
          <h1>Ajustes</h1>
          <app-squiggle />
        </div>
      </header>

      <section class="card">
        <h2 class="h">Apariencia</h2>
        <div class="themes" role="group" aria-label="Tema">
          @for (t of themes; track t.value) {
            <button type="button" class="theme" [attr.aria-pressed]="settings.theme() === t.value" (click)="settings.theme.set(t.value)">
              <app-icon [name]="t.icon" [size]="26" />
              <span>{{ t.label }}</span>
            </button>
          }
        </div>
      </section>

      <a class="card fixed-link" routerLink="/pagos">
        <span class="fl-emoji">🔁</span>
        <span class="fl-txt">
          <strong>Pagos fijos</strong>
          <small>Sueldo, créditos y compras en cuotas</small>
        </span>
        <app-icon name="right" [size]="22" [stroke]="3" />
      </a>

      <section class="card card--mint">
        <h2 class="h">📱 Ponla en tu iPhone</h2>
        <ol class="steps">
          <li>Abre Cuentia en <b>Safari</b>.</li>
          <li>Toca <b>Compartir</b> <app-icon name="share" [size]="18" /> en la barra.</li>
          <li>Elige <b>“Agregar a inicio”</b> y listo.</li>
        </ol>
        <p class="note">Tus datos se guardan solo en este dispositivo. Haz respaldos de vez en cuando.</p>
      </section>

      <section class="card">
        <h2 class="h">Respaldo</h2>
        <p class="note">{{ txs.all().length }} movimientos guardados en este dispositivo.</p>
        <div class="actions">
          <button type="button" class="btn btn--navy" (click)="exportData()">
            <app-icon name="download" [size]="20" [stroke]="3" /> Exportar
          </button>
          <label class="btn btn--ghost">
            <app-icon name="upload" [size]="20" [stroke]="3" /> Importar
            <input type="file" accept="application/json,.json" class="visually-hidden" (change)="importData($event)" />
          </label>
        </div>
      </section>

      <section class="card danger">
        <h2 class="h">Zona peligrosa</h2>
        @if (!confirmWipe()) {
          <button type="button" class="btn btn--ghost" (click)="confirmWipe.set(true)">
            <app-icon name="trash" [size]="20" /> Borrar todos los datos
          </button>
        } @else {
          <p class="note"><b>¿Seguro?</b> Se borrarán movimientos, presupuestos y metas. No se puede deshacer.</p>
          <div class="actions">
            <button type="button" class="btn btn--ghost" (click)="confirmWipe.set(false)">Cancelar</button>
            <button type="button" class="btn btn--danger" (click)="wipe()">Sí, borrar</button>
          </div>
        }
      </section>

      <footer class="about">
        <app-mark [size]="56" />
        <strong>Cuentia</strong>
        <span>Tus cuentas, más simples.</span>
      </footer>
    </div>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--link);
      text-decoration: none;
      padding: 6px 0;
    }
    .fixed-link {
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
      background: var(--sun);
      color: var(--navy);
    }
    .fl-emoji {
      font-size: 32px;
    }
    .fl-txt {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .fl-txt strong {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 20px;
    }
    .fl-txt small {
      font-weight: 700;
    }
    .h {
      font-size: 22px;
      margin-bottom: 14px;
    }
    .themes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .theme {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 6px;
      border: 2.5px solid var(--ink);
      border-radius: 18px;
      background: var(--surface);
      font-weight: 800;
      transition: transform 160ms var(--ease-spring);
    }
    .theme[aria-pressed='true'] {
      background: var(--lime);
      color: var(--navy);
      box-shadow: 2px 3px 0 var(--ink);
      transform: rotate(-2deg);
    }
    .steps {
      margin: 0 0 12px;
      padding-left: 22px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-weight: 700;
    }
    .steps app-icon {
      vertical-align: -3px;
    }
    .note {
      color: var(--text-2);
      font-weight: 600;
      margin-bottom: 14px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .danger {
      border-style: dashed;
      box-shadow: none;
    }
    .danger .btn--ghost:first-child:last-child {
      color: var(--danger);
    }
    .about {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 10px 0;
      color: var(--text-3);
      font-weight: 700;
    }
    .about strong {
      font-family: var(--font-display);
      font-size: 22px;
      color: var(--text);
    }
  `,
})
export class Settings {
  protected readonly settings = inject(SettingsStore);
  protected readonly txs = inject(TransactionsStore);
  private readonly backup = inject(BackupService);
  private readonly ui = inject(UiService);
  private readonly plans = inject(PlansStore);

  protected readonly confirmWipe = signal(false);
  protected readonly themes: { value: ThemePref; label: string; icon: IconName }[] = [
    { value: 'system', label: 'Auto', icon: 'phone' },
    { value: 'light', label: 'Claro', icon: 'sun' },
    { value: 'dark', label: 'Oscuro', icon: 'moon' },
  ];

  protected async exportData() {
    await this.backup.export();
  }

  protected async importData(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const n = await this.backup.import(file);
      await this.plans.sync();
      this.ui.notify(`Respaldo restaurado: ${n} movimientos ✅`);
    } catch (err) {
      this.ui.notify((err as Error).message || 'No se pudo importar el archivo');
    }
  }

  protected async wipe() {
    await this.backup.wipe();
    this.confirmWipe.set(false);
    this.ui.notify('Datos borrados. Empezamos de cero 🌱');
  }
}
