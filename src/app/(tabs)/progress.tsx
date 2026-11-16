import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { Card, LevelBadge, Row, Screen, SectionTitle, T } from '@/components/ui';
import { getSkill } from '@/content';
import * as repo from '@/db/repo';
import { useFocusData } from '@/hooks/useFocusData';
import { isoToDateKey, lastNDays, toDateKey } from '@/logic/dates';
import { computeStreak } from '@/logic/streak';
import { useDog } from '@/state/DogContext';
import { space, useColors } from '@/theme';

const CHART_DAYS = 14;

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T variant="title" accessibilityLabel={`${value} ${label}`}>
        {value}
      </T>
      <T variant="caption" muted>
        {label}
      </T>
    </Card>
  );
}

export default function Progress() {
  const db = useSQLiteContext();
  const c = useColors();
  const { width } = useWindowDimensions();
  const { dog } = useDog();
  const [chartWidth, setChartWidth] = useState(width - 64);

  const data = useFocusData(async () => {
    if (!dog) return null;
    const [starts, sessions, progress] = await Promise.all([
      repo.getSessionStarts(db, dog.id),
      repo.getSessions(db, dog.id, 30),
      repo.getProgress(db, dog.id),
    ]);
    const today = toDateKey(new Date());
    const streak = computeStreak(starts.map((s) => isoToDateKey(s.startedAt)), today);
    const repsByDay = new Map<string, number>();
    for (const s of starts) {
      const k = isoToDateKey(s.startedAt);
      repsByDay.set(k, (repsByDay.get(k) ?? 0) + s.reps);
    }
    const days = lastNDays(today, CHART_DAYS).map((d) => ({ day: d, reps: repsByDay.get(d) ?? 0 }));
    return { streak, sessions, progress, days, total: starts.length };
  }, dog?.id);

  if (!data) return <Screen padTop>{null}</Screen>;

  const practiced = Object.entries(data.progress)
    .map(([id, p]) => ({ skill: getSkill(id), ...p }))
    .filter((p) => !!p.skill)
    .sort((a, b) => (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? ''));

  const barSpacing = 6;
  const barWidth = Math.max(8, (chartWidth - 30 - barSpacing * CHART_DAYS) / CHART_DAYS);
  const totalChartReps = data.days.reduce((n, d) => n + d.reps, 0);

  return (
    <Screen padTop>
      <T variant="title">Progress</T>
      <Row>
        <Stat value={data.streak.current} label="day streak" />
        <Stat value={data.streak.best} label="best streak" />
        <Stat value={data.total} label="sessions" />
      </Row>

      <SectionTitle>Reps, last {CHART_DAYS} days</SectionTitle>
      <Card>
        <View
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`Bar chart of reps per day for the last ${CHART_DAYS} days. ${totalChartReps} reps in total.`}>
          {totalChartReps === 0 ? (
            <T muted style={{ paddingVertical: space.xl, textAlign: 'center' }}>
              Finish a session to start your chart.
            </T>
          ) : (
            <BarChart
              data={data.days.map((d, i) => ({
                value: d.reps,
                label: i % 3 === CHART_DAYS % 3 - 1 || i === CHART_DAYS - 1 ? d.day.slice(8) : '',
                frontColor: c.accent,
              }))}
              barWidth={barWidth}
              spacing={barSpacing}
              initialSpacing={4}
              barBorderTopLeftRadius={4}
              barBorderTopRightRadius={4}
              height={140}
              noOfSections={3}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={c.border}
              rulesColor={c.border}
              yAxisTextStyle={{ color: c.textMuted, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 11 }}
              yAxisLabelWidth={26}
              disableScroll
              isAnimated
            />
          )}
        </View>
      </Card>

      <SectionTitle>Skills</SectionTitle>
      <Card style={{ gap: space.sm }}>
        {practiced.length === 0 && <T muted>No skills practiced yet.</T>}
        {practiced.map((p) => (
          <Row key={p.skill!.id} style={{ justifyContent: 'space-between' }}>
            <T style={{ flex: 1 }}>{p.skill!.name}</T>
            <LevelBadge level={p.level} levels={p.skill!.levels.length} />
          </Row>
        ))}
      </Card>

      <SectionTitle>History</SectionTitle>
      {data.sessions.length === 0 && <T muted>Your sessions will show up here.</T>}
      {data.sessions.map((s) => {
        const d = new Date(s.startedAt);
        const pct = s.reps ? Math.round((s.successes / s.reps) * 100) : 0;
        return (
          <Card key={s.id} style={{ gap: space.xs }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="label">
                {d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </T>
              <T variant="caption" muted>
                {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </T>
            </Row>
            <T variant="caption" muted>
              {s.reps} reps · {pct}% success
            </T>
            {s.notes ? <T variant="caption">“{s.notes}”</T> : null}
          </Card>
        );
      })}
    </Screen>
  );
}
