import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../lib/haptics';
import { useTheme } from '../theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** The top surface. */
  face: string;
  /** The darker edge underneath. */
  lip: string;
  /** A soft outline around the face (for white buttons on a light page). */
  border?: string;
  /** How thick the lip is, and how far the face travels when pressed. */
  depth?: number;
  radius?: number;
  /** Layout of the whole button (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the face (padding, row, height). */
  faceStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind | null;
};

/**
 * A thick button that physically presses: the face sits on a darker lip, sinks onto it while
 * your finger is down, and springs back up with a tiny bounce when you let go.
 * With Reduce Motion on, the face moves without the spring.
 */
export function Chunky({ children, face, lip, border, depth, radius, style, faceStyle, haptic = 'tap', disabled, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const d = depth ?? t.depth.button;
  const r = radius ?? t.radius.md;
  const down = useSharedValue(0);
  const faceMove = useAnimatedStyle(() => ({ transform: [{ translateY: down.get() * d }] }));

  return (
    <Pressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        down.set(reduceMotion ? 1 : withSpring(1, t.motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.set(reduceMotion ? 0 : withSpring(0, t.motion.release));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[{ paddingBottom: d }, style, disabled && { opacity: 0.45 }]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: d, backgroundColor: lip, borderRadius: r, borderCurve: 'continuous' }]} />
      <Animated.View
        style={[
          { backgroundColor: face, borderRadius: r, borderCurve: 'continuous', flexGrow: 1 },
          border ? { borderWidth: 2, borderColor: border } : null,
          faceStyle,
          faceMove,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
