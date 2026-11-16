import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { TextField } from '@/components/forms';
import { Button, Card, Icon, Row, Screen, SectionTitle, T } from '@/components/ui';
import { getSkill } from '@/content';
import * as repo from '@/db/repo';
import type { LevelUp } from '@/services/training';
import { space, useColors } from '@/theme';

export default function SessionSummary() {
  const db = useSQLiteContext();
  const c = useColors();
  const params = useLocalSearchParams<{ id: string; levelUps?: string }>();
  const sessionId = Number(params.id);
  const levelUps: LevelUp[] = params.levelUps ? JSON.parse(params.levelUps) : [];

  const [rows, setRows] = useState<repo.SessionSkillSummary[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    repo.getSessionSummary(db, sessionId).then(setRows);
  }, [db, sessionId]);

  const reps = rows.reduce((n, r) => n + r.reps, 0);
  const successes = rows.reduce((n, r) => n + r.successes, 0);
  const pct = reps ? Math.round((successes / reps) * 100) : 0;

  async function done() {
    setSaving(true);
    if (notes.trim()) await repo.setSessionNotes(db, sessionId, notes);
    router.dismissAll();
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }}>
      <Screen padTop>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center', gap: space.sm, marginTop: space.xl }}>
          <View
            style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.successSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pawprint.fill" size={48} color={c.success} />
          </View>
          <T variant="title">Nice work!</T>
          <T muted>
            {reps} reps · {pct}% success
          </T>
        </Animated.View>

        {levelUps.map((lu, i) => {
          const skill = getSkill(lu.skillId);
          if (!skill) return null;
          const mastered = lu.to > skill.levels.length;
          return (
            <Animated.View key={lu.skillId} entering={FadeInDown.delay(300 + i * 150).springify()}>
              <Card tone="accentSoft" style={{ borderColor: c.accent, borderWidth: 2 }}>
                <Row>
                  <Icon name={mastered ? 'star.fill' : 'arrow.up.circle.fill'} size={32} color={c.accent} />
                  <View style={{ flex: 1 }}>
                    <T variant="heading">{mastered ? `${skill.name} mastered!` : `${skill.name}: level up!`}</T>
                    <T variant="caption" muted>
                      {mastered ? 'Every level passed. It will show up in reviews.' : `On to level ${lu.to} next session.`}
                    </T>
                  </View>
                </Row>
              </Card>
            </Animated.View>
          );
        })}

        <SectionTitle>This session</SectionTitle>
        <Card style={{ gap: space.sm }}>
          {rows.map((r) => (
            <Row key={`${r.skillId}-${r.level}`} style={{ justifyContent: 'space-between' }}>
              <T style={{ flex: 1 }}>
                {getSkill(r.skillId)?.name ?? r.skillId} · L{r.level}
              </T>
              <T muted>
                {r.successes}/{r.reps}
              </T>
            </Row>
          ))}
        </Card>

        <SectionTitle>Notes (optional)</SectionTitle>
        <TextField
          label="Session notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Distractions, wins, what to try next time..."
          multiline
        />
        <Button title="Done" loading={saving} onPress={done} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
