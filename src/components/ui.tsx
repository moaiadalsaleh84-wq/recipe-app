/**
 * Small building blocks shared across screens.
 * All tappable pieces are at least 44pt and give press + haptic feedback.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { noWidow, num } from '../lib/text';
import { duration as motionDuration } from '../motion';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { HapticKind } from '../lib/haptics';
import { fonts, useTheme, pop } from '../theme';
import Svg, { Circle, Path } from 'react-native-svg';
import { Mascot, MASCOT_ON } from './mascot/Mascot';
import type { Mood } from './mascot/moods';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { PopButton } from './pop/PopButton';
import { PopChip } from './pop/PopChip';
import { PopIconButton } from './pop/PopIconButton';
import { Lift } from './pop/Lift';

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
  color,
}: {
  /** Layout of the whole chip (e.g. a fixed width in a grid). */
  style?: StyleProp<ViewStyle>;
  label: string;
  /** Selected chips turn sunshine with a check. */
  selected?: boolean;
  onPress: () => void;
  /** A small icon before the label. */
  icon?: IconName;
  /** A small picture before the label instead of an icon (e.g. a <FoodIcon bare>). */
  leading?: ReactNode;
  /** A small icon after the label: "close" for removable items, "plus" to add. */
  trailing?: IconName;
  accessibilityLabel?: string;
  /** False for chips that do something instead of switching on and off. */
  toggle?: boolean;
  /** Background when not selected (white by default; tints for categories). */
  color?: string;
}) {
  return (
    <PopChip
      label={label}
      selected={selected}
      onPress={onPress}
      icon={icon}
      leading={leading}
      trailing={trailing}
      toggle={toggle}
      color={color}
      accessibilityLabel={accessibilityLabel ?? (toggle ? `${label} filter` : label)}
      style={style}
    />
  );
}

/** A round white button for the top right of a screen (share, settings…). */
export function HeaderButton({ icon, onPress, accessibilityLabel, disabled }: { icon: IconName; onPress: () => void; accessibilityLabel: string; disabled?: boolean }) {
  return <PopIconButton icon={icon} onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} iconSize={19} />;
}

/* ---------- Button ---------- */

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /**
   * filled: the ONE main action on a screen (sunshine). success: finishing something (leaf).
   * reward: claiming a reward (sunshine). tinted: every other action (white). plain: text only.
   */
  variant?: 'filled' | 'success' | 'reward' | 'tinted' | 'plain';
  size?: 'large' | 'medium';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A text button ("Maybe later", "Not now", "See recipe"): Nunito 800, 16, ink, no underline, a
 * 44pt tap area, and 60% opacity while pressed. `small` is for fine print links (13, muted).
 */
export function TextButton({ label, onPress, icon, color, small, disabled, style, accessibilityLabel, accessibilityRole = 'button', testID }: { label: string; onPress: () => void; icon?: IconName; color?: string; small?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityRole?: 'button' | 'link'; testID?: string }) {
  const t = useTheme();
  const ink = color ?? (small ? t.colors.secondaryLabel : t.colors.label);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [styles.textButton, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }, style]}
    >
      {icon && <Icon name={icon} size={small ? 13 : 16} color={ink} weight="bold" />}
      <Text style={[small ? styles.textButtonSmall : styles.textButtonLabel, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, icon, variant = 'filled', size = 'large', disabled, style, accessibilityLabel }: ButtonProps) {
  const t = useTheme();
  const large = size === 'large';
  if (variant === 'plain') {
    return <TextButton label={label} icon={icon} onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} style={[{ alignSelf: 'center' }, style]} />;
  }
  const kind = t.buttons[variant === 'filled' ? 'primary' : variant === 'tinted' ? 'secondary' : variant];
  return (
    <PopButton
      label={label}
      icon={icon}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      color={kind.face}
      textColor={kind.label}
      size={large ? 'large' : 'small'}
      style={[!large && { alignSelf: 'center' }, style]}
    />
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
    // Outline only, like a text input: it is a control you adjust, not a button to press.
    <View
      style={[styles.stepper, { backgroundColor: t.colors.cell, ...t.chunky.card, borderRadius: t.radius.pill }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: num(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(Math.min(max, value + step));
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(Math.max(min, value - step));
      }}
    >
      <IconButton icon="minus" haptic="select" accessibilityLabel={`Decrease ${label}`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} color={t.colors.label} />
      <Text style={[t.type.headline, styles.stepperValue, { color: t.colors.label }]} testID="stepper-value">
        {num(value)}
      </Text>
      <IconButton icon="plus" haptic="select" accessibilityLabel={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} color={t.colors.label} />
    </View>
  );
}

