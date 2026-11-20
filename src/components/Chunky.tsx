import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../lib/haptics';
import { depth as DEPTH, pop, radius as RADIUS, stroke } from '../theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** The button's color. */
  face: string;
  /** Older prop. The shadow is always ink now. */
  lip?: string;
  /** Older prop. Every Pop button has an ink outline. */
  border?: string;
  /** How far the solid ink shadow sits below (default 4). */
  depth?: number;
  radius?: number;
  /** Layout of the whole button (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the button (padding, row, height). */
  faceStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind | null;
};

/**
 * The app's pressable surface (the engine behind PopButton-style controls): a colored face with a
 * thick ink outline on a solid ink shadow. While pressed, the face moves down onto the shadow.
 */
export function Chunky({ children, face, radius, depth = DEPTH.button, style, faceStyle, haptic = 'tap', disabled, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const r = radius ?? RADIUS.md;
  const down = useSharedValue(0);
  // Only plain numbers in here: this runs on the UI thread.
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * depth }] }));
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, { duration: to ? 60 : 110 }));

  return (
    <Pressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        press(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press(0);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[{ paddingBottom: depth }, style]}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: depth, borderRadius: r, backgroundColor: pop.ink, borderCurve: 'continuous' }} />
      <Animated.View style={[{ backgroundColor: disabled ? pop.lilacTint : face, borderRadius: r, borderWidth: stroke.thick, borderColor: pop.ink, borderCurve: 'continuous' }, faceStyle, move]}>{children}</Animated.View>
    </Pressable>
  );
}
