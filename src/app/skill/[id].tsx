import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Icon, LevelBadge, ProfessionalNotice, Row, Screen, SectionTitle, T } from '@/components/ui';
import { getGoal, getSkill, isMastered, type SkillLevel } from '@/content';
import * as repo from '@/db/repo';
import { useFocusData } from '@/hooks/useFocusData';
import type { SkillState } from '@/logic/plan';
import { useDog } from '@/state/DogContext';
import { space, useColors } from '@/theme';

function List({ title, items, icon, color }: { title: string; items: string[]; icon: string; color: string }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">{title}</T>
      {items.map((t, i) => (
        <Row key={i} gap={space.sm} style={{ alignItems: 'flex-start' }}>
          <Icon name={icon} size={14} color={color} />
          <T variant="caption" style={{ flex: 1 }}>
            {t}
          </T>
        </Row>
      ))}
    </View>
  );
}

function LevelCard({ level, status }: { level: SkillLevel; status: 'passed' | 'current' | 'upcoming' }) {
  const c = useColors();
  const [open, setOpen] = useState(status === 'current');
  const rule = level.levelUp;
  const statusLabel = { passed: 'Passed', current: 'Current', upcoming: 'Upcoming' }[status];
  return (
    <Card style={status === 'current' ? { borderColor: c.accent, borderWidth: 2 } : undefined}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Level ${level.level}, ${statusLabel}. ${level.title}`}>
        <Row>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: status === 'passed' ? c.successSoft : status === 'current' ? c.accent : c.cardAlt,
            }}>
            {status === 'passed' ? (
              <Icon name="checkmark" size={14} color={c.success} />
            ) : (
              <T variant="label" color={status === 'current' ? c.onAccent : c.textMuted}>
                {level.level}
              </T>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <T variant="caption" muted>
              Level {level.level} · {statusLabel}
            </T>
            <T variant="label">{level.title}</T>
          </View>
          <Icon name={open ? 'chevron.up' : 'chevron.down'} size={14} color={c.textMuted} />
        </Row>
      </Pressable>
      {open && (
        <View style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <T variant="label">Steps</T>
            {level.steps.map((s, i) => (
              <Row key={i} gap={space.sm} style={{ alignItems: 'flex-start' }}>
                <T variant="caption" color={c.accent} style={{ fontWeight: '700', width: 18 }}>
                  {i + 1}.
                </T>
                <T variant="caption" style={{ flex: 1 }}>
                  {s}
                </T>
              </Row>
            ))}
          </View>
          <List title="Common mistakes" items={level.mistakes} icon="exclamationmark.triangle.fill" color={c.danger} />
          <List title="Troubleshooting" items={level.tips} icon="lightbulb.fill" color={c.accent} />
          <T variant="caption" muted>
            Level up: {Math.round(rule.successRate * 100)}% success over at least {rule.minReps} reps across your last{' '}
            {rule.minSessions} sessions at this level. Aim for {level.repsPerSession} reps per session.
          </T>
        </View>
      )}
    </Card>
  );
}

export default function SkillDetail() {
  const db = useSQLiteContext();
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dog } = useDog();
  const skill = getSkill(id);
  const progress = useFocusData(() => (dog ? repo.getProgress(db, dog.id) : Promise.resolve<Record<string, SkillState>>({})), dog?.id);

  if (!skill || !progress) return null;
  const level = progress[skill.id]?.level ?? 1;
  const missing = skill.prerequisites.filter((p) => (progress[p]?.level ?? 1) <= 1);

  return (
    <Screen>
      <Stack.Screen options={{ title: skill.name }} />
      {skill.placeholder && (
        <Card tone="warningSoft" style={{ borderColor: 'transparent' }}>
          <T variant="caption" color={c.warningText}>
            Placeholder content. Real training steps for this skill haven&apos;t been written yet.
          </T>
        </Card>
      )}
      <View style={{ gap: space.sm }}>
        <T variant="title">{skill.name}</T>
        <T muted>{skill.summary}</T>
        <Row>
          <LevelBadge level={level} levels={skill.levels.length} />
          <T variant="caption" muted style={{ flex: 1 }}>
            {skill.goalIds.map((g) => getGoal(g)?.name).filter(Boolean).join(' · ')}
          </T>
        </Row>
      </View>

      {missing.length > 0 && (
        <Card tone="cardAlt">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="lock.fill" size={16} color={c.textMuted} />
            <T variant="caption" muted style={{ flex: 1 }}>
              Daily plans add this skill once {missing.map((p) => getSkill(p)?.name ?? p).join(' and ')} pass level 1.
              You can still practice it any time.
            </T>
          </Row>
        </Card>
      )}

      <Button
        title={isMastered(skill, level) ? 'Practice (review)' : `Practice level ${level} now`}
        icon="play.fill"
        onPress={() => router.push({ pathname: '/session/run', params: { skill: skill.id } })}
      />

      <SectionTitle>Levels</SectionTitle>
      {skill.levels.map((l) => (
        <LevelCard
          key={l.level}
          level={l}
          status={l.level < level ? 'passed' : l.level === level ? 'current' : 'upcoming'}
        />
      ))}
      <ProfessionalNotice />
    </Screen>
  );
}
