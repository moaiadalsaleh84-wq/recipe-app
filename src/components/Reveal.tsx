import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { enter, popSpring } from '../motion';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * A section that fades in and rises 12pt when the screen first opens (not on re-renders or when you
 * come back to a tab: entering animations run once, on mount). Give each section its order (0, 1,
 * 2…): 40ms apart, at most 8 staggered. With Reduce Motion: a short fade.
 */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={enter(index, reduceMotion)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Bounces its child once each time `active` turns on (a selected day, a finished item). */
export function Pop({ active, children, style }: { active: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current && !reduceMotion) scale.set(withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, popSpring)));
    was.current = active;
  }, [active, reduceMotion, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, pop]}>{children}</Animated.View>;
}
