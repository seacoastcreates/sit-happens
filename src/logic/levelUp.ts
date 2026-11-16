import type { LevelUpRule } from '@/content/types';

export interface RepRecord {
  sessionId: number;
  success: boolean;
}

export interface LevelUpResult {
  ready: boolean;
  reps: number;
  successes: number;
  successRate: number;
  sessions: number;
}

/**
 * Decide whether a dog has passed a level.
 *
 * `reps` are every rep logged at this skill and level, oldest first. Only the
 * most recent `rule.minSessions` sessions are evaluated, so early struggles at a
 * level don't hold the dog back once it's doing well.
 */
export function checkLevelUp(reps: RepRecord[], rule: LevelUpRule): LevelUpResult {
  const sessionOrder: number[] = [];
  for (const r of reps) {
    if (!sessionOrder.includes(r.sessionId)) sessionOrder.push(r.sessionId);
  }
  const window = new Set(sessionOrder.slice(-Math.max(rule.minSessions, 1)));
  const recent = reps.filter((r) => window.has(r.sessionId));

  const successes = recent.filter((r) => r.success).length;
  const successRate = recent.length ? successes / recent.length : 0;
  const ready =
    window.size >= rule.minSessions &&
    recent.length >= rule.minReps &&
    successRate >= rule.successRate;

  return { ready, reps: recent.length, successes, successRate, sessions: window.size };
}
