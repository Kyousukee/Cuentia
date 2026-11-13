import { Injectable, computed } from '@angular/core';
import { db } from './db';
import { liveSignal } from './live';
import { Category, TxKind } from './models';

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly live = liveSignal(() => db.categories.orderBy('id').toArray(), [] as Category[]);

  readonly all = computed(() => [...this.live.value()].sort((a, b) => a.order - b.order));
  readonly loaded = this.live.loaded;
  readonly expense = computed(() => this.all().filter((c) => c.kind === 'expense'));
  readonly income = computed(() => this.all().filter((c) => c.kind === 'income'));
  readonly byId = computed(() => new Map(this.all().map((c) => [c.id, c])));

  ofKind(kind: TxKind) {
    return kind === 'expense' ? this.expense() : this.income();
  }

  get(id: string): Category | undefined {
    return this.byId().get(id);
  }
}
