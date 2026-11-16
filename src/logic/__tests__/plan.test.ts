import { GOALS, SKILLS } from '@/content';
import type { Goal, Skill } from '@/content/types';
import { generatePlan, sessionBudget, type PlanInput } from '../plan';

function skill(id: string, opts: Partial<Skill> = {}): Skill {
  return {
    id,
    name: id,
    summary: '',
    placeholder: true,
    goalIds: [],
    prerequisites: [],
    minutesPerSession: 4,
    levels: [1, 2, 3].map((level) => ({
      level,
      title: `${id} ${level}`,
      repsPerSession: 10,
      steps: [],
      mistakes: [],
      tips: [],
      levelUp: { minReps: 10, successRate: 0.8, minSessions: 2 },
    })),
    ...opts,
  };
}

const skills = [
  skill('a', { goalIds: ['g1'] }),
  skill('b', { goalIds: ['g1'] }),
  skill('c', { goalIds: ['g2'] }),
  skill('d', { goalIds: ['g2'], prerequisites: ['c'] }),
  skill('e', { goalIds: [] }),
];
const goals: Goal[] = [
  { id: 'g1', name: 'G1', description: '', icon: '', skillIds: ['a', 'b'] },
  { id: 'g2', name: 'G2', description: '', icon: '', skillIds: ['c', 'd'] },
];

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    goalIds: ['g1', 'g2'],
    progress: {},
    energy: 'medium',
    ageGroup: 'adult',
    skills,
    goals,
    today: '2026-11-12',
    ...overrides,
  };
}

const ids = (p: ReturnType<typeof generatePlan>) => p.items.map((i) => `${i.role}:${i.skillId}@${i.level}`);

describe('sessionBudget', () => {
  it('stays within 5-15 minutes for every combination', () => {
    for (const age of ['puppy', 'adolescent', 'adult', 'senior'] as const) {
      for (const energy of ['low', 'medium', 'high'] as const) {
        const b = sessionBudget(age, energy);
        expect(b).toBeGreaterThanOrEqual(5);
        expect(b).toBeLessThanOrEqual(15);
      }
    }
  });

  it('gives puppies shorter sessions than adults', () => {
    expect(sessionBudget('puppy', 'medium')).toBeLessThan(sessionBudget('adult', 'medium'));
  });
});

describe('generatePlan', () => {
  it('is deterministic', () => {
    expect(generatePlan(input())).toEqual(generatePlan(input()));
  });

  it('starts a new dog on a focus skill plus a skill from another goal', () => {
    expect(ids(generatePlan(input()))).toEqual(['focus:a@1', 'secondary:c@1']);
  });

  it('skips skills whose prerequisites have not passed level 1', () => {
    const plan = generatePlan(input({ goalIds: ['g2'] }));
    expect(plan.items.map((i) => i.skillId)).toEqual(['c']);
  });

  it('unlocks a skill once its prerequisite passes level 1', () => {
    const plan = generatePlan(input({ goalIds: ['g2'], progress: { c: { level: 2 } } }));
    expect(ids(plan)).toEqual(['focus:d@1', 'secondary:c@2']);
  });

  it('prioritizes the lowest level, then the least recently practiced', () => {
    const plan = generatePlan(
      input({
        progress: {
          a: { level: 1, lastPracticedAt: '2026-11-11T10:00:00Z' },
          b: { level: 1, lastPracticedAt: '2026-11-09T10:00:00Z' },
          c: { level: 1, lastPracticedAt: '2026-11-12T08:00:00Z' },
        },
      }),
    );
    expect(plan.items[0]).toMatchObject({ role: 'focus', skillId: 'b' });
  });

  it('puts never-practiced skills ahead of practiced ones at the same level', () => {
    const plan = generatePlan(
      input({ progress: { a: { level: 1, lastPracticedAt: '2026-11-11T10:00:00Z' } } }),
    );
    expect(plan.items[0]).toMatchObject({ role: 'focus', skillId: 'b' });
  });

  it('adds a review of a passed level at half reps', () => {
    const plan = generatePlan(
      input({ goalIds: ['g1'], progress: { e: { level: 3, lastPracticedAt: '2026-11-01T00:00:00Z' } } }),
    );
    const review = plan.items.find((i) => i.role === 'review');
    expect(review).toMatchObject({ skillId: 'e', level: 2, reps: 5 });
  });

  it('reviews the last level of a mastered skill', () => {
    const plan = generatePlan(input({ goalIds: ['g1'], progress: { e: { level: 4 } } }));
    expect(plan.items.find((i) => i.role === 'review')).toMatchObject({ skillId: 'e', level: 3 });
  });

  it('falls back to the whole library when every goal skill is mastered', () => {
    const plan = generatePlan(input({ goalIds: ['g1'], progress: { a: { level: 4 }, b: { level: 4 } } }));
    expect(plan.items[0]).toMatchObject({ role: 'focus', skillId: 'c' });
  });

  it('never plans more than 3 items', () => {
    const progress = Object.fromEntries(skills.map((s) => [s.id, { level: 2 }]));
    expect(generatePlan(input({ progress })).items.length).toBeLessThanOrEqual(3);
  });

  it('keeps the total within the session budget', () => {
    for (const ageGroup of ['puppy', 'adolescent', 'adult', 'senior'] as const) {
      for (const energy of ['low', 'medium', 'high'] as const) {
        const plan = generatePlan(input({ ageGroup, energy, progress: { e: { level: 2 } } }));
        expect(plan.items).toHaveLength(3);
        expect(plan.totalMinutes).toBeLessThanOrEqual(Math.max(6, sessionBudget(ageGroup, energy)));
      }
    }
  });

  it('works against the bundled content for every goal', () => {
    for (const goal of GOALS) {
      const plan = generatePlan(input({ skills: SKILLS, goals: GOALS, goalIds: [goal.id] }));
      expect(plan.items.length).toBeGreaterThan(0);
    }
  });
});

describe('bundled content', () => {
  it('has consistent goal and skill references', () => {
    const skillIds = new Set(SKILLS.map((s) => s.id));
    for (const g of GOALS) for (const id of g.skillIds) expect(skillIds.has(id)).toBe(true);
    for (const s of SKILLS) {
      for (const p of s.prerequisites) expect(skillIds.has(p)).toBe(true);
      s.levels.forEach((l, i) => expect(l.level).toBe(i + 1));
    }
  });
});
