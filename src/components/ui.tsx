import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useColors, type Palette } from '@/theme';

// ---------- Text ----------

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const variantStyle: Record<Variant, object> = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 19, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
};

export function T({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const c = useColors();
  return (
    <Text
      maxFontSizeMultiplier={2}
      style={[variantStyle[variant], { color: color ?? (muted ? c.textMuted : c.text) }, style]}
      {...rest}
    />
  );
}

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  padTop = false,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Add the top safe-area inset (for screens without a header). */
  padTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!scroll) {
    const style = { padding: space.lg, gap: space.lg, paddingTop: (padTop ? insets.top : 0) + space.lg, paddingBottom: insets.bottom + space.lg };
    return <View style={[{ flex: 1, backgroundColor: c.background }, style, contentStyle]}>{children}</View>;
  }
  // ScrollView's automatic inset adjustment already accounts for the safe area and any header.
  const style = [{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }, contentStyle];
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={style}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, tone = 'card' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: keyof Palette }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c[tone], borderColor: c.border }, style]}>{children}</View>
  );
}

export function Row({ children, style, gap = space.md, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Icon({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  const c = useColors();
  // Decorative: the surrounding control carries the accessible label.
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView name={name as SFSymbol} size={size} tintColor={color ?? c.text} type="hierarchical" />
    </View>
  );
}

// ---------- Buttons ----------

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  kind?: ButtonKind;
  icon?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = { primary: c.accent, secondary: c.cardAlt, ghost: 'transparent', danger: c.dangerSoft }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, ghost: c.accent, danger: c.danger }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Row gap={space.sm} style={{ justifyContent: 'center' }}>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <T variant="label" color={fg} style={{ fontSize: 17 }}>
            {title}
          </T>
        </Row>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  accessibilityHint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
  accessibilityHint?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.accent : c.card,
          borderColor: selected ? c.accent : c.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Row gap={6}>
        {icon ? <Icon name={icon} size={16} color={selected ? c.onAccent : c.textMuted} /> : null}
        <T variant="label" color={selected ? c.onAccent : c.text}>
          {label}
        </T>
      </Row>
    </Pressable>
  );
}

// ---------- Small pieces ----------

export function LevelBadge({ level, levels }: { level: number; levels: number }) {
  const c = useColors();
  const mastered = level > levels;
  return (
    <View
      accessibilityLabel={mastered ? 'Mastered' : `Level ${level} of ${levels}`}
      style={[styles.badge, { backgroundColor: mastered ? c.successSoft : c.accentSoft }]}>
      <T variant="caption" color={mastered ? c.success : c.accent} style={{ fontWeight: '700' }}>
        {mastered ? '★ Mastered' : `Level ${level}/${levels}`}
      </T>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <T variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700', marginTop: space.sm }}>
      {children}
    </T>
  );
}

/** Behavioral-health notice. Shown wherever training advice appears. */
export function ProfessionalNotice() {
  const c = useColors();
  return (
    <Card tone="warningSoft" style={{ borderColor: 'transparent' }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Icon name="cross.case.fill" size={20} color={c.warningText} />
        <T variant="caption" color={c.warningText} style={{ flex: 1 }}>
          This app covers everyday manners and skills. For aggression, severe fear or anxiety, or any sudden change in
          behavior, please consult a certified dog trainer or a veterinary behaviorist.
        </T>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: space.lg, gap: space.md, borderWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 54, borderRadius: radius.md, paddingHorizontal: space.xl, justifyContent: 'center' },
  chip: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: space.lg, justifyContent: 'center', borderWidth: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
});
