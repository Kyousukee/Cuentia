import { Injectable, computed, inject, signal } from '@angular/core';
import { db } from './db';
import { liveSignal } from './live';
import { PlanType, RecurringPlan, Transaction } from './models';
import { Charge, dueCharges, planStatus, upcomingCharges } from './plans';
import { TransactionsStore } from './transactions.store';
import { today, uid } from './util';

export type PlanDraft = Omit<RecurringPlan, 'id' | 'createdAt' | 'lastGenerated' | 'paused'>;

export interface UpcomingItem {
  plan: RecurringPlan;
  charge: Charge;
}

const DEFAULT_CATEGORY: Record<PlanType, string> = {
  salary: 'sueldo',
  loan: 'creditos',
  installment: 'cuotas',
};

export function defaultCategory(type: PlanType) {
  return DEFAULT_CATEGORY[type];
}

/** Texto de la nota del movimiento generado. */
export function chargeNote(plan: RecurringPlan, installment: number | null): string {
  if (plan.type === 'salary') return plan.name || 'Sueldo';
  return `${plan.name} · cuota ${installment}/${plan.totalInstallments}`;
}

@Injectable({ providedIn: 'root' })
export class PlansStore {
  private readonly txs = inject(TransactionsStore);
  private readonly live = liveSignal(() => db.plans.toArray(), [] as RecurringPlan[]);

  /** Fecha de referencia; se refresca al sincronizar. */
  private readonly now = signal(today());

  readonly loaded = this.live.loaded;
  readonly all = computed(() =>
    [...this.live.value()].sort((a, b) => a.createdAt - b.createdAt).map((p) => planStatus(p)),
  );
  readonly salary = computed(() => this.all().filter((s) => s.plan.type === 'salary'));
  readonly loans = computed(() => this.all().filter((s) => s.plan.type === 'loan'));
  readonly installments = computed(() => this.all().filter((s) => s.plan.type === 'installment'));

  /** Deuda pendiente total (créditos + compras en cuotas). */
  readonly totalDebt = computed(() => this.all().reduce((s, x) => s + x.debt, 0));

  /** Lo que sale este mes en cuotas y créditos activos. */
  readonly monthlyCommitments = computed(() =>
    this.all()
      .filter((s) => s.plan.type !== 'salary' && !s.finished && !s.plan.paused)
      .reduce((sum, s) => sum + s.plan.amount, 0),
  );

  readonly monthlySalary = computed(() =>
    this.salary()
      .filter((s) => !s.plan.paused)
      .reduce((sum, s) => sum + s.plan.amount, 0),
  );

  /** Próximos cargos y depósitos (30 días), por fecha. */
  readonly upcoming = computed<UpcomingItem[]>(() =>
    this.all()
      .flatMap((s) => upcomingCharges(s.plan, this.now(), 30).map((charge) => ({ plan: s.plan, charge })))
      .sort((a, b) => (a.charge.date < b.charge.date ? -1 : 1)),
  );

  private syncing: Promise<number> | null = null;

  async create(draft: PlanDraft): Promise<void> {
    await db.plans.add({
      ...draft,
      amount: Math.round(draft.amount),
      id: uid(),
      lastGenerated: null,
      paused: false,
      createdAt: Date.now(),
    });
    await this.sync();
  }

  async update(id: string, patch: Partial<PlanDraft>): Promise<void> {
    await db.plans.update(id, patch);
    await this.sync();
  }

  async setPaused(id: string, paused: boolean): Promise<void> {
    await db.plans.update(id, { paused });
    if (!paused) await this.sync();
  }

  /** Elimina el plan. Los movimientos ya generados se mantienen salvo que se pida lo contrario. */
  async remove(id: string, withTransactions = false): Promise<void> {
    await db.transaction('rw', db.plans, db.transactions, async () => {
      await db.plans.delete(id);
      if (withTransactions) await db.transactions.where('planId').equals(id).delete();
    });
  }

  /**
   * Genera los movimientos vencidos de todos los planes. Es idempotente:
   * cada plan recuerda el último mes generado. Devuelve cuántos movimientos creó.
   */
  sync(): Promise<number> {
    this.syncing ??= this.runSync().finally(() => (this.syncing = null));
    return this.syncing;
  }

  private async runSync(): Promise<number> {
    const t = today();
    this.now.set(t);
    this.txs.currentMonth.set(t.slice(0, 7));
    let created = 0;
    await db.transaction('rw', db.plans, db.transactions, async () => {
      const plans = await db.plans.toArray();
      for (const plan of plans) {
        const due = dueCharges(plan, t);
        if (!due.length) continue;
        const rows: Transaction[] = due.map((c, i) => ({
          id: `${plan.id}-${c.month}`,
          kind: plan.type === 'salary' ? 'income' : 'expense',
          amount: plan.amount,
          categoryId: plan.categoryId,
          date: c.date,
          note: chargeNote(plan, c.installment),
          createdAt: Date.now() + i,
          planId: plan.id,
          ...(c.installment !== null ? { installment: c.installment } : {}),
        }));
        await db.transactions.bulkPut(rows);
        await db.plans.update(plan.id, { lastGenerated: due[due.length - 1].month });
        created += rows.length;
      }
    });
    return created;
  }
}
