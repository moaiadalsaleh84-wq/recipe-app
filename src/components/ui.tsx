/**
 * Small building blocks shared across screens.
 * All tappable pieces are at least 44pt and give press + haptic feedback.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
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
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { recipes as builtInRecipes, type RecipeImage } from '../data/mock';
import { Mascot, MASCOT_ON } from './mascot/Mascot';
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
  /** Selected chips turn green with a check. */
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
  const reduceMotion = useReducedMotion();
  // A small bounce whenever the chip is switched on.
  const pop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected && !reduceMotion) pop.set(withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, t.motion.pop)));
  }, [selected, reduceMotion, pop, t.motion.pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  // Selected chips turn dark pine ("this is on"), so basil stays reserved for the screen's main action.
  const fg = selected ? (t.isDark ? t.colors.background : '#FFFFFF') : t.colors.label;
  return (
    <Animated.View style={[popStyle, style]}>
    <Chunky
      onPress={onPress}
      haptic="select"
      accessibilityRole={toggle ? 'togglebutton' : 'button'}
      aria-selected={toggle ? selected : undefined}
      accessibilityLabel={accessibilityLabel ?? (toggle ? `${label} filter` : label)}
      hitSlop={{ top: 2, bottom: 2 }}
      radius={t.radius.pill}
      face={selected ? t.colors.label : t.colors.cell}
      border={selected ? t.colors.label : t.colors.border}
      style={style}
      faceStyle={[styles.chip, !selected && styles.chipBordered, style ? styles.chipFill : null]}
    >
      {selected ? <Icon name="check" size={14} color={fg} weight="bold" /> : leading ? leading : icon ? <Icon name={icon} size={15} color={t.colors.tint} weight="bold" /> : null}
      <Text style={[t.type.subhead, { color: fg, fontFamily: t.fonts.bold }]}>{label}</Text>
      {trailing && <Icon name={trailing} size={12} color={selected ? fg : t.colors.secondaryLabel} weight="bold" />}
    </Chunky>
    </Animated.View>
  );
}

