import Dexie, { type EntityTable } from 'dexie';
import { Budget, Category, Goal, Setting, Transaction } from './models';
import { SEED_CATEGORIES } from './seed';

export class CuentiaDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'categoryId'>;
  goals!: EntityTable<Goal, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('cuentia');
    this.version(1).stores({
      transactions: 'id, date, kind, categoryId',
      categories: 'id, kind',
      budgets: 'categoryId',
      goals: 'id',
      settings: 'key',
    });
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(SEED_CATEGORIES);
    });
  }
}

export const db = new CuentiaDB();
