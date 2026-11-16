import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Row, T } from '@/components/ui';
import { getSkill, levelDef } from '@/content';
import * as repo from '@/db/repo';
import type { PlanItem } from '@/logic/plan';
import { finishSession, getTodayPlan } from '@/services/training';
import { useDog } from '@/state/DogContext';
import { radius, space, useColors } from '@/theme';

interface Tally {
  successes: number;
  misses: number;
  /** Rep ids in logging order, for undo. */
  repIds: { id: number; success: boolean }[];
}

const emptyTally = (): Tally => ({ successes: 0, misses: 0, repIds: [] });

function fmt(seconds: number) {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SessionRun() {
  const db = useSQLiteContext();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { dog, refresh } = useDog();
  const { skill: singleSkillId } = useLocalSearchParams<{ skill?: string }>();

  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);
  const targetBuzzed = useRef<Set<number>>(new Set());

  // Build the item list and open a session row. Keyed on the dog's id (not the
  // object) so refreshing dog data mid-session doesn't start a second session.
  const dogId = dog?.id;
  const currentDog = useEffectEvent(() => dog);
  useEffect(() => {
    const d = currentDog();
    if (!d) return;
    let cancelled = false;
    (async () => {
      let list: PlanItem[];
      if (singleSkillId) {
        const skill = getSkill(singleSkillId);
        if (!skill) return router.back();
        const progress = await repo.getProgress(db, d.id);
        const level = Math.min(progress[skill.id]?.level ?? 1, skill.levels.length);
        list = [
          { skillId: skill.id, level, role: 'focus', reps: levelDef(skill, level).repsPerSession, minutes: skill.minutesPerSession },
        ];
      } else {
        list = (await getTodayPlan(db, d)).items;
      }
      const id = await repo.startSession(db, d.id);
      if (cancelled) {
        await repo.discardSessionIfEmpty(db, id);
        return;
      }
      setItems(list);
      setTallies(list.map(emptyTally));
      setRemaining(list[0]?.minutes * 60 || 0);
      setSessionId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, dogId, singleSkillId]);

  // Countdown for the current skill.
  useEffect(() => {
    if (!running || !items) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r === 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return r > 0 ? r - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, items]);

  if (!dog || !items || sessionId === null) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const item = items[index];
  const skill = getSkill(item.skillId)!;
  const level = levelDef(skill, item.level);
  const tally = tallies[index];
  const done = tally.successes + tally.misses;
  const isLast = index === items.length - 1;
  const totalReps = tallies.reduce((n, t) => n + t.successes + t.misses, 0);

  async function log(success: boolean) {
    const id = await repo.logRep(db, sessionId!, item.skillId, item.level, success);
    Haptics.impactAsync(success ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setTallies((ts) =>
      ts.map((t, i) =>
        i !== index
          ? t
          : {
              successes: t.successes + (success ? 1 : 0),
              misses: t.misses + (success ? 0 : 1),
              repIds: [...t.repIds, { id, success }],
            },
      ),
    );
    if (done + 1 >= item.reps && !targetBuzzed.current.has(index)) {
      targetBuzzed.current.add(index);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function undo() {
    const last = tally.repIds[tally.repIds.length - 1];
    if (!last) return;
    await repo.deleteRep(db, last.id);
    Haptics.selectionAsync();
    setTallies((ts) =>
      ts.map((t, i) =>
        i !== index
          ? t
          : {
              successes: t.successes - (last.success ? 1 : 0),
              misses: t.misses - (last.success ? 0 : 1),
              repIds: t.repIds.slice(0, -1),
            },
      ),
    );
  }

  function goTo(i: number) {
    setIndex(i);
    setRemaining(items![i].minutes * 60);
    setRunning(true);
    setShowSteps(false);
  }

  async function finish() {
    setBusy(true);
    const levelUps = await finishSession(db, dog!.id, sessionId!);
    await refresh();
    router.replace({ pathname: '/session/summary', params: { id: String(sessionId), levelUps: JSON.stringify(levelUps) } });
  }

  function close() {
    if (totalReps === 0) {
      repo.discardSessionIfEmpty(db, sessionId!).then(() => router.back());
      return;
    }
    Alert.alert('End session?', `You've logged ${totalReps} reps.`, [
      { text: 'Keep training', style: 'cancel' },
      { text: 'Save & finish', onPress: finish },
    ]);
  }

  const timeUp = remaining === 0;
  const hitTarget = done >= item.reps;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }}>
      {/* Top bar */}
      <Row style={{ paddingHorizontal: space.lg, justifyContent: 'space-between' }}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close session" hitSlop={12}>
          <Icon name="xmark.circle.fill" size={30} color={c.textMuted} />
        </Pressable>
        <Row gap={6} accessibilityLabel={`Skill ${index + 1} of ${items.length}`}>
          {items.map((_, i) => (
            <View
              key={i}
              style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= index ? c.accent : c.border }}
            />
          ))}
        </Row>
        <View style={{ width: 30 }} />
      </Row>

      <View style={{ flex: 1, paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md }}>
        <T variant="caption" color={c.accent} style={{ fontWeight: '700' }}>
          {item.role === 'review' ? 'QUICK REVIEW' : `SKILL ${index + 1} OF ${items.length}`} · LEVEL {item.level}
        </T>
        <T variant="display">{skill.name}</T>
        <T muted numberOfLines={showSteps ? undefined : 2}>
          {level.title}
        </T>

        <Pressable
          onPress={() => setShowSteps((s) => !s)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showSteps }}
          accessibilityLabel={showSteps ? 'Hide steps' : 'Show steps'}>
          <Row gap={6}>
            <T variant="label" color={c.accent}>
              {showSteps ? 'Hide steps' : 'Show steps'}
            </T>
            <Icon name={showSteps ? 'chevron.up' : 'chevron.down'} size={14} color={c.accent} />
          </Row>
        </Pressable>
        {showSteps && (
          <View style={{ gap: space.sm }}>
            {level.steps.map((s, i) => (
              <T key={i} variant="caption">
                {i + 1}. {s}
              </T>
            ))}
          </View>
        )}

        {/* Timer + counter */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm }}>
          <Pressable
            onPress={() => setRunning((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={`${fmt(remaining)} remaining. ${running ? 'Pause' : 'Resume'} timer`}
            style={[
              styles.timer,
              showSteps && styles.timerSmall,
              { borderColor: timeUp ? c.success : c.accent, backgroundColor: c.card },
            ]}>
            <T
              style={{
                fontSize: showSteps ? 30 : 44,
                lineHeight: showSteps ? 36 : 52,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}>
              {fmt(remaining)}
            </T>
            <T variant="caption" muted>
              {timeUp ? "Time's up" : running ? 'Tap to pause' : 'Paused'}
            </T>
          </Pressable>
          <T variant="heading" style={{ marginTop: space.md }} accessibilityLiveRegion="polite">
            {done} / {item.reps} reps
          </T>
          <T variant="caption" muted>
            {tally.successes} ✓ · {tally.misses} ✗{hitTarget ? ' · target reached!' : ''}
          </T>
          {tally.repIds.length > 0 && (
            <Pressable onPress={undo} accessibilityRole="button" accessibilityLabel="Undo last rep" hitSlop={10}>
              <Row gap={4}>
                <Icon name="arrow.uturn.backward" size={14} color={c.textMuted} />
                <T variant="caption" muted>
                  Undo
                </T>
              </Row>
            </Pressable>
          )}
        </View>
      </View>

      {/* Big one-handed controls */}
      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <Row gap={space.md}>
          <Pressable
            onPress={() => log(false)}
            accessibilityRole="button"
            accessibilityLabel="Miss"
            style={({ pressed }) => [styles.big, { flex: 1, backgroundColor: c.dangerSoft, opacity: pressed ? 0.8 : 1 }]}>
            <Icon name="xmark" size={30} color={c.danger} />
            <T variant="label" color={c.danger}>
              Miss
            </T>
          </Pressable>
          <Pressable
            onPress={() => log(true)}
            accessibilityRole="button"
            accessibilityLabel="Success"
            style={({ pressed }) => [
              styles.big,
              { flex: 2, backgroundColor: c.success, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}>
            <Icon name="checkmark" size={40} color={c.onSuccess} />
            <T variant="label" color={c.onSuccess} style={{ fontSize: 18 }}>
              Got it!
            </T>
          </Pressable>
        </Row>
        <Row gap={space.md}>
          {index > 0 && <Button title="Back" kind="secondary" onPress={() => goTo(index - 1)} style={{ flex: 1 }} />}
          {isLast ? (
            <Button
              title="Finish session"
              kind={hitTarget || timeUp ? 'primary' : 'secondary'}
              loading={busy}
              disabled={totalReps === 0}
              onPress={finish}
              style={{ flex: 2 }}
            />
          ) : (
            <Button
              title="Next skill"
              icon="arrow.right"
              kind={hitTarget || timeUp ? 'primary' : 'secondary'}
              onPress={() => goTo(index + 1)}
              style={{ flex: 2 }}
            />
          )}
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timer: { width: 176, height: 176, borderRadius: 88, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  timerSmall: { width: 120, height: 120, borderRadius: 60, borderWidth: 5 },
  big: { height: 120, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
