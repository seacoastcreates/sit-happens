import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { AGE_OPTIONS, DogPhoto, ENERGY_OPTIONS, TimeField } from '@/components/forms';
import { Button, Card, Icon, ProfessionalNotice, Row, Screen, SectionTitle, T } from '@/components/ui';
import { getGoal } from '@/content';
import * as repo from '@/db/repo';
import { useFocusData } from '@/hooks/useFocusData';
import { deletePhoto } from '@/services/photos';
import { cancelReminders, formatTime, scheduleDailyReminder } from '@/services/reminders';
import { useDog } from '@/state/DogContext';
import { space, useColors } from '@/theme';

function LinkRow({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>{children}</View>
          <Icon name="chevron.right" size={14} color={c.textMuted} />
        </Row>
      </Card>
    </Pressable>
  );
}

export default function Settings() {
  const db = useSQLiteContext();
  const c = useColors();
  const { dog, goalIds, refresh } = useDog();
  const saved = useFocusData(() => repo.getSetting(db, 'reminder_time'), 'reminder');
  const [override, setOverride] = useState<string | null | undefined>(undefined);
  const reminder = override !== undefined ? override : saved;
  const [draftTime, setDraftTime] = useState('18:00');

  if (!dog) return null;

  async function setReminder(time: string | null) {
    if (time === null) {
      await cancelReminders();
      await repo.setSetting(db, 'reminder_time', null);
      setOverride(null);
      return;
    }
    const ok = await scheduleDailyReminder(time, dog!.name);
    if (!ok) {
      Alert.alert('Notifications are off', 'Allow notifications for Sit Happens in the iOS Settings app to get reminders.');
      return;
    }
    await repo.setSetting(db, 'reminder_time', time);
    setOverride(time);
  }

  function confirmReset() {
    Alert.alert('Reset all data?', `This deletes ${dog!.name}'s profile, progress and history from this phone. It can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await cancelReminders();
          deletePhoto(dog!.photoUri);
          await repo.resetAll(db);
          await refresh();
        },
      },
    ]);
  }

  const age = AGE_OPTIONS.find((o) => o.id === dog.ageGroup)?.label;
  const energy = ENERGY_OPTIONS.find((o) => o.id === dog.energy)?.label;

  return (
    <Screen padTop>
      <T variant="title">Settings</T>

      <SectionTitle>Your dog</SectionTitle>
      <LinkRow label={`Edit ${dog.name}'s profile`} onPress={() => router.push('/edit-dog')}>
        <Row>
          <DogPhoto uri={dog.photoUri} size={52} />
          <View style={{ flex: 1 }}>
            <T variant="heading">{dog.name}</T>
            <T variant="caption" muted>
              {[dog.breed, age, `${energy} energy`].filter(Boolean).join(' · ')}
            </T>
          </View>
        </Row>
      </LinkRow>

      <SectionTitle>Training goals</SectionTitle>
      <LinkRow label="Edit training goals" onPress={() => router.push('/edit-goals')}>
        <View style={{ gap: 6 }}>
          {goalIds.map((g) => (
            <Row key={g} gap={space.sm}>
              <Icon name={getGoal(g)?.icon ?? 'circle'} size={16} color={c.accent} />
              <T>{getGoal(g)?.name ?? g}</T>
            </Row>
          ))}
          {goalIds.length === 0 && <T muted>No goals picked</T>}
        </View>
      </LinkRow>

      <SectionTitle>Daily reminder</SectionTitle>
      {reminder !== undefined && (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <T variant="label">Remind me to train</T>
              <T variant="caption" muted>
                {reminder ? `Every day at ${formatTime(reminder)}` : 'Off'}
              </T>
            </View>
            <Switch
              accessibilityLabel="Daily reminder"
              value={!!reminder}
              trackColor={{ true: c.accent }}
              onValueChange={(on) => setReminder(on ? draftTime : null)}
            />
          </Row>
          {reminder && (
            <TimeField
              value={reminder}
              onChange={(t) => {
                setDraftTime(t);
                setReminder(t);
              }}
            />
          )}
        </Card>
      )}

      <SectionTitle>About</SectionTitle>
      <Card tone="warningSoft" style={{ borderColor: 'transparent' }}>
        <T variant="caption" color={c.warningText}>
          Training content in this build is placeholder text. Real, reviewed instructions are coming before release.
        </T>
      </Card>
      <ProfessionalNotice />
      <T variant="caption" muted>
        All data stays on this phone. No account, no tracking.
      </T>

      <Button title="Reset all data" kind="danger" onPress={confirmReset} />
    </Screen>
  );
}
