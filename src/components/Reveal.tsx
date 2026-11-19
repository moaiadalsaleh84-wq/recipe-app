import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * A section that glides up into place when the screen opens. Give each section its order (0, 1,
 * 2…) so they arrive one after another. Reanimated skips this when Reduce Motion is on.
 */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(460).delay(Math.min(index, 10) * 70).springify().damping(18).stiffness(140)} style={style}>
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
    if (active && !was.current && !reduceMotion) scale.set(withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 320, mass: 0.6 })));
    was.current = active;
  }, [active, reduceMotion, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, pop]}>{children}</Animated.View>;
}
