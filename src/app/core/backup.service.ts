import { Injectable } from '@angular/core';
import { db } from './db';
import { BackupFile } from './models';
import { SEED_CATEGORIES } from './seed';
import { MONTH_STARTS_KEY } from './transactions.store';
import { today } from './util';

@Injectable({ providedIn: 'root' })
export class BackupService {
  async export(): Promise<void> {
    const data: BackupFile = {
      app: 'cuentia',
      version: 2,
      exportedAt: new Date().toISOString(),
      categories: await db.categories.toArray(),
      transactions: await db.transactions.toArray(),
      budgets: await db.budgets.toArray(),
      goals: await db.goals.toArray(),
      plans: await db.plans.toArray(),
      monthStarts: ((await db.settings.get(MONTH_STARTS_KEY))?.value ?? {}) as Record<string, string>,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], `cuentia-respaldo-${today()}.json`, { type: 'application/json' });

    // En iPhone el menú de compartir permite guardar en Archivos / iCloud.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Respaldo Cuentia' });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Reemplaza todos los datos con los del archivo. Devuelve cuántos movimientos se importaron. */
  async import(file: File): Promise<number> {
    const data = JSON.parse(await file.text()) as Partial<BackupFile>;
    if (data.app !== 'cuentia' || !Array.isArray(data.transactions)) {
      throw new Error('El archivo no es un respaldo válido de Cuentia.');
    }
    await db.transaction('rw', [db.categories, db.transactions, db.budgets, db.goals, db.plans, db.settings], async () => {
      await Promise.all([db.categories.clear(), db.transactions.clear(), db.budgets.clear(), db.goals.clear(), db.plans.clear()]);
      await db.settings.put({ key: MONTH_STARTS_KEY, value: data.monthStarts ?? {} });
      await db.categories.bulkPut(SEED_CATEGORIES);
      await db.categories.bulkPut(data.categories ?? []);
      await db.transactions.bulkPut(data.transactions!);
      await db.budgets.bulkPut(data.budgets ?? []);
      await db.goals.bulkPut(data.goals ?? []);
      await db.plans.bulkPut(data.plans ?? []);
    });
    return data.transactions.length;
  }

  async wipe(): Promise<void> {
    await db.transaction('rw', [db.categories, db.transactions, db.budgets, db.goals, db.plans, db.settings], async () => {
      await Promise.all([db.transactions.clear(), db.budgets.clear(), db.goals.clear(), db.categories.clear(), db.plans.clear()]);
      await db.settings.delete(MONTH_STARTS_KEY);
      await db.categories.bulkPut(SEED_CATEGORIES);
    });
  }
}
