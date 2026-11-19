import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../lib/haptics';
import { useTheme } from '../theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** The button's color. */
  face: string;
  /** Older prop (buttons used to sit on a darker lip). Unused: kept so callers don't change. */
  lip?: string;
  /** A subtle outline, for white buttons on a light page. */
  border?: string;
  /** Older prop. Unused. */
  depth?: number;
  radius?: number;
  /** Layout of the whole button (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the button (padding, row, height). */
  faceStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind | null;
};

/**
 * The app's pressable surface: a flat pill (or rounded shape) that shrinks a little while your
 * finger is down and springs back when you let go. Filled buttons cast a soft shadow in their own
 * color; white ones get a subtle outline and a soft grey shadow.
 * With Reduce Motion on, it only dims instead of shrinking.
 */
export function Chunky({ children, face, border, radius, style, faceStyle, haptic = 'tap', disabled, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const r = radius ?? t.radius.pill;
  const down = useSharedValue(0);
  // Scale is worked out from a plain number on the UI thread (no helper functions in here).
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - down.get() * 0.035 }],
    opacity: reduceMotion ? 1 - down.get() * 0.25 : 1,
  }));
  const lifted: ViewStyle = border
    ? { borderWidth: 1, borderColor: border, ...t.chunky.lip }
    : t.isDark
      ? {}
      : { shadowColor: face, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 };

  return (
    <Pressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        down.set(withSpring(1, t.motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.set(withSpring(0, t.motion.release));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, disabled && { opacity: 0.45 }]}
    >
      <Animated.View style={[{ backgroundColor: face, borderRadius: r, borderCurve: 'continuous' }, lifted, faceStyle, pressStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