/** A round white button for the top right of a screen (share, settings…). */
export function HeaderButton({ icon, onPress, accessibilityLabel, disabled }: { icon: IconName; onPress: () => void; accessibilityLabel: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Chunky onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} radius={22} face={t.colors.cell} border={t.colors.border} faceStyle={styles.headerButton}>
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
  const text = [large ? t.type.button : t.type.subhead, large ? null : { fontFamily: t.fonts.bold }];
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
      border={kind.border}
      radius={t.radius.pill}
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
      style={[styles.stepper, { backgroundColor: t.colors.cell, ...t.chunky.card, borderRadius: t.radius.pill }]}
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
    <Animated.View style={[styles.check, { borderColor: checked ? color : t.colors.fillStrong, backgroundColor: t.colors.cell }, ringStyle]}>
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

/* ---------- Progress ring ---------- */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A ring that fills clockwise with a spring when it appears or changes, with anything in the middle. */
export function Ring({ value, size = 56, stroke = 6, color, track, children, label }: { /** 0 to 1 */ value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const shown = useSharedValue(reduceMotion ? pct : 0);
  useEffect(() => {
    shown.set(reduceMotion ? withTiming(pct, { duration: 200 }) : withSpring(pct, { damping: 16, stiffness: 90, mass: 1 }));
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
export function AnimatedNumber({ value, style, duration = 700 }: { value: number; style?: StyleProp<import('react-native').TextStyle>; duration?: number }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const from = useRef(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion) {
      from.current = value;
      return;
    }
    const start = Date.now();
    const a = from.current;
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion, duration]);
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]} accessibilityLabel={String(value)}>
      {reduceMotion ? value : shown}
    </Text>
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

/* ---------- Photo stack: three real food photos, fanned out (empty states, welcomes) ---------- */

const STACK_DEFAULT = ['pepper-feta-penne', 'masala-dosa', 'chicken-fried-rice'];

/** Three food photos laid like prints on a table: real photography instead of an icon. */
export function PhotoStack({ ids = STACK_DEFAULT, size = 96 }: { ids?: string[]; size?: number }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const photos = ids
    .map((id) => builtInRecipes.find((r) => r.id === id)?.image)
    .filter((img): img is Exclude<RecipeImage, null> => !!img)
    .slice(0, 3);
  // The outer prints settle into place once, with a small spring.
  const spread = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) spread.set(withSpring(1, { damping: 13, stiffness: 140, mass: 0.8 }));
  }, [reduceMotion, spread]);
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: -size * 0.55 * spread.get() }, { rotate: `${-10 * spread.get()}deg` }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: size * 0.55 * spread.get() }, { rotate: `${10 * spread.get()}deg` }] }));
  const print = (img: Exclude<RecipeImage, null>) => (
    <View style={[styles.print, { width: size, height: size * 1.15, backgroundColor: t.colors.cell, borderColor: t.colors.border, ...t.shadow.card }]}>
      <Image source={img} style={styles.printPhoto} contentFit="cover" accessibilityIgnoresInvertColors />
    </View>
  );
  if (photos.length < 3) return null;
  return (
    <View style={{ width: size * 2.3, height: size * 1.3, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, left]}>{print(photos[0])}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, right]}>{print(photos[2])}</Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{print(photos[1])}</View>
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
        {subtitle ? <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>{subtitle}</Text> : null}
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
  cat,
  photos,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  /** Show Biscuit acting out the empty state instead of an icon: pass the mood. */
  cat?: Mood;
  /** Show three food photos (by recipe id) instead of the icon. */
  photos?: string[] | true;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      {cat && MASCOT_ON ? (
        <Mascot mood={cat} size={132} />
      ) : photos ? (
        <View style={{ marginBottom: 12 }}>
          <PhotoStack ids={photos === true ? undefined : photos} />
        </View>
      ) : (
        <View style={[styles.emptyIcon, { backgroundColor: t.colors.cell, borderColor: t.colors.border, ...t.chunky.lip }]}>
          <View style={[styles.emptyIconInner, { backgroundColor: t.colors.tintSoft }]}>
            <Icon name={icon} size={30} color={t.colors.tint} weight="semibold" />
          </View>
        </View>
      )}
      <Text style={[t.type.title2, { color: t.colors.label, textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.type.callout, t.noWidows.style, { color: t.colors.secondaryLabel, textAlign: 'center', maxWidth: 290 }]} {...t.noWidows.props}>
        {noWidow(message)}
      </Text>
      {action && (
        // Its own row, so the button's size never depends on the text above it.
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
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
      {/* Outer view draws the outline + lip; inner view clips rows to the rounded corners. */}
      <View style={[styles.sectionBody, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
        <View style={{ borderRadius: t.layout.cardRadius - 1, overflow: 'hidden', borderCurve: 'continuous' }}>{children}</View>
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
    <View style={[styles.search, { backgroundColor: t.colors.cell, ...t.chunky.card, borderRadius: t.radius.pill }, style]}>
      <Icon name="search" size={18} color={t.colors.label} weight="semibold" />
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
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderCurve: 'continuous', paddingHorizontal: 2 },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18 },
  stepperValue: { minWidth: 36, textAlign: 'center', fontVariant: ['tabular-nums'] },
  // Rounded squares: the tick pops in on a basil fill.
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  checkFill: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  print: { borderRadius: 18, borderWidth: 1, padding: 5, paddingBottom: 14, borderCurve: 'continuous' },
  printPhoto: { flex: 1, borderRadius: 13 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sh: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 32, marginBottom: 14, minHeight: 44 },
  shAction: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingLeft: 8 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyIconInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, minHeight: 28 },
  sectionBody: { borderCurve: 'continuous' },
  sectionFooter: { paddingHorizontal: 16, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, borderCurve: 'continuous', paddingLeft: 18, minHeight: 52 },
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
            <Text style={[t.type.footnote, { color: selected ? t.colors.label : t.colors.secondaryLabel, fontFamily: t.fonts.bold, fontSize: 14 }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 999, padding: 4, borderCurve: 'continuous' },
  item: { minHeight: 40, minWidth: 64, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
