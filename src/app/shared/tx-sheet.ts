import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriesStore } from '../core/categories.store';
import { formatNumber } from '../core/money';
import { TxKind } from '../core/models';
import { TransactionsStore } from '../core/transactions.store';
import { today } from '../core/util';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { UiService } from './ui.service';

const MAX_DIGITS = 11;

@Component({
  selector: 'app-tx-sheet',
  imports: [Sheet, Icon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tx-sheet.html',
  styleUrl: './tx-sheet.scss',
})
export class TxSheet {
  private readonly ui = inject(UiService);
  private readonly txs = inject(TransactionsStore);
  protected readonly cats = inject(CategoriesStore);

  private readonly state = this.ui.txSheet()!;
  protected readonly editing = this.state.editing;

  protected readonly kind = signal<TxKind>(this.state.kind);
  protected readonly digits = signal(this.editing ? String(this.editing.amount) : '');
  protected readonly categoryId = signal<string | null>(this.editing?.categoryId ?? null);
  protected date = this.editing?.date ?? today();
  protected note = this.editing?.note ?? '';
  protected readonly saving = signal(false);
  protected readonly bump = signal(0);

  protected readonly amount = computed(() => Number(this.digits() || '0'));
  protected readonly display = computed(() => formatNumber(this.amount()));
  protected readonly options = computed(() => this.cats.ofKind(this.kind()));
  protected readonly canSave = computed(() => this.amount() > 0 && !!this.categoryId() && !this.saving());
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'] as const;

  constructor() {
    // Si cambia el tipo, elige la primera categoría válida.
    effect(() => {
      const opts = this.options();
      const current = this.categoryId();
      if (opts.length && !opts.some((c) => c.id === current)) this.categoryId.set(opts[0].id);
    });
  }

  protected press(k: (typeof this.keys)[number]) {
    const d = this.digits();
    if (k === 'del') this.digits.set(d.slice(0, -1));
    else if (!d && k.startsWith('0')) return;
    else if ((d + k).length <= MAX_DIGITS) this.digits.set(d + k);
    this.bump.update((n) => n + 1);
    navigator.vibrate?.(8);
  }

  protected onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    if (/^\d$/.test(e.key)) this.press(e.key as (typeof this.keys)[number]);
    else if (e.key === 'Backspace') this.press('del');
    else if (e.key === 'Enter' && this.canSave()) this.save();
  }

  protected async save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    const draft = {
      kind: this.kind(),
      amount: this.amount(),
      categoryId: this.categoryId()!,
      date: this.date || today(),
      note: this.note.trim(),
    };
    if (this.editing) {
      await this.txs.update(this.editing.id, draft);
      this.ui.notify('Movimiento actualizado ✏️');
    } else {
      await this.txs.add(draft);
      this.ui.notify(draft.kind === 'income' ? '¡Ingreso guardado! 💸' : 'Gasto anotado ✅');
    }
    this.ui.closeTx();
  }

  protected async remove() {
    const tx = this.editing;
    if (!tx) return;
    await this.txs.remove(tx.id);
    this.ui.closeTx();
    this.ui.notify('Movimiento eliminado', 'Deshacer', () => this.txs.restore(tx));
  }

  protected close() {
    this.ui.closeTx();
  }
}
