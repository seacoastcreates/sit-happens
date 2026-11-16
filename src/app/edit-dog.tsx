import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DogForm } from '@/components/forms';
import { Button, Screen } from '@/components/ui';
import * as repo from '@/db/repo';
import { deletePhoto } from '@/services/photos';
import { invalidatePlan } from '@/services/training';
import { useDog } from '@/state/DogContext';

export default function EditDog() {
  const db = useSQLiteContext();
  const { dog, refresh } = useDog();
  const [value, setValue] = useState<repo.DogInput | null>(dog);
  const [saving, setSaving] = useState(false);

  if (!dog || !value) return null;

  async function save() {
    setSaving(true);
    await repo.updateDog(db, dog!.id, { ...value!, name: value!.name.trim() });
    if (dog!.photoUri && dog!.photoUri !== value!.photoUri) deletePhoto(dog!.photoUri);
    // Age and energy change the session length, so rebuild today's plan.
    if (dog!.ageGroup !== value!.ageGroup || dog!.energy !== value!.energy) await invalidatePlan(db, dog!.id);
    await refresh();
    router.back();
  }

  return (
    <Screen>
      <DogForm value={value} onChange={setValue} />
      <Button title="Save" loading={saving} disabled={!value.name.trim()} onPress={save} />
    </Screen>
  );
}
