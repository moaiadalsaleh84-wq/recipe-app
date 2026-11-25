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
 * The base for every tappable element without its own shadow (rows, tiles, small buttons): while
 * your finger is down it settles slightly smaller (to `scaleTo`, 0.97 by default) and dims a
 * little, 120 ms in / 160 ms out, ease-out cubic, never past its size (no bounce). A haptic tap,
 * and a dimmed state while disabled. Buttons and cards with a shadow press down onto it instead
 * (Chunky, PopButton, PopCard). With Reduce Motion it only dims.
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
  // A smaller scaleTo means a stronger press: a little more dimming for those too.
  const dim = Math.min(0.3, Math.max(0.12, (1 - scaleTo) * 4));
  const shrink = reduceMotion ? 0 : 1 - scaleTo;
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
