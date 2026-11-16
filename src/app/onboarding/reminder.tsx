import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';

import { TimeField } from '@/components/forms';
import { Button, Card, Screen, T } from '@/components/ui';
import * as repo from '@/db/repo';
import { scheduleDailyReminder } from '@/services/reminders';
import { useDog } from '@/state/DogContext';
import { useDraft } from '@/state/OnboardingDraft';

export default function OnboardingReminder() {
  const db = useSQLiteContext();
  const { refresh } = useDog();
  const [draft, setDraft] = useDraft();
  const [saving, setSaving] = useState(false);
  const name = draft.dog.name.trim();

  async function finish(withReminder: boolean) {
    setSaving(true);
    try {
      await repo.createDog(db, { ...draft.dog, name }, draft.goalIds);
      if (withReminder) {
        const ok = await scheduleDailyReminder(draft.reminderTime, name);
        await repo.setSetting(db, 'reminder_time', ok ? draft.reminderTime : null);
        if (!ok) {
          Alert.alert('Reminders are off', 'You can turn on notifications later in Settings.');
        }
      }
      // Flips the root route guard, which moves the app to the main tabs.
      await refresh();
    } catch (e) {
      setSaving(false);
      Alert.alert('Something went wrong', String(e));
    }
  }

  return (
    <Screen>
      <T variant="title">When do you want to train?</T>
      <T muted>We&apos;ll send one gentle reminder a day. Most people pick a time right before a walk or a meal.</T>
      <Card>
        <TimeField value={draft.reminderTime} onChange={(reminderTime) => setDraft((d) => ({ ...d, reminderTime }))} />
      </Card>
      <Button title="Remind me daily" loading={saving} onPress={() => finish(true)} />
      <Button title="Skip for now" kind="ghost" disabled={saving} onPress={() => finish(false)} />
    </Screen>
  );
}
