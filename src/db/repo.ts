import type { SQLiteDatabase } from 'expo-sqlite';

import type { AgeGroup, Energy, SkillState } from '@/logic/plan';
import type { RepRecord } from '@/logic/levelUp';

export interface Dog {
  id: number;
  name: string;
  photoUri: string | null;
  breed: string | null;
  ageGroup: AgeGroup;
  energy: Energy;
  createdAt: string;
}

export type DogInput = Omit<Dog, 'id' | 'createdAt'>;

export interface SessionRow {
  id: number;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  reps: number;
  successes: number;
}

export interface SessionSkillSummary {
  skillId: string;
  level: number;
  reps: number;
  successes: number;
}

const now = () => new Date().toISOString();

// ---------- dog ----------

interface DogDbRow {
  id: number;
  name: string;
  photo_uri: string | null;
  breed: string | null;
  age_group: AgeGroup;
  energy: Energy;
  created_at: string;
}

const toDog = (r: DogDbRow): Dog => ({
  id: r.id,
  name: r.name,
  photoUri: r.photo_uri,
  breed: r.breed,
  ageGroup: r.age_group,
  energy: r.energy,
  createdAt: r.created_at,
});

/** v1 is single-dog: the first dog created is the active one. */
export async function getActiveDog(db: SQLiteDatabase): Promise<Dog | null> {
  const row = await db.getFirstAsync<DogDbRow>('SELECT * FROM dog ORDER BY id LIMIT 1');
  return row ? toDog(row) : null;
}

export async function createDog(db: SQLiteDatabase, dog: DogInput, goalIds: string[]): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      'INSERT INTO dog (name, photo_uri, breed, age_group, energy, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      dog.name,
      dog.photoUri,
      dog.breed,
      dog.ageGroup,
      dog.energy,
      now(),
    );
    id = res.lastInsertRowId;
    await writeGoals(db, id, goalIds);
  });
  return id;
}

export async function updateDog(db: SQLiteDatabase, id: number, dog: DogInput): Promise<void> {
  await db.runAsync(
    'UPDATE dog SET name = ?, photo_uri = ?, breed = ?, age_group = ?, energy = ? WHERE id = ?',
    dog.name,
    dog.photoUri,
    dog.breed,
    dog.ageGroup,
    dog.energy,
    id,
  );
}

// ---------- goals ----------

export async function getGoalIds(db: SQLiteDatabase, dogId: number): Promise<string[]> {
  const rows = await db.getAllAsync<{ goal_id: string }>(
    'SELECT goal_id FROM dog_goal WHERE dog_id = ? ORDER BY position',
    dogId,
  );
  return rows.map((r) => r.goal_id);
}

async function writeGoals(db: SQLiteDatabase, dogId: number, goalIds: string[]) {
  await db.runAsync('DELETE FROM dog_goal WHERE dog_id = ?', dogId);
  for (const [i, gid] of goalIds.entries()) {
    await db.runAsync('INSERT INTO dog_goal (dog_id, goal_id, position) VALUES (?, ?, ?)', dogId, gid, i);
  }
}

export async function setGoalIds(db: SQLiteDatabase, dogId: number, goalIds: string[]): Promise<void> {
  await db.withTransactionAsync(() => writeGoals(db, dogId, goalIds));
}

// ---------- progress ----------

export async function getProgress(db: SQLiteDatabase, dogId: number): Promise<Record<string, SkillState>> {
  const rows = await db.getAllAsync<{ skill_id: string; current_level: number; last_practiced_at: string | null }>(
    'SELECT skill_id, current_level, last_practiced_at FROM skill_progress WHERE dog_id = ?',
    dogId,
  );
  return Object.fromEntries(
    rows.map((r) => [r.skill_id, { level: r.current_level, lastPracticedAt: r.last_practiced_at }]),
  );
}

export async function markPracticed(db: SQLiteDatabase, dogId: number, skillId: string, at: string) {
  await db.runAsync(
    `INSERT INTO skill_progress (dog_id, skill_id, current_level, last_practiced_at) VALUES (?, ?, 1, ?)
     ON CONFLICT (dog_id, skill_id) DO UPDATE SET last_practiced_at = excluded.last_practiced_at`,
    dogId,
    skillId,
    at,
  );
}

export async function setLevel(db: SQLiteDatabase, dogId: number, skillId: string, level: number) {
  await db.runAsync(
    `INSERT INTO skill_progress (dog_id, skill_id, current_level, leveled_up_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (dog_id, skill_id) DO UPDATE SET current_level = excluded.current_level, leveled_up_at = excluded.leveled_up_at`,
    dogId,
    skillId,
    level,
    now(),
  );
}

