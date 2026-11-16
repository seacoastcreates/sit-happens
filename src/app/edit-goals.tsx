import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { GoalPicker, MAX_GOALS } from '@/components/forms';
import { Button, Screen, T } from '@/components/ui';
import * as repo from '@/db/repo';
import { invalidatePlan } from '@/services/training';
import { useDog } from '@/state/DogContext';

export default function EditGoals() {
  const db = useSQLiteContext();
  const { dog, goalIds, refresh } = useDog();
  const [value, setValue] = useState(goalIds);
  const [saving, setSaving] = useState(false);

  if (!dog) return null;

  async function save() {
    setSaving(true);
    await repo.setGoalIds(db, dog!.id, value);
    await invalidatePlan(db, dog!.id);
    await refresh();
    router.back();
  }

  return (
    <Screen>
      <T muted>
        Pick up to {MAX_GOALS}. Progress on every skill is kept, even if you drop a goal.
      </T>
      <GoalPicker value={value} onChange={setValue} />
      <Button title="Save" loading={saving} disabled={value.length === 0} onPress={save} />
    </Screen>
  );
}
