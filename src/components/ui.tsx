/**
 * Small building blocks shared across screens.
 * All tappable pieces are at least 44pt and give press + haptic feedback.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { noWidow, num } from '../lib/text';
import { EASE_CUBIC, duration as motionDuration } from '../motion';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../lib/haptics';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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
  onLongPress,
  onPressOut,
}: {
  haptic?: HapticKind | null;
  /** Held down (after 350 ms). */
  onLongPress?: () => void;
  onPressOut?: () => void;
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
      onLongPress={onLongPress}
      delayLongPress={350}
      onPressOut={onPressOut}
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

/* ---------- Rolling number ---------- */

/**
 * A number that rolls when it changes: going up, the new value slides in from just below; going
 * down, from just above (10pt, 200 ms, ease-out, with a quick fade). Reduce Motion: it just changes.
 */
export function RollingNumber({ value, style, format = num, testID }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string; testID?: string }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  const fade = useSharedValue(1);
  // Which way it last changed, noted during render (React's "previous value" pattern) and
  // animated in the effect below.
  const [roll, setRoll] = useState({ prev: value, dir: 0, n: 0 });
  if (value !== roll.prev) setRoll({ prev: value, dir: value > roll.prev ? 1 : -1, n: roll.n + 1 });
  useEffect(() => {
    if (!roll.dir || reduceMotion) return;
    const move = { duration: 200, easing: Easing.out(Easing.cubic) };
    y.set(withSequence(withTiming(roll.dir * 10, { duration: 0 }), withTiming(0, move)));
    fade.set(withSequence(withTiming(0.2, { duration: 0 }), withTiming(1, move)));
  }, [roll, reduceMotion, y, fade]);
  const rollStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: y.get() }] }));
  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={rollStyle}>
        <Text style={style} testID={testID}>
          {format(value)}
        </Text>
      </Animated.View>
    </View>
  );
}

/* ---------- Odometer (the streak) ---------- */

/**
 * A number on odometer wheels: each digit rolls up to its value (600 ms, ease-out, no overshoot)
 * when it first shows and whenever it changes; 9 → 10 rolls the last wheel forward through to 0.
 * Reduce Motion: the digits just show.
 */
export function Odometer({ value, style, testID }: { value: number; style?: StyleProp<TextStyle>; testID?: string }) {
  const flat: TextStyle = StyleSheet.flatten([{ fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] }, style]) ?? {};
  const lh = flat.lineHeight ?? Math.round((flat.fontSize ?? 17) * 1.25);
  const digits = String(Math.max(0, Math.round(value))).split('').map(Number);
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel={String(value)} testID={testID}>
      {digits.map((d, i) => (
        // Keyed by place (ones, tens…), so each wheel keeps its own position.
        <OdometerWheel key={digits.length - i} digit={d} lineHeight={lh} style={flat} />
      ))}
    </View>
  );
}

const WHEEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function OdometerWheel({ digit, lineHeight, style }: { digit: number; lineHeight: number; style: TextStyle }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(reduceMotion ? -digit * lineHeight : 0);
  const prev = useRef(reduceMotion ? digit : 0);
  useEffect(() => {
    const from = prev.current;
    prev.current = digit;
    if (reduceMotion) {
      y.set(-digit * lineHeight);
      return;
    }
    // Always roll forward: a smaller digit (9 → 0) rolls on into the second set of 0–9, then snaps back.
    const target = digit < from ? digit + 10 : digit;
    y.set(
      withTiming(-target * lineHeight, { duration: 600, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done && target !== digit) y.set(-digit * lineHeight);
      }),
    );
  }, [digit, lineHeight, reduceMotion, y]);
  const wheel = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={wheel}>
        {WHEEL.map((n, i) => (
          <Text key={i} style={[style, { height: lineHeight, lineHeight }]}>
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/* ---------- Stepper (servings, goals) ---------- */

/**
 * "− 300 +": tap to change by one step; hold + or − to keep going (faster the longer you hold).
 * With `editable`, tap the number (or set `editing` from outside) to type a value; it's kept within
 * min…max. The number rolls when it changes.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 24,
  step = 1,
  label,
  editable,
  editing: editingProp,
  onEditingChange,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** Amount per tap. */
  step?: number;
  /** Tap the number to type a value. */
  editable?: boolean;
  /** Typing mode, controlled from outside (e.g. an "Edit" button next to it). */
  editing?: boolean;
  onEditingChange?: (on: boolean) => void;
}) {
  const t = useTheme();
  const [editingOwn, setEditingOwn] = useState(false);
  const editing = editingProp ?? editingOwn;
  const setEditing = (on: boolean) => {
    setEditingOwn(on);
    onEditingChange?.(on);
  };
  // What's typed so far (null: nothing yet, the field starts with the current value).
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const n = parseInt((draft ?? String(value)).replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
    setEditing(false);
  };

  // Hold to repeat: the latest value and onChange, read by the timer between renders.
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopRepeat = () => clearTimeout(timer.current);
  const startRepeat = (dir: 1 | -1) => {
    let ticks = 0;
    const tick = () => {
      const { value: v, onChange: change } = latest.current;
      const next = Math.min(max, Math.max(min, v + dir * step));
      if (next === v) return;
      change(next);
      haptics.select();
      ticks += 1;
      timer.current = setTimeout(tick, ticks < 5 ? 150 : ticks < 15 ? 90 : 50);
    };
    tick();
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    // Outline only, like a text input: it is a control you adjust, not a button to press.
    <View
      style={[styles.stepper, { backgroundColor: t.colors.cell, ...t.chunky.card, borderRadius: t.radius.pill }]}
      accessible={!editing}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: num(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(Math.min(max, value + step));
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(Math.max(min, value - step));
      }}
    >
      <IconButton
        icon="minus"
        haptic="select"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min || editing}
        onPress={() => onChange(Math.max(min, value - step))}
        onLongPress={() => startRepeat(-1)}
        onPressOut={stopRepeat}
        color={t.colors.label}
      />
      {editing ? (
        <TextInput
          value={draft ?? String(value)}
          onChangeText={(v) => setDraft(v.replace(/[^0-9]/g, ''))}
          onSubmitEditing={commit}
          onBlur={commit}
          autoFocus
          selectTextOnFocus
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={5}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`Type your ${label}`}
          style={[t.type.headline, styles.stepperValue, styles.stepperInput, { color: t.colors.label, borderColor: t.pop.sky }]}
          testID="stepper-input"
        />
      ) : editable ? (
        <Pressable
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          accessibilityLabel={`${num(value)}. Tap to type your ${label}`}
          hitSlop={8}
        >
          <RollingNumber value={value} style={[t.type.headline, styles.stepperValue, { color: t.colors.label }]} testID="stepper-value" />
        </Pressable>
      ) : (
        <RollingNumber value={value} style={[t.type.headline, styles.stepperValue, { color: t.colors.label }]} testID="stepper-value" />
      )}
      <IconButton
        icon="plus"
        haptic="select"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max || editing}
        onPress={() => onChange(Math.min(max, value + step))}
        onLongPress={() => startRepeat(1)}
        onPressOut={stopRepeat}
        color={t.colors.label}
      />
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
    <View style={[styles.check, { borderColor: checked ? color : '#CFCBDA', backgroundColor: t.colors.cell }]}>
      <Animated.View style={[styles.checkFill, { backgroundColor: color }, fillStyle]}>{checked && <DrawnCheck size={16} color={checkColor} delay={60} />}</Animated.View>
    </View>
  );
}

/* ---------- Progress bar: fills smoothly ---------- */

