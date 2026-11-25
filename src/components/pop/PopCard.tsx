import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { pressIn, pressOut } from '../../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics, type HapticKind } from '../../lib/haptics';
import { depth as DEPTH, pop, stroke } from '../../theme';

type Props = {
  children: ReactNode;
  /** Background: white (default) or a tint. */
  color?: string;
  /** Corner radius (default 24). */
  radius?: number;
  /** How far the solid shadow sits below (default 5). */
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
  /** Stays pressed in (a selected tile): no shadow, moved down onto where the shadow was. */
  pressed?: boolean;
};

/**
 * A card: white or tinted, a thick ink outline and a solid ink shadow (a real View). With
 * `onPress` the whole card is a button and presses down onto its shadow.
 */
export function PopCard({ children, color = pop.white, radius = 24, depth = DEPTH.card, style, contentStyle, onPress, accessibilityLabel, accessibilityHint, haptic = null, testID, clip = true, pressed = false }: Props) {
  const reduceMotion = useReducedMotion();
  const down = useSharedValue(0);
  const held = pressed ? 1 : 0;
  // Numbers only in here: this runs on the UI thread.
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(held, down.get()) * depth }] }));
  // Down onto the shadow in 120 ms, back up in 160 ms (ease-out cubic). No bounce.
  const press = (to: number) => down.set(reduceMotion ? to : withTiming(to, to ? pressIn : pressOut));
  const face = [styles.face, { backgroundColor: color, borderRadius: radius, overflow: clip ? ('hidden' as const) : ('visible' as const) }, contentStyle];

  if (!onPress) {
    return (
      <View style={[{ paddingBottom: depth }, style]} testID={testID}>
        <View style={[styles.shadow, { top: depth, borderRadius: radius }]} />
        <View style={face}>{children}</View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPressIn={() => press(1)}
      onPressOut={() => press(0)}
      onPress={() => {
        if (haptic) haptics[haptic]();
        onPress();
      }}
      style={[{ paddingBottom: depth }, style]}
    >
      {!pressed && <View style={[styles.shadow, { top: depth, borderRadius: radius }]} />}
      <Animated.View style={[face, move]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: pop.ink, borderCurve: 'continuous' },
  face: { borderWidth: stroke.thick, borderColor: pop.ink, borderCurve: 'continuous' },
});
