import goalsJson from './goals.json';
import skillsJson from './skills.json';
import type { Goal, Skill } from './types';

export * from './types';

export const GOALS: Goal[] = goalsJson.goals;
export const SKILLS: Skill[] = skillsJson.skills;

const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const goalById = new Map(GOALS.map((g) => [g.id, g]));

export function getSkill(id: string): Skill | undefined {
  return skillById.get(id);
}

export function getGoal(id: string): Goal | undefined {
  return goalById.get(id);
}

/** A level greater than the skill's level count means every level is passed. */
export function isMastered(skill: Skill, level: number): boolean {
  return level > skill.levels.length;
}

/** The level definition to practice at, clamped to the last level once mastered. */
export function levelDef(skill: Skill, level: number) {
  return skill.levels[Math.min(Math.max(level, 1), skill.levels.length) - 1];
}
