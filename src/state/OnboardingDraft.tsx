import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { emptyDog } from '@/components/forms';
import type { DogInput } from '@/db/repo';

export interface Draft {
  dog: DogInput;
  goalIds: string[];
  reminderTime: string;
}

const DraftContext = createContext<[Draft, Dispatch<SetStateAction<Draft>>] | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const state = useState<Draft>({ dog: emptyDog(), goalIds: [], reminderTime: '18:00' });
  return <DraftContext.Provider value={state}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