/* ---------- Animated checkmark circle ---------- */

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** Length of the tick path below (two strokes, about 14.9), rounded up so it's fully hidden at 0. */
const TICK_LENGTH = 16;

/**
 * A check mark whose line draws in from left to right (200 ms) when it appears. No scaling.
 * With Reduce Motion it's simply there.
 */
export function DrawnCheck({ size = 14, color = pop.ink, delay = 0 }: { size?: number; color?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const drawn = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) drawn.set(withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })));
  }, [reduceMotion, delay, drawn]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: TICK_LENGTH * (1 - drawn.get()) }));
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={size} height={size} viewBox="0 0 18 18">
        <AnimatedPath d="M3.5 9.5 L7 13 L14.5 4.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={TICK_LENGTH} animatedProps={props} />
      </Svg>
    </View>
  );
}

export function CheckCircle({ checked, color, checkColor = pop.ink }: { checked: boolean; color: string; /** The tick itself (ink by default: text and marks on color are ink). */ checkColor?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    // The circle fills with a smooth fade (150 ms); the tick draws itself in (DrawnCheck). No scaling.
    fill.set(reduceMotion ? (checked ? 1 : 0) : withTiming(checked ? 1 : 0, { duration: motionDuration.fast }));
  }, [checked, reduceMotion, fill]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get() }));

  return (
    <View style={[styles.check, { borderColor: t.pop.ink, backgroundColor: t.colors.cell }]}>
      <Animated.View style={[styles.checkFill, { backgroundColor: color }, fillStyle]}>{checked && <DrawnCheck size={16} color={checkColor} delay={60} />}</Animated.View>
    </View>
  );
}

/* ---------- Progress bar: fills smoothly ---------- */

export function ProgressBar({ value, color, track, height = 8, label }: { /** 0 to 1 */ value: number; color?: string; track?: string; height?: number; label?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  const shown = useSharedValue(0);
  const trackW = useSharedValue(0);
  useEffect(() => {
    // Fills smoothly over 500 ms (ease-out cubic), no bounce past the value.
    shown.set(reduceMotion ? withTiming(pct, { duration: 200 }) : withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [pct, reduceMotion, shown]);
  // Empty means empty: no fill at all at 0. Above 0 the fill is at least as wide as it is tall (a round end, not a sliver).
  const fill = useAnimatedStyle(() => {
    const v = shown.get();
    if (v <= 0.001) return { width: 0, opacity: 0 };
    return { width: Math.min(trackW.get(), Math.max(height, v * trackW.get())), opacity: 1 };
  });
  return (
    <View
      onLayout={(e) => trackW.set(e.nativeEvent.layout.width - 4)}
      style={{ height: height + 4, borderRadius: (height + 4) / 2, backgroundColor: track ?? t.colors.cell, borderWidth: 2, borderColor: t.pop.ink, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color ?? t.colors.success }, fill]} />
    </View>
  );
}

/* ---------- Progress ring ---------- */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A ring that fills clockwise (500 ms, ease-out, no overshoot) when it appears or changes, with anything in the middle. */
export function Ring({ value, size = 56, stroke = 6, color, track, children, label }: { /** 0 to 1 */ value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const shown = useSharedValue(reduceMotion ? pct : 0);
  useEffect(() => {
    shown.set(reduceMotion ? withTiming(pct, { duration: 200 }) : withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [pct, reduceMotion, shown]);
  // Only numbers in here (c is worked out above): this runs on the UI thread.
  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, shown.get()))) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? t.colors.fillStrong} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color ?? t.colors.success} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={arc} transform={`rotate(-90 ${size / 2} ${size / 2})`} opacity={pct > 0 ? 1 : 0} />
      </Svg>
      {children}
    </View>
  );
}

