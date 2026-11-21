import { useRef } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';

/**
 * A card flip (rotateY) to swap in the next thing: the card turns edge-on, the content changes,
 * and it turns back. With Reduce Motion the content just changes. Ignores taps mid-flip.
 *
 *   const { style, flip } = useFlip();
 *   <Animated.View style={style}>…</Animated.View>
 *   flip(() => setIndex((i) => i + 1));
 */
export function useFlip() {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  const busy = useRef(false);
  // Numbers only in here (UI thread).
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${turn.get()}deg` }] }));
  const flip = (swap: () => void) => {
    if (busy.current) return;
    haptics.select();
    if (reduceMotion) return swap();
    busy.current = true;
    turn.set(withTiming(90, { duration: 160 }));
    setTimeout(() => {
      swap();
      turn.set(-90);
      turn.set(withTiming(0, { duration: 180 }));
      setTimeout(() => {
        busy.current = false;
      }, 190);
    }, 165);
  };
  return { style, flip };
}
