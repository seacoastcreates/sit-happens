import { checkLevelUp, type RepRecord } from '../levelUp';

const rule = { minReps: 10, successRate: 0.8, minSessions: 2 };

function reps(sessionId: number, successes: number, misses: number): RepRecord[] {
  return [
    ...Array.from({ length: successes }, () => ({ sessionId, success: true })),
    ...Array.from({ length: misses }, () => ({ sessionId, success: false })),
  ];
}

describe('checkLevelUp', () => {
  it('is not ready with no reps', () => {
    expect(checkLevelUp([], rule)).toEqual({ ready: false, reps: 0, successes: 0, successRate: 0, sessions: 0 });
  });

  it('needs the minimum number of sessions even with a perfect record', () => {
    const result = checkLevelUp(reps(1, 12, 0), rule);
    expect(result.ready).toBe(false);
    expect(result.sessions).toBe(1);
  });

  it('passes at exactly the threshold (8/10 across 2 sessions)', () => {
    const result = checkLevelUp([...reps(1, 4, 1), ...reps(2, 4, 1)], rule);
    expect(result).toMatchObject({ ready: true, reps: 10, successes: 8, successRate: 0.8, sessions: 2 });
  });

  it('fails just below the success rate', () => {
    expect(checkLevelUp([...reps(1, 4, 1), ...reps(2, 3, 2)], rule).ready).toBe(false);
  });

  it('fails when there are too few reps', () => {
    expect(checkLevelUp([...reps(1, 4, 0), ...reps(2, 4, 0)], rule).ready).toBe(false);
  });

  it('only counts the most recent sessions, ignoring early struggles', () => {
    const history = [...reps(1, 0, 10), ...reps(2, 5, 0), ...reps(3, 5, 0)];
    const result = checkLevelUp(history, rule);
    expect(result).toMatchObject({ ready: true, reps: 10, sessions: 2 });
  });

  it('does not forgive a bad recent session', () => {
    const history = [...reps(1, 10, 0), ...reps(2, 10, 0), ...reps(3, 2, 8)];
    expect(checkLevelUp(history, rule).ready).toBe(false);
  });
});