/** A number that counts up to its value (quickly, with an ease-out). Shows the value at once with Reduce Motion. */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * A number that counts up or down to its new value (400ms, eased) on the UI thread: the text is a
 * read-only field Reanimated updates every frame, so React doesn't re-render 60 times a second.
 * With Reduce Motion it just shows the new number. 1,000+ get a thousands separator.
 */
export function AnimatedNumber({ value, style, duration = 500, prefix = '', suffix = '', testID }: { value: number; style?: StyleProp<TextStyle>; duration?: number; prefix?: string; suffix?: string; testID?: string }) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(reduceMotion ? value : 0);
  useEffect(() => {
    shown.set(reduceMotion ? value : withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
  }, [value, reduceMotion, duration, shown]);
  const props = useAnimatedProps(() => {
    const n = String(Math.round(shown.get())).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return { text: prefix + n + suffix, defaultValue: prefix + n + suffix } as object;
  });
  const flat = StyleSheet.flatten([{ fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] }, style]);
  const finalText = `${prefix}${num(value)}${suffix}`;
  return (
    // An invisible copy of the final text gives the size; the counting field sits exactly on top.
    <View accessible accessibilityLabel={finalText} testID={testID ? `${testID}-box` : undefined}>
      <Text style={[flat, { opacity: 0 }]} numberOfLines={1} importantForAccessibility="no" accessibilityElementsHidden>
        {finalText}
      </Text>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        pointerEvents="none"
        maxFontSizeMultiplier={1.3}
        accessibilityElementsHidden
        importantForAccessibility="no"
        defaultValue={`${prefix}${num(reduceMotion ? value : 0)}${suffix}`}
        testID={testID}
        animatedProps={props}
        style={[flat, StyleSheet.absoluteFill, { padding: 0, margin: 0, borderWidth: 0 }]}
      />
    </View>
  );
}

/* ---------- Skeleton ---------- */

/**
 * A placeholder for something still loading: a soft fill with a light band sweeping across it
 * (transform only, on the UI thread). Reduce Motion: a still fill.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!reduceMotion) sweep.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [sweep, reduceMotion]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.6 + sweep.get() * w * 1.6 }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ backgroundColor: t.colors.fill, borderRadius: t.radius.sm, borderCurve: 'continuous', overflow: 'hidden' }, style]}>
      {!reduceMotion && w > 0 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: w * 0.6, backgroundColor: 'rgba(255,255,255,0.55)' }, band]} />}
    </View>
  );
}


/* ---------- Section header: the same hierarchy on every screen ---------- */

