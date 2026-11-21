import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { PressableScale } from '../PressableScale';
import { Mascot, MASCOT_ON } from './Mascot';
import type { Line } from './lines';

type Props = {
  line: Line;
  /** Called when the speech bubble is tapped (e.g. to show the next line). */
  onNext?: () => void;
  size?: number;
  layout?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
  /** Shown under the text, e.g. "Tap for another tip". */
  hint?: string;
  onPet?: () => void;
  /** Bubble only, when Biscuit is already shown elsewhere on screen. */
  hideCat?: boolean;
};

/**
 * Biscuit with a speech bubble. Text types out letter by letter while Biscuit's
 * mouth moves, and Biscuit acts out the line's mood.
 */
export function MascotSays(props: Props) {
  // While the mascot is off, his lines are not shown either (screens stay clean without him).
  if (!MASCOT_ON) return null;
  return <Says {...props} />;
}

function Says({ line, onNext, size = 110, layout = 'row', style, hint, onPet, hideCat }: Props) {
  const t = useTheme();
  // A line can have a longer version (a tip). It opens on tap, and belongs to that line only.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const expanded = !!line.more && openFor === line.text;
  const said = expanded ? line.more! : line.text;
  const canExpand = !!line.more && !expanded;
  // Progress is stored with the text it belongs to, so a new line starts from zero without resetting state in an effect.
  const [typed, setTyped] = useState({ text: said, n: 0 });
  const shown = typed.text === said ? typed.n : 0;
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const done = shown >= said.length;

  useEffect(() => {
    const text = said;
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
  }, [said]);

  const bubble = (
    <PressableScale
      onPress={() => {
        if (!done) {
          setTyped({ text: said, n: said.length });
          haptics.select();
        } else if (canExpand) {
          setOpenFor(line.text);
          haptics.select();
        } else onNext?.();
      }}
      haptic={null}
      scaleTo={0.98}
      accessibilityRole={onNext || canExpand ? 'button' : 'text'}
      accessibilityLabel={said}
      accessibilityHint={canExpand ? 'Shows the whole tip' : onNext ? hint ?? 'Shows another line' : undefined}
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
      <Text style={[t.type.callout, t.noWidows.style, { color: t.colors.label }]} {...t.noWidows.props} testID="cat-line">
        {said.slice(0, shown)}
        <Text style={{ color: 'transparent' }}>{said.slice(shown)}</Text>
      </Text>
      {(canExpand || (hint && onNext)) && done && (
        <Animated.Text entering={FadeIn.duration(200)} style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 4, fontWeight: '600' }]}>
          {canExpand ? 'Tap to read the tip' : hint}
        </Animated.Text>
      )}
    </PressableScale>
  );

  return (
    <View style={[layout === 'row' ? styles.row : styles.column, style]}>
      {layout === 'column' && <Animated.View key={line.text} entering={FadeIn.duration(180)}>{bubble}</Animated.View>}
      {!hideCat && <Mascot mood={line.mood} talking={!done} size={size} onPet={onPet} playKey={line.text} />}
      {/* The bubble hugs its words, and sits a little low so the pointer meets Biscuit's mouth. */}
      {layout === 'row' && (
        <Animated.View key={line.text} entering={FadeIn.duration(180)} style={{ flexShrink: 1, marginTop: hideCat ? 0 : Math.round(size * 0.12) }}>
          {bubble}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  column: { alignItems: 'center', gap: 6 },
  bubble: { borderWidth: 2, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  bubbleRow: {},
  bubbleColumn: { maxWidth: 320 },
  tailLeft: { position: 'absolute', left: -8, top: '50%', marginTop: -7, width: 14, height: 14, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  tailBottom: { position: 'absolute', bottom: -8, left: '50%', marginLeft: -7, width: 14, height: 14, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
});
