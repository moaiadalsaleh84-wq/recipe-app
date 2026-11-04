import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
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
 * The base for every tappable element: a spring press-down, a haptic tap,
 * and a dimmed state while disabled.
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        if (!reduceMotion) scale.set(withSpring(scaleTo, motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.press));
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
