import type { Goal, Skill } from '@/content/types';
import type { DateKey } from './dates';

export type Energy = 'low' | 'medium' | 'high';
export type AgeGroup = 'puppy' | 'adolescent' | 'adult' | 'senior';

export interface SkillState {
  /** Current level, 1-based. Greater than the level count means mastered. */
  level: number;
  /** ISO timestamp of the last session that practiced this skill. */
  lastPracticedAt?: string | null;
}

export interface PlanInput {
  goalIds: string[];
  progress: Record<string, SkillState>;
  energy: Energy;
  ageGroup: AgeGroup;
  skills: Skill[];
  goals: Goal[];
  today: DateKey;
}

export type PlanRole = 'focus' | 'secondary' | 'review';

export interface PlanItem {
  skillId: string;
  level: number;
  reps: number;
  minutes: number;
  role: PlanRole;
}

export interface DailyPlan {
  date: DateKey;
  items: PlanItem[];
  totalMinutes: number;
}

const BASE_MINUTES: Record<AgeGroup, number> = { puppy: 6, adolescent: 10, adult: 12, senior: 8 };
const ENERGY_ADJUST: Record<Energy, number> = { low: -2, medium: 0, high: 3 };
const MIN_ITEM_MINUTES = 2;

/** Total session length in minutes, always within 5-15. */
export function sessionBudget(ageGroup: AgeGroup, energy: Energy): number {
  return Math.min(15, Math.max(5, BASE_MINUTES[ageGroup] + ENERGY_ADJUST[energy]));
}

/**
 * Build today's session. Deterministic: the same inputs always give the same plan.
 *
 * - focus: the goal skill at the lowest level, least recently practiced first
 * - secondary: the next goal skill, preferring a different goal than the focus
 * - review: a skill already past level 1, practiced at a level it has passed
 */
export function generatePlan(input: PlanInput): DailyPlan {
  const { skills, goals, progress } = input;
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const levelOf = (id: string) => progress[id]?.level ?? 1;
  const lastOf = (id: string) => progress[id]?.lastPracticedAt ?? '';
  const mastered = (s: Skill) => levelOf(s.id) > s.levels.length;
  const unlocked = (s: Skill) => s.prerequisites.every((p) => levelOf(p) > 1);

  // Goal skills in goal order, without duplicates.
  const goalSkillIds: string[] = [];
  for (const gid of input.goalIds) {
    const goal = goals.find((g) => g.id === gid);
    for (const sid of goal?.skillIds ?? []) {
      if (!goalSkillIds.includes(sid) && skillById.has(sid)) goalSkillIds.push(sid);
    }
  }

  const byPriority = (ids: string[]) =>
    ids
      .map((id, order) => ({ s: skillById.get(id)!, order }))
      .filter(({ s }) => !mastered(s) && unlocked(s))
      .sort(
        (a, b) =>
          levelOf(a.s.id) - levelOf(b.s.id) ||
          lastOf(a.s.id).localeCompare(lastOf(b.s.id)) ||
          a.order - b.order,
      )
      .map(({ s }) => s);

  let candidates = byPriority(goalSkillIds);
  // Every goal skill mastered (or no goals): fall back to the whole library.
  if (candidates.length === 0) candidates = byPriority(skills.map((s) => s.id));

  const chosen: { skill: Skill; role: PlanRole; level: number }[] = [];
  const focus = candidates[0];
  if (focus) {
    chosen.push({ skill: focus, role: 'focus', level: levelOf(focus.id) });
    const rest = candidates.slice(1);
    const otherGoal = rest.find((s) => !s.goalIds.some((g) => focus.goalIds.includes(g)));
    const secondary = otherGoal ?? rest[0];
    if (secondary) chosen.push({ skill: secondary, role: 'secondary', level: levelOf(secondary.id) });
  }

  const reviewPool = skills
    .filter((s) => levelOf(s.id) > 1 && !chosen.some((c) => c.skill.id === s.id))
    .sort((a, b) => lastOf(a.id).localeCompare(lastOf(b.id)) || a.id.localeCompare(b.id));
  const review = reviewPool[0];
  if (review) {
    const passed = Math.min(levelOf(review.id), review.levels.length + 1) - 1;
    chosen.push({ skill: review, role: 'review', level: passed });
  }

  const budget = sessionBudget(input.ageGroup, input.energy);
  const shares: Record<PlanRole, number> =
    chosen.length === 3
      ? { focus: 0.5, secondary: 0.3, review: 0.2 }
      : chosen.length === 2
        ? { focus: 0.6, secondary: 0.4, review: 0.4 }
        : { focus: 1, secondary: 1, review: 1 };

  // Secondary and review get their share rounded down; focus takes the remainder,
  // so the total stays within the budget (except tiny budgets hitting the minimum).
  const minutesFor = (role: PlanRole) => Math.max(MIN_ITEM_MINUTES, Math.floor(budget * shares[role]));
  const otherMinutes = chosen
    .filter((c) => c.role !== 'focus')
    .reduce((sum, c) => sum + minutesFor(c.role), 0);

  const items: PlanItem[] = chosen.map(({ skill, role, level }) => {
    const fullReps = skill.levels[level - 1].repsPerSession;
    return {
      skillId: skill.id,
      level,
      role,
      reps: role === 'review' ? Math.ceil(fullReps / 2) : fullReps,
      minutes: role === 'focus' ? Math.max(MIN_ITEM_MINUTES, budget - otherMinutes) : minutesFor(role),
    };
  });

  return {
    date: input.today,
    items,
    totalMinutes: items.reduce((sum, i) => sum + i.minutes, 0),
  };
}
