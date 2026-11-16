import { addDays, lastNDays, toDateKey } from '../dates';
import { computeStreak } from '../streak';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('lists the last N days oldest first', () => {
    expect(lastNDays('2026-11-12', 3)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
  });

  it('formats local dates', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('computeStreak', () => {
  const today = '2026-11-12';

  it('is zero with no sessions', () => {
    expect(computeStreak([], today)).toEqual({ current: 0, best: 0, trainedToday: false });
  });

  it('counts consecutive days ending today', () => {
    const s = computeStreak(['2026-11-10', '2026-11-11', '2026-11-12'], today);
    expect(s).toEqual({ current: 3, best: 3, trainedToday: true });
  });

  it('keeps the streak alive until midnight if trained yesterday', () => {
    const s = computeStreak(['2026-11-10', '2026-11-11'], today);
    expect(s).toEqual({ current: 2, best: 2, trainedToday: false });
  });

  it('breaks after a missed day', () => {
    expect(computeStreak(['2026-11-09', '2026-11-10'], today).current).toBe(0);
  });

  it('ignores duplicate days and tracks the best run', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-12'];
    expect(computeStreak(days, today)).toEqual({ current: 1, best: 4, trainedToday: true });
  });
});
