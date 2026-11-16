/** Rule for when a dog is ready to move from one level to the next. */
export interface LevelUpRule {
  /** Minimum reps logged at this level across the evaluated sessions. */
  minReps: number;
  /** Required success ratio, 0-1 (e.g. 0.8 = 8 of 10). */
  successRate: number;
  /** Minimum number of separate sessions the reps must span. */
  minSessions: number;
}

export interface SkillLevel {
  /** 1-based level number, in order. */
  level: number;
  title: string;
  /** Target reps for one session at this level. */
  repsPerSession: number;
  steps: string[];
  mistakes: string[];
  tips: string[];
  levelUp: LevelUpRule;
}

export interface Skill {
  id: string;
  name: string;
  summary: string;
  /** True while the entry still holds placeholder text. */
  placeholder: boolean;
  goalIds: string[];
  /** Skill ids that must be past level 1 before this skill is planned. */
  prerequisites: string[];
  /** Typical minutes for this skill in one session. */
  minutesPerSession: number;
  levels: SkillLevel[];
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  /** SF Symbol name. */
  icon: string;
  /** Skills that serve this goal, in teaching order. */
  skillIds: string[];
}
