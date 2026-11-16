import { addDays, type DateKey } from './dates';

export interface Streak {
  /** Consecutive training days ending today (or yesterday, if not trained yet today). */
  current: number;
  best: number;
  trainedToday: boolean;
}

/**
 * A streak stays alive through today until midnight: if the dog trained yesterday
 * but not yet today, the current streak still counts.
 */
export function computeStreak(sessionDays: DateKey[], today: DateKey): Streak {
  const days = new Set(sessionDays);
  const trainedToday = days.has(today);

  let current = 0;
  let cursor = trainedToday ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const day of [...days].sort()) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }

  return { current, best, trainedToday };
}