export function ProgressBar({ value, color, track, height = 8, label }: { /** 0 to 1 */ value: number; color?: string; track?: string; height?: number; label?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  // Bars are 12 high everywhere (callers asking for more get 12 too, except a deliberate thin one).
  const bar = Math.min(height, 12);
  const shown = useSharedValue(0);
  const trackW = useSharedValue(0);
  // After the fill lands, a soft shine sweeps across it once (0 → 1). Not with Reduce Motion.
  const shine = useSharedValue(0);
  useEffect(() => {
    // Fills smoothly over 500 ms (ease-out cubic), no bounce past the value.
    shown.set(reduceMotion ? withTiming(pct, { duration: 200 }) : withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) }));
    if (!reduceMotion && pct > 0) shine.set(withSequence(withTiming(0, { duration: 0 }), withDelay(450, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }))));
  }, [pct, reduceMotion, shown, shine]);
  // Empty means empty: no fill at all at 0. Above 0 the fill is at least as wide as it is tall (a round end, not a sliver).
  const fill = useAnimatedStyle(() => {
    const v = shown.get();
    if (v <= 0.001) return { width: 0, opacity: 0 };
    return { width: Math.min(trackW.get(), Math.max(bar, v * trackW.get())), opacity: 1 };
  });
  // The shine: a slanted light band crossing the fill from left to right.
  const shineStyle = useAnimatedStyle(() => {
    const w = Math.max(bar, shown.get() * trackW.get());
    const p = shine.get();
    return { opacity: p > 0 && p < 1 ? 1 : 0, transform: [{ translateX: -SHINE_W + p * (w + SHINE_W * 2) }, { skewX: '-20deg' }] };
  });
  return (
    <View
      onLayout={(e) => trackW.set(e.nativeEvent.layout.width)}
      // Flat: a light track (#EDEBF3), the colored fill, no outline.
      style={{ height: bar, borderRadius: bar / 2, backgroundColor: track ?? t.colors.track, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <Animated.View style={[{ height: bar, borderRadius: bar / 2, backgroundColor: color ?? t.colors.success, overflow: 'hidden' }, fill]}>
        {!reduceMotion && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -2, bottom: -2, left: 0, width: SHINE_W, backgroundColor: 'rgba(255,255,255,0.5)' }, shineStyle]} />}
      </Animated.View>
    </View>
  );
}
/** Width of the progress bar's shine band. */
const SHINE_W = 18;

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
        <View style={[styles.emptyIcon, { backgroundColor: t.colors.tintSoft }]}>
          <Icon name={icon} size={36} color={t.colors.tint} weight="semibold" />
        </View>
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

export function SearchField({ value, onChangeText, placeholder, style, onFocus, onBlur, ...rest }: TextInputProps & { value: string; onChangeText: (s: string) => void }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    // 48 high, a soft fill and no border; a 2px sky border while you type.
    <View style={[styles.search, { backgroundColor: t.colors.fill, borderRadius: t.radius.md, borderColor: focused ? t.pop.sky : 'transparent' }, style]}>
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
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
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
  textButtonLabel: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, flexShrink: 1 },
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
  stepperInput: { minWidth: 64, paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 2 },
  // Rounded squares: the tick pops in on a basil fill.
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  checkFill: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  print: { borderRadius: 18, borderWidth: 1, padding: 5, paddingBottom: 14, borderCurve: 'continuous' },
  printPhoto: { flex: 1, borderRadius: 13 },
  center: { alignItems: 'center', justifyContent: 'center' },
  // 32 above every section, 12 between its title and its content. (Buttons on the right bring their own 44pt height.)
  sh: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 32, marginBottom: 12 },
  shAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingLeft: 8 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyIconInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, minHeight: 28 },
  sectionBody: { borderCurve: 'continuous' },
  // Lines up with the card's left edge.
  sectionFooter: { paddingHorizontal: 0, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderCurve: 'continuous', paddingLeft: 14, minHeight: 48, borderWidth: 2 },
  searchInput: { flex: 1, alignSelf: 'stretch', minHeight: 44, paddingVertical: 0, outlineStyle: 'none' } as never,
});

/* ---------- Segmented control ---------- */

/** The time, callable from gestures (UI thread) and handlers alike. */
function clock() {
  'worklet';
  return Date.now();
}

/** How the Segmented thumb moves to its new spot (no bounce). */
const SEG_MOVE = { duration: 200, easing: EASE_CUBIC };