// ---------- sessions & reps ----------

export async function startSession(db: SQLiteDatabase, dogId: number): Promise<number> {
  const res = await db.runAsync('INSERT INTO session (dog_id, started_at) VALUES (?, ?)', dogId, now());
  return res.lastInsertRowId;
}

export async function logRep(
  db: SQLiteDatabase,
  sessionId: number,
  skillId: string,
  level: number,
  success: boolean,
): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO rep (session_id, skill_id, level, success, created_at) VALUES (?, ?, ?, ?, ?)',
    sessionId,
    skillId,
    level,
    success ? 1 : 0,
    now(),
  );
  return res.lastInsertRowId;
}

export async function deleteRep(db: SQLiteDatabase, repId: number): Promise<void> {
  await db.runAsync('DELETE FROM rep WHERE id = ?', repId);
}

export async function endSession(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await db.runAsync('UPDATE session SET ended_at = ? WHERE id = ?', now(), sessionId);
}

/** Remove a session that ended up with no reps (user backed out). */
export async function discardSessionIfEmpty(db: SQLiteDatabase, sessionId: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM rep WHERE session_id = ?', sessionId);
  if ((row?.n ?? 0) > 0) return false;
  await db.runAsync('DELETE FROM session WHERE id = ?', sessionId);
  return true;
}

export async function setSessionNotes(db: SQLiteDatabase, sessionId: number, notes: string): Promise<void> {
  await db.runAsync('UPDATE session SET notes = ? WHERE id = ?', notes.trim() || null, sessionId);
}

export async function getSessionSummary(db: SQLiteDatabase, sessionId: number): Promise<SessionSkillSummary[]> {
  return db.getAllAsync<SessionSkillSummary>(
    `SELECT skill_id AS skillId, level, COUNT(*) AS reps, SUM(success) AS successes
     FROM rep WHERE session_id = ? GROUP BY skill_id, level ORDER BY MIN(id)`,
    sessionId,
  );
}

/** Every rep for a dog at one skill and level, oldest first. */
export async function getRepsAtLevel(
  db: SQLiteDatabase,
  dogId: number,
  skillId: string,
  level: number,
): Promise<RepRecord[]> {
  const rows = await db.getAllAsync<{ session_id: number; success: number }>(
    `SELECT r.session_id, r.success FROM rep r JOIN session s ON s.id = r.session_id
     WHERE s.dog_id = ? AND r.skill_id = ? AND r.level = ? ORDER BY r.id`,
    dogId,
    skillId,
    level,
  );
  return rows.map((r) => ({ sessionId: r.session_id, success: r.success === 1 }));
}

/** Completed sessions with rep totals, newest first. */
export async function getSessions(db: SQLiteDatabase, dogId: number, limit = 50): Promise<SessionRow[]> {
  return db.getAllAsync<SessionRow>(
    `SELECT s.id, s.started_at AS startedAt, s.ended_at AS endedAt, s.notes,
            COUNT(r.id) AS reps, COALESCE(SUM(r.success), 0) AS successes
     FROM session s LEFT JOIN rep r ON r.session_id = s.id
     WHERE s.dog_id = ? AND s.ended_at IS NOT NULL
     GROUP BY s.id ORDER BY s.started_at DESC LIMIT ?`,
    dogId,
    limit,
  );
}

/** Start time of every completed session, for streaks and charts. */
export async function getSessionStarts(db: SQLiteDatabase, dogId: number): Promise<{ startedAt: string; reps: number }[]> {
  return db.getAllAsync(
    `SELECT s.started_at AS startedAt, COUNT(r.id) AS reps
     FROM session s LEFT JOIN rep r ON r.session_id = s.id
     WHERE s.dog_id = ? AND s.ended_at IS NOT NULL GROUP BY s.id`,
    dogId,
  );
}

// ---------- settings ----------

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM setting WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string | null): Promise<void> {
  if (value === null) {
    await db.runAsync('DELETE FROM setting WHERE key = ?', key);
  } else {
    await db.runAsync(
      'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }
}

/** Wipe everything (Settings > Reset). */
export async function resetAll(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM rep; DELETE FROM session; DELETE FROM skill_progress; DELETE FROM dog_goal; DELETE FROM dog; DELETE FROM setting;');
  });
}
