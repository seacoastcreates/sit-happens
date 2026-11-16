import type { SQLiteDatabase } from 'expo-sqlite';

import { GOALS, SKILLS, getSkill, levelDef } from '@/content';
import * as repo from '@/db/repo';
import { toDateKey } from '@/logic/dates';
import { checkLevelUp } from '@/logic/levelUp';
import { generatePlan, type DailyPlan } from '@/logic/plan';

export interface LevelUp {
  skillId: string;
  from: number;
  to: number;
}

const planKey = (dogId: number, date: string) => `plan:${dogId}:${date}`;

/**
 * Today's plan is generated once per day and stored, so finishing a session
 * doesn't reshuffle what the user already saw. Changing goals or the dog's
 * profile clears it (see invalidatePlan).
 */
export async function getTodayPlan(db: SQLiteDatabase, dog: repo.Dog): Promise<DailyPlan> {
  const today = toDateKey(new Date());
  const cached = await repo.getSetting(db, planKey(dog.id, today));
  if (cached) {
    try {
      const plan = JSON.parse(cached) as DailyPlan;
      if (plan.items.every((i) => getSkill(i.skillId))) return plan;
    } catch {
      // fall through and regenerate
    }
  }
  const [goalIds, progress] = await Promise.all([repo.getGoalIds(db, dog.id), repo.getProgress(db, dog.id)]);
  const plan = generatePlan({
    goalIds,
    progress,
    energy: dog.energy,
    ageGroup: dog.ageGroup,
    skills: SKILLS,
    goals: GOALS,
    today,
  });
  await repo.setSetting(db, planKey(dog.id, today), JSON.stringify(plan));
  return plan;
}

export async function invalidatePlan(db: SQLiteDatabase, dogId: number): Promise<void> {
  await repo.setSetting(db, planKey(dogId, toDateKey(new Date())), null);
}

/**
 * Close a session: stamp practice times and promote any skill that met its
 * level-up rule. Review reps (logged below the current level) never promote.
 */
export async function finishSession(db: SQLiteDatabase, dogId: number, sessionId: number): Promise<LevelUp[]> {
  const summary = await repo.getSessionSummary(db, sessionId);
  const progress = await repo.getProgress(db, dogId);
  const at = new Date().toISOString();
  const levelUps: LevelUp[] = [];

  await repo.endSession(db, sessionId);
  for (const skillId of new Set(summary.map((s) => s.skillId))) {
    await repo.markPracticed(db, dogId, skillId, at);
  }

  for (const { skillId, level } of summary) {
    const skill = getSkill(skillId);
    const current = progress[skillId]?.level ?? 1;
    if (!skill || level !== current || level > skill.levels.length) continue;
    const reps = await repo.getRepsAtLevel(db, dogId, skillId, level);
    if (checkLevelUp(reps, levelDef(skill, level).levelUp).ready) {
      await repo.setLevel(db, dogId, skillId, level + 1);
      levelUps.push({ skillId, from: level, to: level + 1 });
    }
  }
  // A cached plan would keep practicing the old level for the rest of the day.
  if (levelUps.length) await invalidatePlan(db, dogId);
  return levelUps;
}
