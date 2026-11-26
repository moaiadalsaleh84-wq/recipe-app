import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { EASE_CUBIC, enter } from '../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/**
 * A section that fades in and rises 12pt when the screen first opens (not on re-renders or when you
 * come back to a tab: entering animations run once, on mount). Give each section its order (0, 1,
 * 2…): 40 ms apart, at most 6 staggered. With Reduce Motion: a short fade.
 */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={enter(index, reduceMotion)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Marks a change on its child (a selected day, a finished item) with a soft fade back to full
 * strength: 0.6 → 1 opacity in 200 ms. No scaling, no bounce.
 */
export function Pop({ active, children, style }: { active: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current && !reduceMotion) glow.set(withSequence(withTiming(0.6, { duration: 0 }), withTiming(1, { duration: 200, easing: EASE_CUBIC })));
    was.current = active;
  }, [active, reduceMotion, glow]);
  const fade = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return <Animated.View style={[style, fade]}>{children}</Animated.View>;
}
