import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, View } from 'react-native';

import { Card, Icon, LevelBadge, Row, Screen, SectionTitle, T } from '@/components/ui';
import { GOALS, SKILLS, getGoal, getSkill, type Skill } from '@/content';
import * as repo from '@/db/repo';
import { useFocusData } from '@/hooks/useFocusData';
import type { SkillState } from '@/logic/plan';
import { useDog } from '@/state/DogContext';
import { space, useColors } from '@/theme';

function SkillRow({ skill, progress, first }: { skill: Skill; progress: Record<string, SkillState>; first: boolean }) {
  const c = useColors();
  const level = progress[skill.id]?.level ?? 1;
  const missing = skill.prerequisites.filter((p) => (progress[p]?.level ?? 1) <= 1);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/skill/[id]', params: { id: skill.id } })}
      accessibilityRole="button"
      accessibilityHint="Opens skill details"
      style={({ pressed }) => ({
        paddingVertical: space.md,
        borderTopWidth: first ? 0 : 1,
        borderColor: c.border,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Row>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="label">{skill.name}</T>
          {missing.length > 0 ? (
            <Row gap={4}>
              <Icon name="lock.fill" size={12} color={c.textMuted} />
              <T variant="caption" muted>
                After {missing.map((id) => getSkill(id)?.name ?? id).join(', ')} level 1
              </T>
            </Row>
          ) : null}
        </View>
        <LevelBadge level={level} levels={skill.levels.length} />
        <Icon name="chevron.right" size={14} color={c.textMuted} />
      </Row>
    </Pressable>
  );
}

export default function Skills() {
  const db = useSQLiteContext();
  const { dog, goalIds } = useDog();
  const progress = useFocusData(() => (dog ? repo.getProgress(db, dog.id) : Promise.resolve<Record<string, SkillState>>({})), dog?.id);

  if (!progress) return <Screen padTop>{null}</Screen>;

  const myGoals = goalIds.map(getGoal).filter((g) => !!g);
  const otherGoals = GOALS.filter((g) => !goalIds.includes(g.id));
  const covered = new Set(GOALS.flatMap((g) => g.skillIds));
  const loose = SKILLS.filter((s) => !covered.has(s.id));

  const section = (title: string, skills: Skill[], key: string) => (
    <View key={key} style={{ gap: space.sm }}>
      <SectionTitle>{title}</SectionTitle>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {skills.map((s, i) => (
          <SkillRow key={s.id} skill={s} progress={progress} first={i === 0} />
        ))}
      </Card>
    </View>
  );

  return (
    <Screen padTop>
      <T variant="title">Skill library</T>
      {myGoals.map((g) => section(`Your goal: ${g.name}`, g.skillIds.map(getSkill).filter((s) => !!s), g.id))}
      {otherGoals.map((g) => section(g.name, g.skillIds.map(getSkill).filter((s) => !!s), g.id))}
      {loose.length > 0 && section('More skills', loose, 'loose')}
    </Screen>
  );
}