export function SectionHeader({ title, subtitle, action, right, style }: { title: string; subtitle?: string; action?: { label: string; onPress: () => void }; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.sh, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.type.title2, { color: t.colors.label }]} accessibilityRole="header">
          {title}
        </Text>
        {/* Never one word alone on the last line. */}
        {subtitle ? <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>{noWidow(subtitle)}</Text> : null}
      </View>
      {action && (
        <PressableScale onPress={action.onPress} accessibilityLabel={`${action.label}: ${title}`} style={styles.shAction}>
          <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.bold }]}>{action.label}</Text>
          <Icon name="chevronRight" size={12} color={t.colors.tint} weight="bold" />
        </PressableScale>
      )}
      {right}
    </View>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  message,
  action,
  secondary,
  cat,
}: {
  icon: IconName;
  title: string;
  message: string;
  /** The ONE pre-selected next step. */
  action?: { label: string; onPress: () => void; icon?: IconName };
  /** A quieter alternative, as a text link under it. */
  secondary?: { label: string; onPress: () => void };
  /** Show Biscuit acting out the empty state instead of an icon: pass the mood. */
  cat?: Mood;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      {cat && MASCOT_ON ? (
        <Mascot mood={cat} size={132} />
      ) : (
        <Lift radius={48} style={{ marginBottom: 8 }}>
          <View style={[styles.emptyIcon, { backgroundColor: t.colors.cell, borderColor: t.colors.border }]}>
            <View style={[styles.emptyIconInner, { backgroundColor: t.colors.tintSoft }]}>
              <Icon name={icon} size={30} color={t.colors.tint} weight="semibold" />
            </View>
          </View>
        </Lift>
      )}
      <Text style={[t.type.title2, { color: t.colors.label, textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.type.callout, t.noWidows.style, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 290 }]} {...t.noWidows.props}>
        {message}
      </Text>
      {action && (
        // Its own row, so the button's size never depends on the text above it.
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
          <Button label={action.label} icon={action.icon} onPress={action.onPress} variant="filled" size="medium" style={{ alignSelf: 'auto' }} />
        </View>
      )}
      {secondary && (
        <TextButton label={secondary.label} onPress={secondary.onPress} accessibilityRole="link" />
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
      {/* The outline sits on the one shared shadow; the inner view clips rows to the rounded corners. */}
      <Lift radius={t.layout.cardRadius}>
        <View style={[styles.sectionBody, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
          <View style={{ borderRadius: t.layout.cardRadius - 2.5, overflow: 'hidden', borderCurve: 'continuous' }}>{children}</View>
        </View>
      </Lift>
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
    <View style={[styles.search, { backgroundColor: t.colors.cell, ...t.chunky.card, borderRadius: t.radius.md }, style]}>
      <Icon name="search" size={18} color={t.colors.label} weight="semibold" />
      <TextInput maxFontSizeMultiplier={1.3}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.secondaryLabel}
        style={[t.type.input, styles.searchInput, { color: t.colors.label }]}
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
  textButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  textButtonLabel: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  textButtonSmall: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
  },
  // A hit slop of 2 above and below makes the tap area 44.
  chipBordered: { minHeight: 40 },
  // In a grid: content starts on the left and the label can take the rest of the width.
  chipFill: { justifyContent: 'flex-start', paddingHorizontal: 12 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonLarge: { minHeight: 54, paddingHorizontal: 24 },
  buttonMedium: { minHeight: 46, paddingHorizontal: 20 },
  // Every stepper is the same width (150), so stacked ones line up.
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: 150, borderRadius: 999, borderCurve: 'continuous', paddingHorizontal: 2 },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  stepperValue: { minWidth: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
  // Rounded squares: the tick pops in on a basil fill.
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  checkFill: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  print: { borderRadius: 18, borderWidth: 1, padding: 5, paddingBottom: 14, borderCurve: 'continuous' },
  printPhoto: { flex: 1, borderRadius: 13 },
  center: { alignItems: 'center', justifyContent: 'center' },
  // 32 above every section, 12 between its title and its content. (Buttons on the right bring their own 44pt height.)
  sh: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 32, marginBottom: 12 },
  shAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingLeft: 8 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyIconInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, minHeight: 28 },
  sectionBody: { borderCurve: 'continuous' },
  // Lines up with the card's left edge.
  sectionFooter: { paddingHorizontal: 0, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderCurve: 'continuous', paddingLeft: 16, minHeight: 54 },
  searchInput: { flex: 1, alignSelf: 'stretch', minHeight: 44, paddingVertical: 0, outlineStyle: 'none' } as never,
});

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  small,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** A compact version (the tap area stays 44 tall). */
  small?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[segStyles.wrap, { backgroundColor: t.colors.cell, borderColor: t.pop.ink }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
            hitSlop={small ? { top: 8, bottom: 8 } : { top: 5, bottom: 5 }}
            style={[segStyles.item, small && segStyles.itemSmall, selected && { backgroundColor: t.pop.sunshine, borderColor: t.pop.ink, borderWidth: t.stroke.thin }]}
          >
            <Text style={[t.type.footnote, { color: selected ? t.colors.label : t.colors.secondaryLabel, fontFamily: selected ? t.fonts.black : t.fonts.bold, fontSize: small ? 13 : 14 }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 2, borderCurve: 'continuous' },
  // 34 + 2 × 3 padding + 2 × 2 border = 44 tall.
  itemSmall: { minHeight: 34, minWidth: 48, paddingHorizontal: 10 },
  // 38 + the 3pt padding above and below = 44 to tap.
  item: { minHeight: 38, minWidth: 60, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
