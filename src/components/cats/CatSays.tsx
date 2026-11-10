import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { PressableScale } from '../PressableScale';
import { CatBuddy } from './CatBuddy';
import type { Line } from './dialogue';
import type { BuddyId } from './types';

type Props = {
  buddy: BuddyId;
  line: Line;
  /** Called when the speech bubble is tapped (e.g. to show the next line). */
  onNext?: () => void;
  size?: number;
  layout?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
  /** Shown under the text, e.g. "Tap for another tip". */
  hint?: string;
  onPet?: () => void;
  /** Bubble only, when the cat is already shown elsewhere on screen. */
  hideCat?: boolean;
};

/**
 * A cat with a speech bubble. Text types out letter by letter while the cat's
 * mouth moves, and the cat acts out the line's mood.
 */
export function CatSays({ buddy, line, onNext, size = 110, layout = 'row', style, hint, onPet, hideCat }: Props) {
  const t = useTheme();
  // Progress is stored with the text it belongs to, so a new line starts from zero without resetting state in an effect.
  const [typed, setTyped] = useState({ text: line.text, n: 0 });
  const shown = typed.text === line.text ? typed.n : 0;
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const done = shown >= line.text.length;

  useEffect(() => {
    const text = line.text;
    timer.current = setInterval(() => {
      setTyped((prev) => {
        const n = prev.text === text ? prev.n : 0;
        if (n >= text.length) {
          clearInterval(timer.current);
          return prev;
        }
        return { text, n: n + 2 };
      });
    }, 28);
    return () => clearInterval(timer.current);
  }, [line.text]);

  const bubble = (
    <PressableScale
      onPress={() => {
        if (!done) {
          setTyped({ text: line.text, n: line.text.length });
          haptics.select();
        } else onNext?.();
      }}
      haptic={null}
      scaleTo={0.98}
      accessibilityRole={onNext ? 'button' : 'text'}
      accessibilityLabel={line.text}
      accessibilityHint={onNext ? hint ?? 'Shows another line' : undefined}
      style={[
        styles.bubble,
        layout === 'row' ? styles.bubbleRow : styles.bubbleColumn,
        { backgroundColor: t.colors.cell, borderColor: t.colors.border, ...t.chunky.lip },
      ]}
    >
      {/* tail */}
      {!hideCat && <View
        style={[
          layout === 'row' ? styles.tailLeft : styles.tailBottom,
          { backgroundColor: t.colors.cell, borderColor: t.colors.border },
        ]}
      />}
      <Text style={[t.type.callout, { color: t.colors.label }]} testID="cat-line">
        {line.text.slice(0, shown)}
        <Text style={{ color: 'transparent' }}>{line.text.slice(shown)}</Text>
      </Text>
      {hint && onNext && (
        <Animated.Text entering={FadeIn.delay(300)} style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 6, fontWeight: '600' }]}>
          {hint}
        </Animated.Text>
      )}
    </PressableScale>
  );

  return (
    <View style={[layout === 'row' ? styles.row : styles.column, style]}>
      {layout === 'column' && <Animated.View key={line.text} entering={FadeIn.duration(180)}>{bubble}</Animated.View>}
      {!hideCat && <CatBuddy buddy={buddy} mood={line.mood} talking={!done} size={size} onPet={onPet} playKey={line.text} />}
      {layout === 'row' && <Animated.View key={line.text} entering={FadeIn.duration(180)} style={{ flex: 1 }}>{bubble}</Animated.View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  column: { alignItems: 'center', gap: 6 },
  bubble: { borderWidth: 2, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  bubbleRow: {},
  bubbleColumn: { maxWidth: 320 },
  tailLeft: { position: 'absolute', left: -8, top: '50%', marginTop: -7, width: 14, height: 14, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  tailBottom: { position: 'absolute', bottom: -8, left: '50%', marginLeft: -7, width: 14, height: 14, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
});
