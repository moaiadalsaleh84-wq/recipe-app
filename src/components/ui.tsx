/**
 * Small building blocks shared across screens.
 * All tappable pieces are at least 44pt and give press + haptic feedback.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { HapticKind } from '../lib/haptics';
import { useTheme } from '../theme';
import { CatBuddy } from './cats/CatBuddy';
import type { BuddyId, Mood } from './cats/types';
import { Icon, type IconName } from './Icon';
import { Chunky } from './Chunky';
import { PressableScale } from './PressableScale';

/* ---------- Chip: a toggleable filter with a clear selected state ---------- */

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const t = useTheme();
  // Selected chips are green ("this is on"), so tomato stays reserved for the screen's main action.
  const fg = selected ? '#FFFFFF' : t.colors.label;
  return (
    <Chunky
      onPress={onPress}
      haptic="select"
      accessibilityRole="togglebutton"
      aria-selected={selected}
      accessibilityLabel={`${label} filter`}
      hitSlop={{ top: 2, bottom: 2 }}
      depth={t.depth.small}
      radius={t.radius.pill}
      face={selected ? t.colors.success : t.colors.cell}
      lip={selected ? t.colors.successDeep : t.colors.lip}
      border={selected ? undefined : t.colors.border}
      faceStyle={styles.chip}
    >
      {(selected || icon) && <Icon name={selected ? 'check' : icon!} size={14} color={fg} weight="bold" />}
      <Text style={[t.type.subhead, { color: fg, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>{label}</Text>
    </Chunky>
  );
}

/* ---------- Button ---------- */

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /**
   * filled: the ONE main action on a screen (tomato). success: finishing something (green).
   * reward: claiming a reward (yellow). tinted: every other action (white). plain: text only.
   */
  variant?: 'filled' | 'success' | 'reward' | 'tinted' | 'plain';
  size?: 'large' | 'medium';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, icon, variant = 'filled', size = 'large', disabled, style, accessibilityLabel }: ButtonProps) {
  const t = useTheme();
  const large = size === 'large';
  const text = [large ? t.type.button : t.type.subhead, large ? null : { fontFamily: t.fonts.display, fontWeight: 'normal' as const }];
  if (variant === 'plain') {
    return (
      <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel ?? label} style={[styles.button, large ? styles.buttonLarge : styles.buttonMedium, !large && { alignSelf: 'center' }, style]}>
        {icon && <Icon name={icon} size={large ? 20 : 17} color={t.colors.tint} weight="bold" />}
        <Text style={[text, { color: t.colors.tint }]}>{label}</Text>
      </PressableScale>
    );
  }
  const kind = t.buttons[variant === 'filled' ? 'primary' : variant === 'tinted' ? 'secondary' : variant];
  return (
    <Chunky
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      face={kind.face}
      lip={kind.lip}
      border={kind.border}
      depth={large ? t.depth.button : t.depth.small}
      radius={large ? t.radius.md : 14}
      style={[!large && { alignSelf: 'center' }, style]}
      faceStyle={[styles.button, large ? styles.buttonLarge : styles.buttonMedium]}
    >
      {icon && <Icon name={icon} size={large ? 20 : 17} color={kind.label} weight="bold" />}
      <Text style={[text, { color: kind.label }]}>{label}</Text>
    </Chunky>
  );
}

/** Round icon-only button, e.g. in headers or over photos. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  background,
  size = 44,
  iconSize = 18,
  disabled,
  style,
  haptic = 'tap',
}: {
  haptic?: HapticKind | null;
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  background?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        background ? { backgroundColor: background } : null,
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color ?? t.colors.tint} weight="semibold" />
    </PressableScale>
  );
}

/* ---------- Stepper (servings) ---------- */

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 24,
  step = 1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** Amount per tap. */
  step?: number;
}) {
  const t = useTheme();
  return (
    <View
      style={[styles.stepper, { backgroundColor: t.colors.cell, ...t.chunky.card }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${value}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(Math.min(max, value + step));
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(Math.max(min, value - step));
      }}
    >
      <IconButton icon="minus" haptic="select" accessibilityLabel={`Decrease ${label}`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} color={t.colors.label} />
      <Text style={[t.type.headline, styles.stepperValue, { color: t.colors.label }]} testID="stepper-value">
        {value}
      </Text>
      <IconButton icon="plus" haptic="select" accessibilityLabel={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} color={t.colors.label} />
    </View>
  );
}

/* ---------- Animated checkmark circle ---------- */

