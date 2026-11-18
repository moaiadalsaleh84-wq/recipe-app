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
import { noWidow } from '../lib/text';
import { useTheme } from '../theme';
import { Mascot } from './mascot/Mascot';
import type { Mood } from './mascot/moods';
import { Icon, type IconName } from './Icon';
import { Chunky } from './Chunky';
import { PressableScale } from './PressableScale';

/* ---------- Chip: the one pill used everywhere (filters, tags, quick-add, removable items) ---------- */

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  leading,
  trailing,
  accessibilityLabel,
  toggle = true,
  style,
}: {
  /** Layout of the whole chip (e.g. a fixed width in a grid). */
  style?: StyleProp<ViewStyle>;
  label: string;
  /** Selected chips turn ink-dark. */
  selected?: boolean;
  onPress: () => void;
  /** A small icon before the label. */
  icon?: IconName;
  /** A small picture before the label instead of an icon (e.g. a <FoodIcon bare>). */
  leading?: ReactNode;
  /** A small icon after the label: "close" for removable items, "chevronRight" for links, "plus" to add. */
  trailing?: IconName;
  accessibilityLabel?: string;
  /** False for chips that do something instead of switching on and off. */
  toggle?: boolean;
}) {
  const t = useTheme();
  // Selected chips go dark (ink), so the aubergine stays reserved for the screen's main action.
  const fg = selected ? t.colors.background : t.colors.label;
  return (
    <Chunky
      onPress={onPress}
      haptic="select"
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      aria-selected={toggle ? selected : undefined}
      accessibilityLabel={accessibilityLabel ?? (toggle ? `${label} filter` : label)}
      hitSlop={{ top: 2, bottom: 2 }}
      radius={t.radius.pill}
      face={selected ? t.colors.label : t.colors.cell}
      lip={selected ? t.colors.label : t.colors.cell}
      style={style}
      faceStyle={[styles.chip, style ? styles.chipFill : null]}
    >
      {leading ? leading : icon ? <Icon name={icon} size={15} color={selected ? fg : t.colors.tint} weight="semibold" /> : null}
      <Text style={[t.type.subhead, { color: fg, fontWeight: '600' }]}>{label}</Text>
      {trailing && <Icon name={trailing} size={12} color={selected ? fg : t.colors.secondaryLabel} weight="bold" />}
    </Chunky>
  );
}

/** A round white button for the top right of a screen (share, settings…). */
export function HeaderButton({ icon, onPress, accessibilityLabel, disabled }: { icon: IconName; onPress: () => void; accessibilityLabel: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Chunky onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} radius={22} face={t.colors.cell} lip={t.colors.cell} faceStyle={styles.headerButton}>
      <Icon name={icon} size={19} color={t.colors.label} weight="semibold" />
    </Chunky>
  );
}

/* ---------- Button ---------- */

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /**
   * filled: the ONE main action on a screen (aubergine). success: finishing something (green).
   * reward: claiming a reward (saffron). tinted: every other action (soft aubergine). plain: text only.
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
  const text = [large ? t.type.button : t.type.subhead, large ? null : { fontWeight: '600' as const }];
  if (variant === 'plain') {
    return (
      <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel ?? label} style={[styles.button, large ? styles.buttonLarge : styles.buttonMedium, !large && { alignSelf: 'center' }, style]}>
        {icon && <Icon name={icon} size={large ? 19 : 16} color={t.colors.tint} weight="semibold" />}
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
      radius={large ? t.radius.md : 12}
      style={[!large && { alignSelf: 'center' }, style]}
      faceStyle={[styles.button, large ? styles.buttonLarge : styles.buttonMedium]}
    >
      {icon && <Icon name={icon} size={large ? 19 : 16} color={kind.label} weight="semibold" />}
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
      style={[styles.stepper, { backgroundColor: t.colors.fill }]}
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

/* ---------- Progress bar: fills with a small bounce ---------- */

export function ProgressBar({ value, color, track, height = 8, label }: { /** 0 to 1 */ value: number; color?: string; track?: string; height?: number; label?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(reduceMotion ? withTiming(pct, { duration: 200 }) : withSpring(pct, { damping: 14, stiffness: 120, mass: 0.9 }));
  }, [pct, reduceMotion, shown]);
  // Never an empty-looking bar: a small nub shows where it starts.
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(3, Math.min(100, shown.get() * 100))}%` }));
  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: track ?? t.colors.fillStrong, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color ?? t.colors.success }, fill]} />
    </View>
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
  /** Show Biscuit acting out the empty state instead of an icon: pass the mood. */
  cat?: Mood;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      {cat ? (
        <Mascot mood={cat} size={120} />
      ) : (
        <View style={[styles.emptyIcon, { backgroundColor: t.colors.tintSoft }]}>
          <Icon name={icon} size={30} color={t.colors.tint} weight="semibold" />
        </View>
      )}
      <Text style={[t.type.title2, { color: t.colors.label, textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.type.subhead, t.noWidows.style, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 280 }]} {...t.noWidows.props}>
        {noWidow(message)}
      </Text>
      {action && (
        // Its own row, so the button's size never depends on the text above it.
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          <Button label={action.label} icon={action.icon} onPress={action.onPress} variant="filled" size="medium" style={{ alignSelf: 'auto' }} />
        </View>
      )}
    </View>
  );
}

/* ---------- Grouped list section (iOS inset grouped style) ---------- */

export function Section({ title, footer, children, right }: { title?: string; footer?: string; children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: t.layout.section }}>
      {(title || right) && (
        <View style={styles.sectionHeader}>
          {title && <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]}>{title}</Text>}
          {right}
        </View>
      )}
      {/* A plain white card; rows are clipped to its rounded corners. */}
      <View style={[styles.sectionBody, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, overflow: 'hidden' }]}>{children}</View>
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
    <View style={[styles.search, { backgroundColor: t.colors.cell }, style]}>
      <Icon name="search" size={17} color={t.colors.secondaryLabel} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.tertiaryLabel}
        style={[t.type.body, styles.searchInput, { color: t.colors.label }]}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        {...rest}
      />
      {value.length > 0 && (
        <IconButton icon="closeCircle" accessibilityLabel="Clear search" onPress={() => onChangeText('')} color={t.colors.tertiaryLabel} size={44} iconSize={17} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  // In a grid: content starts on the left and the label can take the rest of the width.
  chipFill: { justifyContent: 'flex-start', paddingHorizontal: 12 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLarge: { minHeight: 52, paddingHorizontal: 22 },
  buttonMedium: { minHeight: 44, paddingHorizontal: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderCurve: 'continuous' },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  stepperValue: { minWidth: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  checkFill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderCurve: 'continuous' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, minHeight: 28 },
  sectionBody: { borderCurve: 'continuous' },
  sectionFooter: { paddingHorizontal: 16, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderCurve: 'continuous', paddingLeft: 14, minHeight: 48 },
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
    <View style={[segStyles.wrap, { backgroundColor: t.colors.fill }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
            style={[segStyles.item, selected && { backgroundColor: t.isDark ? t.colors.elevated : t.colors.cell, ...t.shadow.card }]}
          >
            <Text style={[t.type.footnote, { color: selected ? t.colors.label : t.colors.secondaryLabel, fontWeight: '600', fontSize: 14 }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 14, padding: 3, borderCurve: 'continuous' },
  item: { minHeight: 44, minWidth: 56, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
