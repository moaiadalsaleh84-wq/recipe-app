import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

/** Segmented progress bar, like story indicators. */
export function ProgressSegments({ total, done, color = colors.white }: { total: number; done: number; color?: string }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i < done ? color : colors.overlayLight }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xxs + 2 },
  seg: { flex: 1, height: 5, borderRadius: radius.pill },
});
