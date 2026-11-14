import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCLP } from '../../core/money';
import { PlanType, RecurringPlan } from '../../core/models';
import { nextMonthFor, PlanStatus } from '../../core/plans';
import { PlanDraft, PlansStore, defaultCategory } from '../../core/plans.store';
import { dateInMonth, dayLabel, monthShort, parseISODate, shiftMonth, today } from '../../core/util';
import { Ring } from '../../shared/charts/ring';
import { ClpPipe } from '../../shared/clp.pipe';
import { Sparks, Squiggle } from '../../shared/deco';
import { Icon } from '../../shared/icon';
import { MoneyInput } from '../../shared/money-input';
import { Sheet } from '../../shared/sheet';
import { UiService } from '../../shared/ui.service';

interface Editor {
  id: string | null;
  type: PlanType;
  name: string;
  emoji: string;
  amount: number;
  /** El usuario escribió el valor cuota a mano (no recalcular). */
  amountTouched: boolean;
  day: number;
  totalInstallments: number;
  /** Próxima cuota a pagar. */
  current: number;
  totalPrice: number;
  /** Sueldo: registrar el de este mes si el día ya pasó. */
  includeThisMonth: boolean;
  confirmDelete: boolean;
  deleteTxs: boolean;
}

const EMOJIS: Record<PlanType, string[]> = {
  salary: ['💼', '💰', '🏢', '👩‍💻', '🧑‍🔧', '🩺'],
  loan: ['🏦', '🏠', '🚗', '🎓', '💵', '📄'],
  installment: ['💳', '📺', '📱', '💻', '🛋️', '👟', '🧊', '✈️'],
};

const TITLES: Record<PlanType, string> = {
  salary: 'Sueldo',
  loan: 'Crédito',
  installment: 'Compra en cuotas',
};

const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long' });

