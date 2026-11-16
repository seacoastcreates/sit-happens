import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';

import { DogPhoto } from '@/components/forms';
import { Button, Card, Icon, LevelBadge, Row, Screen, SectionTitle, T } from '@/components/ui';
import { getSkill, levelDef } from '@/content';
import * as repo from '@/db/repo';
import { useFocusData } from '@/hooks/useFocusData';
import { isoToDateKey, toDateKey } from '@/logic/dates';
import type { PlanRole } from '@/logic/plan';
import { computeStreak } from '@/logic/streak';
import { getTodayPlan } from '@/services/training';
import { useDog } from '@/state/DogContext';
import { space, useColors } from '@/theme';

const ROLE_LABEL: Record<PlanRole, string> = { focus: 'Focus', secondary: 'Also today', review: 'Quick review' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const db = useSQLiteContext();
  const c = useColors();
  const { dog } = useDog();

  const data = useFocusData(async () => {
    if (!dog) return null;
    const [plan, progress, starts] = await Promise.all([
      getTodayPlan(db, dog),
      repo.getProgress(db, dog.id),
      repo.getSessionStarts(db, dog.id),
    ]);
    const streak = computeStreak(starts.map((s) => isoToDateKey(s.startedAt)), toDateKey(new Date()));
    return { plan, progress, streak };
  }, dog?.id);

  if (!dog) return null;

  return (
    <Screen padTop>
      <Row>
        <View style={{ flex: 1 }}>
          <T muted>{greeting()}</T>
          <T variant="title">Ready, {dog.name}?</T>
        </View>
        <DogPhoto uri={dog.photoUri} size={56} />
      </Row>

      {data && (
        <>
          <Card tone={data.streak.trainedToday ? 'successSoft' : 'accentSoft'} style={{ borderColor: 'transparent' }}>
            <Row>
              <Icon
                name={data.streak.trainedToday ? 'checkmark.seal.fill' : 'flame.fill'}
                size={30}
                color={data.streak.trainedToday ? c.success : c.accent}
              />
              <View style={{ flex: 1 }}>
                <T variant="heading">
                  {data.streak.current > 0
                    ? `${data.streak.current}-day streak`
                    : 'Start a streak today'}
                </T>
                <T variant="caption" muted>
                  {data.streak.trainedToday
                    ? 'Trained today. Nice work!'
                    : data.streak.current > 0
                      ? 'Train today to keep it going.'
                      : 'A few minutes a day adds up fast.'}
                </T>
              </View>
            </Row>
          </Card>

          <SectionTitle>Today&apos;s session · about {data.plan.totalMinutes} min</SectionTitle>
          <Card style={{ gap: 0, paddingVertical: space.sm }}>
            {data.plan.items.map((item, i) => {
              const skill = getSkill(item.skillId);
              if (!skill) return null;
              const current = data.progress[item.skillId]?.level ?? 1;
              return (
                <View
                  key={item.skillId}
                  accessible
                  accessibilityLabel={`${ROLE_LABEL[item.role]}: ${skill.name}, level ${item.level}, ${item.reps} reps, about ${item.minutes} minutes`}
                  style={{
                    paddingVertical: space.md,
                    borderTopWidth: i ? 1 : 0,
                    borderColor: c.border,
                    gap: 4,
                  }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T variant="caption" color={c.accent} style={{ fontWeight: '700' }}>
                      {ROLE_LABEL[item.role].toUpperCase()}
                    </T>
                    <T variant="caption" muted>
                      {item.reps} reps · ~{item.minutes} min
                    </T>
                  </Row>
                  <T variant="heading">{skill.name}</T>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T variant="caption" muted style={{ flex: 1 }} numberOfLines={1}>
                      {levelDef(skill, item.level).title}
                    </T>
                    <LevelBadge level={item.role === 'review' ? current : item.level} levels={skill.levels.length} />
                  </Row>
                </View>
              );
            })}
            {data.plan.items.length === 0 && <T muted>No skills to plan. Pick some goals in Settings.</T>}
          </Card>

          {data.plan.items.length > 0 && (
            <Button
              title={data.streak.trainedToday ? 'Train again' : 'Start session'}
              kind={data.streak.trainedToday ? 'secondary' : 'primary'}
              icon="play.fill"
              onPress={() => router.push('/session/run')}
            />
          )}
        </>
      )}
    </Screen>
  );
}
