import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { pressIn, pressOut } from '../motion';
import { haptics, type HapticKind } from '../lib/haptics';
import { motion } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
  /** Haptic fired on press. Pass null for none. */
  haptic?: HapticKind | null;
};

/**
 * The base for every tappable element without its own shadow. Feedback starts the moment your
 * finger lands (90 ms in / 160 ms out, ease-out cubic, no bounce):
 * - tiles, cards and small buttons (scaleTo below 0.98) settle slightly smaller and dim a little;
 * - rows (scaleTo 0.98 or more) only dim, like an iOS list row.
 * A haptic tap, and a dimmed state while disabled. Buttons with a 3D edge press down onto it instead
 * (PopButton, PopCard). With Reduce Motion it only dims.
 */
export function PressableScale({
  scaleTo = motion.pressScale,
  haptic = 'tap',
  onPressIn,
  onPressOut,
  onPress,
  style,
  disabled,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  // Rows only dim (no shrinking a full-width row). Elsewhere a smaller scaleTo means a stronger press.
  const row = scaleTo >= 0.98;
  const dim = row ? 0.35 : Math.min(0.3, Math.max(0.12, (1 - scaleTo) * 4));
  const shrink = reduceMotion || row ? 0 : 1 - scaleTo;
  const animatedStyle = useAnimatedStyle(() => ({ opacity: 1 - pressed.get() * dim, transform: [{ scale: 1 - pressed.get() * shrink }] }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        pressed.set(reduceMotion ? 1 : withTiming(1, pressIn));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(reduceMotion ? 0 : withTiming(0, pressOut));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, animatedStyle, disabled && { opacity: 0.4 }]}
    />
  );
}