/**
 * Two or three options in a pill ("Metric | US"). Tap an option, or slide the yellow thumb across
 * with your finger: it follows the finger and settles on the nearest option when you let go.
 */
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
  const reduceMotion = useReducedMotion();
  // Where each option sits, so the thumb can slide between them.
  const [slots, setSlots] = useState<({ x: number; y: number; w: number; h: number } | undefined)[]>([]);
  const measured = options.every((_, i) => !!slots[i]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const xs = useSharedValue<number[]>([]);
  const ws = useSharedValue<number[]>([]);
  const thumbX = useSharedValue(0);
  const thumbW = useSharedValue(0);
  const from = useSharedValue(0);
  // When a slide ended: the finger lifting right after isn't also a tap on the option under it.
  const slidAt = useSharedValue(0);

  useEffect(() => {
    if (!measured) return;
    const all = slots.slice(0, options.length) as { x: number; w: number }[];
    xs.set(all.map((s) => s.x));
    ws.set(all.map((s) => s.w));
    const s = all[index];
    // The first time it jumps straight there; after that it slides.
    const jump = thumbW.get() === 0 || reduceMotion;
    thumbX.set(jump ? s.x : withTiming(s.x, SEG_MOVE));
    thumbW.set(jump ? s.w : withTiming(s.w, SEG_MOVE));
  }, [measured, slots, index, options.length, reduceMotion, xs, ws, thumbX, thumbW]);

  const pick = (i: number) => {
    const o = options[i];
    if (o && o.value !== value) {
      haptics.select();
      onChange(o.value);
    }
  };
  // Sideways drags only, so the page still scrolls up and down.
  const slide = Gesture.Pan()
    .enabled(measured)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(() => {
      from.set(thumbX.get());
      slidAt.set(clock() + 60000);
    })
    .onChange((e) => {
      const x = xs.get();
      const w = ws.get();
      const max = x[x.length - 1] + w[w.length - 1] - thumbW.get();
      thumbX.set(Math.min(max, Math.max(x[0], from.get() + e.translationX)));
    })
    .onEnd(() => {
      const x = xs.get();
      const w = ws.get();
      const mid = thumbX.get() + thumbW.get() / 2;
      let best = 0;
      for (let i = 1; i < x.length; i++) if (Math.abs(x[i] + w[i] / 2 - mid) < Math.abs(x[best] + w[best] / 2 - mid)) best = i;
      thumbX.set(withTiming(x[best], SEG_MOVE));
      thumbW.set(withTiming(w[best], SEG_MOVE));
      scheduleOnRN(pick, best);
    })
    .onFinalize(() => {
      if (slidAt.get() > clock()) slidAt.set(clock());
    });
  const thumbStyle = useAnimatedStyle(() => ({ width: thumbW.get(), transform: [{ translateX: thumbX.get() }] }));
  const first = slots[0];

  return (
    <GestureDetector gesture={slide}>
      <View style={[segStyles.wrap, { backgroundColor: t.colors.fill, borderColor: t.colors.border }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {/* The thumb and the options share this inner box, so the thumb lines up exactly with the
            option it sits behind (measured and placed from the same corner). */}
        <View style={segStyles.track}>
        {measured && first && (
          <Animated.View
            pointerEvents="none"
            style={[segStyles.thumb, { top: first.y, height: first.h, backgroundColor: t.pop.sunshine, borderColor: t.pop.sunshine, borderBottomColor: t.edge(t.pop.sunshine), borderWidth: 2 }, thumbStyle]}
          />
        )}
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <PressableScale
              key={o.value}
              onPress={() => {
                if (clock() - slidAt.get() < 350) return;
                onChange(o.value);
              }}
              haptic="select"
              scaleTo={0.95}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityLabel={o.label}
              hitSlop={small ? { top: 8, bottom: 8 } : { top: 5, bottom: 5 }}
              onLayout={(e) => {
                const { x, y, width: w, height: h } = e.nativeEvent.layout;
                setSlots((prev) => {
                  const p = prev[i];
                  if (p && p.x === x && p.y === y && p.w === w && p.h === h) return prev;
                  const next = [...prev];
                  next[i] = { x, y, w, h };
                  return next;
                });
              }}
              // Until the thumb is ready, the chosen option draws its own yellow pill.
              style={[segStyles.item, small && segStyles.itemSmall, { borderWidth: t.stroke.thin, borderColor: 'transparent' }, selected && !measured && { backgroundColor: t.pop.sunshine, borderColor: t.pop.sunshine }]}
            >
              <Text style={[t.type.footnote, { color: selected ? t.colors.label : t.colors.secondaryLabel, fontFamily: selected ? t.fonts.black : t.fonts.bold, fontSize: small ? 13 : 14 }]}>{o.label}</Text>
            </PressableScale>
          );
        })}
        </View>
      </View>
    </GestureDetector>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 999, padding: 3, borderWidth: 2, borderCurve: 'continuous' },
  track: { flexDirection: 'row' },
  // The yellow pill behind the chosen option (slides; childless, so animating its width is cheap).
  thumb: { position: 'absolute', left: 0, borderRadius: 999, borderCurve: 'continuous' },
  // 34 + 2 × 3 padding + 2 × 2 border = 44 tall.
  itemSmall: { minHeight: 34, minWidth: 48, paddingHorizontal: 10 },
  // 38 + the 3pt padding above and below = 44 to tap.
  item: { minHeight: 38, minWidth: 60, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
