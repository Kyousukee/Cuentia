import Dexie, { type EntityTable } from 'dexie';
import { Budget, Category, Goal, RecurringPlan, Setting, Transaction } from './models';
import { SEED_CATEGORIES } from './seed';

export class CuentiaDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'categoryId'>;
  goals!: EntityTable<Goal, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  plans!: EntityTable<RecurringPlan, 'id'>;

  constructor() {
    super('cuentia');
    this.version(1).stores({
      transactions: 'id, date, kind, categoryId',
      categories: 'id, kind',
      budgets: 'categoryId',
      goals: 'id',
      settings: 'key',
    });
    // v2: pagos fijos (cuotas, créditos, sueldo) + categorías nuevas.
    this.version(2)
      .stores({
        transactions: 'id, date, kind, categoryId, planId',
        plans: 'id, type',
      })
      .upgrade(async (tx) => {
        const cats = tx.table<Category, string>('categories');
        for (const c of SEED_CATEGORIES) {
          if (!(await cats.get(c.id))) await cats.add(c);
        }
        const otros = await cats.get('otros-g');
        if (otros) await cats.update('otros-g', { order: 9 });
      });
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(SEED_CATEGORIES);
    });
  }
}

export const db = new CuentiaDB();
