import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const PALETTE = [colors.accent, colors.coral, colors.purple, colors.secondarySoft, colors.white, colors.sky];

// Fixed positions (in %) so confetti looks hand-placed rather than random noise.
const SPOTS = [
  { top: 12, left: 10, rot: 20 },
  { top: 22, left: 82, rot: -30 },
  { top: 70, left: 8, rot: 45 },
  { top: 78, left: 86, rot: -15 },
  { top: 45, left: 92, rot: 60 },
  { top: 55, left: 4, rot: -50 },
  { top: 8, left: 60, rot: 10 },
];

/** Decorative confetti flecks, echoing the playful illustrated style. */
export function Confetti({ seed = 0, count = 7 }: { seed?: number; count?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SPOTS.slice(0, count).map((s, i) => (
        <View
          key={i}
          style={[
            styles.fleck,
            {
              top: `${s.top}%`,
              left: `${s.left}%`,
              backgroundColor: PALETTE[(i + seed) % PALETTE.length],
              transform: [{ rotate: `${s.rot}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fleck: { position: 'absolute', width: 8, height: 14, borderRadius: 2, opacity: 0.9 },
});
