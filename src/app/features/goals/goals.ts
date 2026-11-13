import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GoalDraft, GoalView, GoalsStore } from '../../core/goals.store';
import { ColorSlot } from '../../core/models';
import { daysUntil } from '../../core/util';
import { Ring } from '../../shared/charts/ring';
import { ClpPipe } from '../../shared/clp.pipe';
import { Sparks, Squiggle } from '../../shared/deco';
import { Icon } from '../../shared/icon';
import { MoneyInput } from '../../shared/money-input';
import { Sheet } from '../../shared/sheet';
import { UiService } from '../../shared/ui.service';

interface GoalEditor extends GoalDraft {
  id: string | null;
}

interface Contribution {
  view: GoalView;
  amount: number;
}

const EMOJIS = ['🏖️', '🚗', '🏠', '💻', '🎓', '💍', '✈️', '🐶', '🎸', '🛟', '📱', '🎁'];

@Component({
  selector: 'app-goals',
  imports: [ClpPipe, DecimalPipe, FormsModule, Icon, Ring, Sheet, MoneyInput, Squiggle, Sparks],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './goals.html',
  styleUrl: './goals.scss',
})
export class Goals {
  protected readonly store = inject(GoalsStore);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly emojis = EMOJIS;
  protected readonly colors: ColorSlot[] = [1, 3, 6, 4, 2, 5, 7, 8];
  protected readonly editor = signal<GoalEditor | null>(null);
  protected readonly contrib = signal<Contribution | null>(null);

  constructor() {
    if (inject(ActivatedRoute).snapshot.queryParamMap.has('nueva')) {
      this.openNew();
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  protected openNew() {
    this.editor.set({ id: null, name: '', emoji: EMOJIS[0], target: 0, deadline: null, color: 1 });
  }

  protected openEdit(v: GoalView) {
    const { id, name, emoji, target, deadline, color } = v.goal;
    this.editor.set({ id, name, emoji, target, deadline, color });
  }

  protected patch(p: Partial<GoalEditor>) {
    this.editor.update((e) => (e ? { ...e, ...p } : e));
  }

  protected async saveGoal() {
    const e = this.editor();
    if (!e || !e.name.trim() || e.target <= 0) return;
    const draft: GoalDraft = {
      name: e.name.trim(),
      emoji: e.emoji,
      target: e.target,
      deadline: e.deadline || null,
      color: e.color,
    };
    if (e.id) await this.store.update(e.id, draft);
    else await this.store.create(draft);
    this.editor.set(null);
    this.ui.notify(e.id ? 'Meta actualizada' : '¡Meta creada! A ahorrar 💪');
  }

  protected async removeGoal() {
    const e = this.editor();
    if (!e?.id) return;
    await this.store.remove(e.id);
    this.editor.set(null);
    this.ui.notify('Meta eliminada');
  }

  protected openContrib(view: GoalView) {
    this.contrib.set({ view, amount: 0 });
  }

  protected async applyContrib(sign: 1 | -1) {
    const c = this.contrib();
    if (!c || c.amount <= 0) return;
    const wasDone = c.view.done;
    await this.store.contribute(c.view.goal.id, c.amount * sign);
    this.contrib.set(null);
    const reached = sign > 0 && !wasDone && c.view.saved + c.amount >= c.view.goal.target;
    this.ui.notify(reached ? '🎉 ¡Meta cumplida! Eres un crack' : sign > 0 ? 'Aporte guardado 🌱' : 'Retiro registrado');
  }

  protected deadlineText(v: GoalView): string | null {
    const d = v.goal.deadline;
    if (!d || v.done) return null;
    const days = daysUntil(d);
    if (days < 0) return 'Fecha cumplida';
    if (days === 0) return 'Vence hoy';
    const months = Math.max(1, Math.ceil(days / 30.44));
    const per = Math.ceil(v.remaining / months);
    const perTxt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(per);
    return days < 45 ? `Quedan ${days} días · ${perTxt}` : `${months} meses · ${perTxt}/mes`;
  }
}
