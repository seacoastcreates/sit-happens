import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'sit-happens.db';

/**
 * Ordered migrations. Append new entries; never edit a shipped one.
 * Each table carries dog_id so multiple dogs can be added later without a migration.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE dog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo_uri TEXT,
    breed TEXT,
    age_group TEXT NOT NULL CHECK (age_group IN ('puppy','adolescent','adult','senior')),
    energy TEXT NOT NULL CHECK (energy IN ('low','medium','high')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE dog_goal (
    dog_id INTEGER NOT NULL REFERENCES dog(id) ON DELETE CASCADE,
    goal_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dog_id, goal_id)
  );
  CREATE TABLE skill_progress (
    dog_id INTEGER NOT NULL REFERENCES dog(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 1,
    last_practiced_at TEXT,
    leveled_up_at TEXT,
    PRIMARY KEY (dog_id, skill_id)
  );
  CREATE TABLE session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dog_id INTEGER NOT NULL REFERENCES dog(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    notes TEXT
  );
  CREATE TABLE rep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    success INTEGER NOT NULL CHECK (success IN (0,1)),
    created_at TEXT NOT NULL
  );
  CREATE INDEX rep_session ON rep (session_id);
  CREATE INDEX rep_skill_level ON rep (skill_id, level);
  CREATE INDEX session_dog ON session (dog_id, started_at);
  CREATE TABLE setting (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    // user_version is set inside the transaction so a crash can't leave a half-applied migration.
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }

  await closeAbandonedSessions(db);
}

/**
 * Sessions left open (app killed mid-session) are closed at their last rep so
 * they count toward history and streaks; open sessions with no reps are removed.
 */
async function closeAbandonedSessions(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    UPDATE session SET ended_at = (SELECT MAX(created_at) FROM rep WHERE rep.session_id = session.id)
      WHERE ended_at IS NULL AND EXISTS (SELECT 1 FROM rep WHERE rep.session_id = session.id);
    DELETE FROM session WHERE ended_at IS NULL;
  `);
}
