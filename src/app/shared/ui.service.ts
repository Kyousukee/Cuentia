import { Injectable, signal } from '@angular/core';
import { Transaction, TxKind } from '../core/models';

export interface TxSheetState {
  editing: Transaction | null;
  kind: TxKind;
}

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly txSheet = signal<TxSheetState | null>(null);
  readonly toast = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private seq = 0;

  openNewTx(kind: TxKind = 'expense') {
    this.txSheet.set({ editing: null, kind });
  }

  openEditTx(tx: Transaction) {
    this.txSheet.set({ editing: tx, kind: tx.kind });
  }

  closeTx() {
    this.txSheet.set(null);
  }

  notify(message: string, actionLabel?: string, action?: () => void) {
    clearTimeout(this.timer);
    this.toast.set({ id: ++this.seq, message, actionLabel, action });
    this.timer = setTimeout(() => this.toast.set(null), action ? 5000 : 2600);
  }

  dismissToast() {
    clearTimeout(this.timer);
    this.toast.set(null);
  }
}
