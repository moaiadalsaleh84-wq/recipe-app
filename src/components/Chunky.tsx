import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
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
 * The app's pressable surface (the name is from the old 3D design; it is flat now).
 * While your finger is down it shrinks a touch and dims slightly, and springs back on release.
 * With Reduce Motion on, it only dims.
 */
export function Chunky({ children, face, lip: _lip, border, depth: _depth, radius, style, faceStyle, haptic = 'tap', disabled, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const r = radius ?? t.radius.md;
  const down = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: 1 - down.get() * 0.12,
    transform: [{ scale: reduceMotion ? 1 : 1 - down.get() * 0.025 }],
  }));

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
      style={[style, disabled && { opacity: 0.4 }]}
    >
      <Animated.View
        style={[
          { backgroundColor: face, borderRadius: r, borderCurve: 'continuous' },
          border ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: border } : null,
          faceStyle,
          pressStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