@Component({
  selector: 'app-plans',
  imports: [ClpPipe, FormsModule, Icon, Ring, RouterLink, Sheet, MoneyInput, Squiggle, Sparks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plans.html',
  styleUrl: './plans.scss',
})
export class Plans {
  protected readonly store = inject(PlansStore);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly chooser = signal(false);
  protected readonly editor = signal<Editor | null>(null);
  protected readonly titles = TITLES;

  protected readonly emojis = computed(() => EMOJIS[this.editor()?.type ?? 'installment']);
  protected readonly free = computed(() => this.store.monthlySalary() - this.store.monthlyCommitments());
  protected readonly nextOut = computed(() => this.store.upcoming().find((u) => u.plan.type !== 'salary') ?? null);

  /** Texto de vista previa: qué se va a registrar y cuándo. */
  protected readonly preview = computed(() => {
    const e = this.editor();
    if (!e) return '';
    const month = this.startMonthFor(e);
    const date = dateInMonth(month, e.day);
    const when = date <= today() ? 'hoy mismo' : `el ${this.fmtDate(date)}`;
    if (e.type === 'salary') return `Registraremos tu sueldo ${when} y luego cada mes el día ${e.day}.`;
    if (e.current > e.totalInstallments) return 'Esa cuota es mayor que el total de cuotas.';
    const left = e.totalInstallments - e.current + 1;
    return `Cuota ${e.current}/${e.totalInstallments} se registra ${when}. Quedan ${left} ${left === 1 ? 'cuota' : 'cuotas'} (${formatCLP(left * e.amount)}).`;
  });

  protected readonly valid = computed(() => {
    const e = this.editor();
    if (!e || e.amount <= 0 || !e.name.trim()) return false;
    if (e.type === 'salary') return true;
    return e.totalInstallments >= 1 && e.current >= 1 && e.current <= e.totalInstallments;
  });

  constructor() {
    const q = inject(ActivatedRoute).snapshot.queryParamMap.get('nuevo') as PlanType | null;
    if (q && q in TITLES) {
      this.openNew(q);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  protected openNew(type: PlanType) {
    this.chooser.set(false);
    this.editor.set({
      id: null,
      type,
      name: type === 'salary' ? 'Sueldo' : '',
      emoji: EMOJIS[type][0],
      amount: 0,
      amountTouched: false,
      day: type === 'salary' ? 30 : 5,
      totalInstallments: type === 'loan' ? 24 : 6,
      current: 1,
      totalPrice: 0,
      includeThisMonth: true,
      confirmDelete: false,
      deleteTxs: false,
    });
  }

  protected openEdit(s: PlanStatus) {
    const p = s.plan;
    this.editor.set({
      id: p.id,
      type: p.type,
      name: p.name,
      emoji: p.emoji,
      amount: p.amount,
      amountTouched: true,
      day: p.day,
      totalInstallments: p.totalInstallments ?? 1,
      current: s.next?.installment ?? p.totalInstallments ?? 1,
      totalPrice: p.totalPrice ?? 0,
      includeThisMonth: false,
      confirmDelete: false,
      deleteTxs: false,
    });
  }

  protected patch(p: Partial<Editor>) {
    this.editor.update((e) => {
      if (!e) return e;
      const next = { ...e, ...p };
      // Compra en cuotas: valor cuota = precio / nº cuotas, mientras no lo edite a mano.
      if (next.type === 'installment' && !next.amountTouched && next.totalPrice > 0 && next.totalInstallments > 0) {
        next.amount = Math.ceil(next.totalPrice / next.totalInstallments);
      }
      return next;
    });
  }

  protected num(v: unknown, min = 1, max = 600): number {
    const n = Math.floor(Number(v) || 0);
    return Math.min(max, Math.max(min, n));
  }

  private startMonthFor(e: Editor): string {
    const t = today();
    const includePassed = e.type === 'salary' && !e.id && e.includeThisMonth;
    let month = nextMonthFor(e.day, t, includePassed);
    // Al editar, nunca volver a meses ya generados.
    const existing = e.id ? this.store.all().find((s) => s.plan.id === e.id)?.plan : null;
    if (existing?.lastGenerated && month <= existing.lastGenerated) month = shiftMonth(existing.lastGenerated, 1);
    return month;
  }

  protected dayPassed(day: number): boolean {
    const t = today();
    return dateInMonth(t.slice(0, 7), day) < t;
  }

  protected async save() {
    const e = this.editor();
    if (!e || !this.valid()) return;
    const isSalary = e.type === 'salary';
    const draft: PlanDraft = {
      type: e.type,
      name: e.name.trim(),
      emoji: e.emoji,
      amount: e.amount,
      day: e.day,
      categoryId: defaultCategory(e.type),
      totalInstallments: isSalary ? null : e.totalInstallments,
      firstInstallment: isSalary ? 1 : e.current,
      startMonth: this.startMonthFor(e),
      totalPrice: e.type === 'installment' && e.totalPrice > 0 ? e.totalPrice : null,
    };
    const before = this.store.all().length;
    if (e.id) {
      const { categoryId: _c, type: _t, ...patch } = draft;
      await this.store.update(e.id, patch);
    } else {
      await this.store.create(draft);
    }
    this.editor.set(null);
    this.ui.notify(
      e.id ? 'Cambios guardados ✏️' : before === 0 ? '¡Listo! Cuentia lo anotará cada mes 🔁' : `${TITLES[e.type]} agregado 🔁`,
    );
  }

  protected async remove() {
    const e = this.editor();
    if (!e?.id) return;
    await this.store.remove(e.id, e.deleteTxs);
    this.editor.set(null);
    this.ui.notify(e.deleteTxs ? 'Eliminado junto con sus movimientos' : 'Eliminado. Sus movimientos quedan en el historial');
  }

  protected async togglePause(p: RecurringPlan) {
    await this.store.setPaused(p.id, !p.paused);
    this.ui.notify(p.paused ? 'Sueldo reactivado ▶️' : 'Sueldo en pausa ⏸️');
  }

  protected shortMonth(month: string): string {
    return monthShort(month).slice(0, 3);
  }

  protected fmtDate(date: string): string {
    return dateFmt.format(parseISODate(date));
  }

  protected relDay(date: string): string {
    const l = dayLabel(date);
    return l === 'Hoy' || l === 'Ayer' ? l : this.fmtDate(date);
  }
}
