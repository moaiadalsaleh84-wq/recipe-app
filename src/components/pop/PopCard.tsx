import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { EASE_CUBIC, pressOut } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { pop, radius as RADIUS } from '../../theme';

type Props = {
  children: ReactNode;
  /** Background: white (default) or a tint. */
  color?: string;
  /** Corner radius (default 16). */
  radius?: number;
  /** Older prop: cards are flat now, so it does nothing. */
  depth?: number;
  /** Layout of the whole card (margins, width, flex). */
  style?: StyleProp<ViewStyle>;
  /** Layout inside the card (padding, gap, row). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Makes the whole card a button that presses down like PopButton. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: HapticKind | null;
  testID?: string;
  /** Clip children to the rounded corners (default). Turn off for badges that sit on the edge. */
  clip?: boolean;
  /** A selected tile: ink border.  */
  pressed?: boolean;
};

/**
 * A card: white or tinted, flat, a 2px light border (#E7E5EE), radius 16, no shadow. With
 * `onPress` the whole card is a button: while pressed it dims slightly and settles to 98% (100 ms
 * in, 160 ms out, no bounce). `pressed` (a selected tile) gets the ink border: ink marks selection.
 */
export function PopCard({ children, color = pop.white, radius = RADIUS.lg, style, contentStyle, onPress, accessibilityLabel, accessibilityHint, haptic = null, testID, clip = true, pressed = false }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  // Numbers only in here: this runs on the UI thread.
  const feel = useAnimatedStyle(() => ({ opacity: 1 - down.get() * 0.12, transform: [{ scale: reduceMotion ? 1 : 1 - down.get() * 0.02 }] }));
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, to ? { duration: 100, easing: EASE_CUBIC } : pressOut));
  // Every card is radius 16 (older callers asking for 20–24 get 16 too).
  const r = Math.min(radius, RADIUS.lg);
  const face = [styles.face, { backgroundColor: color, borderRadius: r, overflow: clip ? ('hidden' as const) : ('visible' as const) }, pressed && styles.selected, contentStyle];

  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        <View style={face}>{children}</View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      aria-selected={pressed || undefined}
      testID={testID}
      onPressIn={() => press(1)}
      onPressOut={() => press(0)}
      onPress={() => {
        if (haptic) haptics[haptic]();
        onPress();
      }}
      style={style}
    >
      <Animated.View style={[face, feel]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { borderWidth: 2, borderColor: pop.line, borderCurve: 'continuous' },
  selected: { borderColor: pop.ink },
});
