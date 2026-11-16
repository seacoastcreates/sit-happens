import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import * as repo from '@/db/repo';

interface DogState {
  loading: boolean;
  dog: repo.Dog | null;
  goalIds: string[];
  /** Bumped whenever training data changes, so screens can refetch. */
  version: number;
  refresh: () => Promise<void>;
}

async function load(db: SQLiteDatabase) {
  const dog = await repo.getActiveDog(db);
  const goalIds = dog ? await repo.getGoalIds(db, dog.id) : [];
  return { dog, goalIds };
}

const DogContext = createContext<DogState | null>(null);

export function DogProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [state, setState] = useState<Omit<DogState, 'refresh'>>({ loading: true, dog: null, goalIds: [], version: 0 });

  const refresh = useCallback(async () => {
    const next = await load(db);
    setState((s) => ({ ...next, loading: false, version: s.version + 1 }));
  }, [db]);

  useEffect(() => {
    let active = true;
    load(db).then((next) => {
      if (active) setState((s) => ({ ...next, loading: false, version: s.version + 1 }));
    });
    return () => {
      active = false;
    };
  }, [db]);

  return <DogContext.Provider value={{ ...state, refresh }}>{children}</DogContext.Provider>;
}

export function useDog(): DogState {
  const ctx = useContext(DogContext);
  if (!ctx) throw new Error('useDog must be used inside DogProvider');
  return ctx;
}

