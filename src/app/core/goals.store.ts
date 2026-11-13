import { Injectable, computed } from '@angular/core';
import { goalProgress, goalSaved } from './analytics';
import { db } from './db';
import { liveSignal } from './live';
import { ColorSlot, Goal } from './models';
import { today, uid } from './util';

export interface GoalDraft {
  name: string;
  emoji: string;
  target: number;
  deadline: string | null;
  color: ColorSlot;
}

export interface GoalView {
  goal: Goal;
  saved: number;
  progress: number;
  remaining: number;
  done: boolean;
}

@Injectable({ providedIn: 'root' })
export class GoalsStore {
  private readonly live = liveSignal(() => db.goals.toArray(), [] as Goal[]);

  readonly loaded = this.live.loaded;
  readonly all = computed<GoalView[]>(() =>
    [...this.live.value()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((goal) => {
        const saved = goalSaved(goal);
        return {
          goal,
          saved,
          progress: goalProgress(goal),
          remaining: Math.max(0, goal.target - saved),
          done: saved >= goal.target,
        };
      }),
  );
  readonly totalSaved = computed(() => this.all().reduce((s, g) => s + g.saved, 0));

  async create(draft: GoalDraft): Promise<void> {
    await db.goals.add({
      ...draft,
      target: Math.round(draft.target),
      id: uid(),
      contributions: [],
      createdAt: Date.now(),
    });
  }

  async update(id: string, draft: GoalDraft): Promise<void> {
    await db.goals.update(id, { ...draft, target: Math.round(draft.target) });
  }

  /** Aporta (positivo) o retira (negativo) dinero de la meta. */
  async contribute(id: string, amount: number): Promise<void> {
    await db.transaction('rw', db.goals, async () => {
      const goal = await db.goals.get(id);
      if (!goal) return;
      const saved = goalSaved(goal);
      const value = Math.round(amount < 0 ? Math.max(amount, -saved) : amount);
      if (!value) return;
      await db.goals.update(id, {
        contributions: [...goal.contributions, { amount: value, date: today() }],
      });
    });
  }

  async remove(id: string): Promise<void> {
    await db.goals.delete(id);
  }
}
