import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GOALS } from '@/content';
import type { DogInput } from '@/db/repo';
import type { AgeGroup, Energy } from '@/logic/plan';
import { pickDogPhoto } from '@/services/photos';
import { radius, space, useColors } from '@/theme';
import { Card, Chip, Icon, Row, T } from './ui';

export const AGE_OPTIONS: { id: AgeGroup; label: string; hint: string }[] = [
  { id: 'puppy', label: 'Puppy', hint: 'under 6 months' },
  { id: 'adolescent', label: 'Adolescent', hint: '6-18 months' },
  { id: 'adult', label: 'Adult', hint: '1.5-7 years' },
  { id: 'senior', label: 'Senior', hint: '7+ years' },
];

export const ENERGY_OPTIONS: { id: Energy; label: string }[] = [
  { id: 'low', label: 'Chill' },
  { id: 'medium', label: 'Moderate' },
  { id: 'high', label: 'Bouncy' },
];

export const MAX_GOALS = 3;

export function emptyDog(): DogInput {
  return { name: '', breed: null, photoUri: null, ageGroup: 'adult', energy: 'medium' };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">{label}</T>
      {children}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label: string;
  multiline?: boolean;
}) {
  const c = useColors();
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      multiline={multiline}
      style={[
        styles.input,
        { backgroundColor: c.card, borderColor: c.border, color: c.text },
        multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
      ]}
    />
  );
}

export function DogPhoto({ uri, size = 64 }: { uri: string | null; size?: number }) {
  const c = useColors();
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="pawprint.fill" size={size * 0.45} color={c.accent} />
    </View>
  );
}

/** Profile fields shared by onboarding and Settings. */
export function DogForm({ value, onChange }: { value: DogInput; onChange: (v: DogInput) => void }) {
  const c = useColors();
  const set = <K extends keyof DogInput>(k: K, v: DogInput[K]) => onChange({ ...value, [k]: v });

  return (
    <View style={{ gap: space.xl }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value.photoUri ? 'Change photo' : 'Add a photo'}
        onPress={async () => {
          const uri = await pickDogPhoto();
          if (uri) set('photoUri', uri);
        }}
        style={{ alignSelf: 'center', alignItems: 'center', gap: space.sm }}>
        <DogPhoto uri={value.photoUri} size={104} />
        <T variant="label" color={c.accent}>
          {value.photoUri ? 'Change photo' : 'Add a photo'}
        </T>
      </Pressable>

      <Field label="Name">
        <TextField label="Dog's name" value={value.name} onChangeText={(t) => set('name', t)} placeholder="e.g. Biscuit" />
      </Field>

      <Field label="Breed (optional)">
        <TextField
          label="Breed"
          value={value.breed ?? ''}
          onChangeText={(t) => set('breed', t || null)}
          placeholder="e.g. Lab mix"
        />
      </Field>

      <Field label="Age">
        <View style={styles.wrap}>
          {AGE_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              accessibilityHint={o.hint}
              selected={value.ageGroup === o.id}
              onPress={() => set('ageGroup', o.id)}
            />
          ))}
        </View>
        <T variant="caption" muted>
          {AGE_OPTIONS.find((o) => o.id === value.ageGroup)?.hint}
        </T>
      </Field>

      <Field label="Energy level">
        <View style={styles.wrap}>
          {ENERGY_OPTIONS.map((o) => (
            <Chip key={o.id} label={o.label} selected={value.energy === o.id} onPress={() => set('energy', o.id)} />
          ))}
        </View>
      </Field>
    </View>
  );
}

export function GoalPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const c = useColors();
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((g) => g !== id));
    else if (value.length < MAX_GOALS) onChange([...value, id]);
  };
  return (
    <View style={{ gap: space.sm }}>
      {GOALS.map((g) => {
        const selected = value.includes(g.id);
        const full = !selected && value.length >= MAX_GOALS;
        return (
          <Pressable
            key={g.id}
            onPress={() => toggle(g.id)}
            disabled={full}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: full }}
            accessibilityLabel={`${g.name}. ${g.description}`}>
            <Card
              style={{
                borderColor: selected ? c.accent : c.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                opacity: full ? 0.45 : 1,
                padding: space.md,
              }}>
              <Row>
                <View style={[styles.goalIcon, { backgroundColor: selected ? c.accent : c.accentSoft }]}>
                  <Icon name={g.icon} size={20} color={selected ? c.onAccent : c.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="label">{g.name}</T>
                  <T variant="caption" muted>
                    {g.description}
                  </T>
                </View>
                <Icon name={selected ? 'checkmark.circle.fill' : 'circle'} color={selected ? c.accent : c.border} />
              </Row>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 'HH:MM' <-> Date for the native time picker. */
export function TimeField({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return (
    <DateTimePicker
      mode="time"
      display="spinner"
      value={date}
      minuteInterval={5}
      onChange={(_, d) => {
        if (d) onChange(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      }}
      style={{ alignSelf: 'stretch' }}
    />
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space.lg, fontSize: 17 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  goalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
