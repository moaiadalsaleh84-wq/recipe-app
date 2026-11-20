import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { pop } from '../theme';

const COLORS = [pop.tomato, pop.sky, pop.berry, pop.leaf, pop.lilac, pop.sunshine];

/** Cheap hash-based pseudo-random in [0, 1). */
function rand(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Longest the shower lasts; then it's removed. */
const MAX_MS = 1800;

/**
 * A one-shot confetti shower: it starts below the status bar, ignores touches, lasts at most
 * 1.8 seconds and then unmounts. Nothing with Reduce Motion on.
 */
export function ConfettiBurst({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [over, setOver] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOver(true), MAX_MS);
    return () => clearTimeout(id);
  }, []);
  // Scattered but deterministic layout (render must stay pure).
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(i * 7 + k);
        return {
          x: r(1) * width,
          drift: (r(2) - 0.5) * 120,
          delay: r(3) * 250,
          spin: (r(4) > 0.5 ? 1 : -1) * (360 + r(5) * 540),
          w: 7 + r(6) * 5,
          h: 10 + r(7) * 8,
          color: COLORS[i % COLORS.length],
          // delay + duration stays under 1.8 seconds.
          duration: 1100 + r(8) * 400,
        };
      }),
    [count, width],
  );
  if (reduceMotion || over) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: insets.top, overflow: 'hidden' }]}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height - insets.top + 30} />
      ))}
    </View>
  );
}

function Piece({ x, drift, delay, spin, w, h, color, duration, fall }: { x: number; drift: number; delay: number; spin: number; w: number; h: number; color: string; duration: number; fall: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration, easing: Easing.in(Easing.quad) })));
  }, [p, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: p.get() < 0.9 ? 1 : (1 - p.get()) * 10,
    transform: [{ translateX: x + drift * p.get() }, { translateY: -30 + fall * p.get() }, { rotate: `${spin * p.get()}deg` }],
  }));
  return <Animated.View style={[styles.piece, { width: w, height: h, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
});