export function CheckCircle({ checked, color }: { checked: boolean; color: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(checked ? 1 : 0);
  const ring = useSharedValue(1);

  useEffect(() => {
    if (checked) {
      scale.set(reduceMotion ? 1 : withSpring(1, t.motion.pop));
      ring.set(reduceMotion ? 1 : withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, t.motion.pop)));
    } else {
      scale.set(withTiming(0, { duration: 140 }));
    }
  }, [checked, reduceMotion, ring, scale, t.motion.pop]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: scale.get() }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.get() }] }));

  return (
    <Animated.View style={[styles.check, { borderColor: checked ? color : t.colors.tertiaryLabel }, ringStyle]}>
      <Animated.View style={[styles.checkFill, { backgroundColor: color }, fillStyle]}>
        <Icon name="check" size={14} color="#FFFFFF" weight="bold" />
      </Animated.View>
    </Animated.View>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(0.45, { duration: 800 }), -1, true));
  }, [opacity, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ backgroundColor: t.colors.fill, borderRadius: t.radius.sm, borderCurve: 'continuous' }, style, animated]} />;
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  message,
  action,
  cat,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  /** Show the user's cat acting out the empty state instead of an icon. */
  cat?: { buddy: BuddyId; mood: Mood };
}) {
  const t = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      {cat ? (
        <CatBuddy buddy={cat.buddy} mood={cat.mood} size={140} />
      ) : (
        <View style={[styles.emptyIcon, { backgroundColor: t.colors.tintSoft }]}>
          <Icon name={icon} size={30} color={t.colors.tint} weight="semibold" />
        </View>
      )}
      <Text style={[t.type.title3, { color: t.colors.label, textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 280 }]}>{message}</Text>
      {action && <Button label={action.label} icon={action.icon} onPress={action.onPress} variant="filled" size="medium" style={{ marginTop: 8 }} />}
    </View>
  );
}

/* ---------- Grouped list section (iOS inset grouped style) ---------- */

export function Section({ title, footer, children, right }: { title?: string; footer?: string; children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.spacing.xl }}>
      {(title || right) && (
        <View style={styles.sectionHeader}>
          {title && <Text style={[t.type.title3, { color: t.colors.label, flex: 1 }]}>{title}</Text>}
          {right}
        </View>
      )}
      {/* Outer view draws the outline + lip; inner view clips rows to the rounded corners. */}
      <View style={[styles.sectionBody, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]}>
        <View style={{ borderRadius: t.radius.lg - 2, overflow: 'hidden', borderCurve: 'continuous' }}>{children}</View>
      </View>
      {footer && <Text style={[t.type.footnote, styles.sectionFooter, { color: t.colors.secondaryLabel }]}>{footer}</Text>}
    </View>
  );
}

export function Separator({ inset = 16 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.separator, marginLeft: inset }} />;
}

/* ---------- Search field (Android and web; iOS uses the native header search bar) ---------- */

export function SearchField({ value, onChangeText, placeholder, style, ...rest }: TextInputProps & { value: string; onChangeText: (s: string) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: t.colors.cell, ...t.chunky.card }, style]}>
      <Icon name="search" size={17} color={t.colors.secondaryLabel} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.secondaryLabel}
        style={[t.type.body, styles.searchInput, { color: t.colors.label }]}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        {...rest}
      />
      {value.length > 0 && (
        <IconButton icon="closeCircle" accessibilityLabel="Clear search" onPress={() => onChangeText('')} color={t.colors.tertiaryLabel} size={32} iconSize={17} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 16,
    // With the lip the chip is 42 tall; hitSlop extends the touch area past 44.
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLarge: { minHeight: 52, paddingHorizontal: 22 },
  buttonMedium: { minHeight: 44, paddingHorizontal: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderCurve: 'continuous' },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  stepperValue: { minWidth: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  checkFill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8, minHeight: 28 },
  sectionBody: { borderCurve: 'continuous' },
  sectionFooter: { paddingHorizontal: 16, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderCurve: 'continuous', paddingLeft: 14, minHeight: 50 },
  searchInput: { flex: 1, alignSelf: 'stretch', minHeight: 44, paddingVertical: 0, outlineStyle: 'none' } as never,
});

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <View style={[segStyles.wrap, { backgroundColor: t.colors.fillStrong }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            scaleTo={0.95}
            accessibilityRole="radio"
            aria-checked={selected}
            accessibilityLabel={o.label}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[segStyles.item, selected && { backgroundColor: t.colors.cell, ...t.chunky.lip }]}
          >
            <Text style={[t.type.footnote, { color: selected ? t.colors.label : t.colors.secondaryLabel, fontWeight: 'normal', fontFamily: t.fonts.rounded, fontSize: 14 }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 16, padding: 4, paddingBottom: 6, borderCurve: 'continuous' },
  item: { minHeight: 38, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
