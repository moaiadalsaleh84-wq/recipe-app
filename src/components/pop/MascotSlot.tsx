import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import Animated, { FadeIn } from 'react-native-reanimated';
import { fonts, pop, stroke } from '../../theme';

/**
 * Where the Pantry Pop character goes. Until the character is ready, this shows a dashed circle
 * the size of the character. Set to false to show only the speech bubble.
 *
 * To drop the character in: render it in place of the dashed circle in `MascotSlot` below. Every
 * screen that shows the character uses this one component.
 */
export const SHOW_MASCOT_PLACEHOLDER = true;

type Props = {
  /** What the character says. Changing it fades the new line in. */
  message?: string;
  /** Diameter of the character (default 64). */
  size?: number;
  /** Bubble to the right of the character (default) or underneath. */
  layout?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
};

export function MascotSlot({ message, size = 64, layout = 'row', style }: Props) {
  const row = layout === 'row';
  return (
    <View style={[row ? styles.row : styles.column, style]}>
      {SHOW_MASCOT_PLACEHOLDER && (
        <View
          style={[styles.slot, { width: size, height: size, borderRadius: size / 2 }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      {message ? (
        // Keyed by the message, so each new line fades in.
        <Animated.View key={message} entering={FadeIn.duration(220)} style={[styles.bubble, row ? styles.bubbleRow : styles.bubbleColumn]} accessibilityLiveRegion="polite">
          {SHOW_MASCOT_PLACEHOLDER && <View style={[styles.tail, row ? styles.tailLeft : styles.tailTop]} />}
          <Text style={styles.text} maxFontSizeMultiplier={1.4}>
            {message}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  column: { alignItems: 'center', gap: 14 },
  slot: { borderWidth: stroke.thick, borderColor: pop.ink, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.6)' },
  bubble: {
    backgroundColor: pop.white,
    borderWidth: stroke.thick,
    borderColor: pop.ink,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderCurve: 'continuous',
  },
  bubbleRow: { flexShrink: 1 },
  bubbleColumn: { alignSelf: 'center', maxWidth: 300 },
  // A small square turned 45°, tucked behind the bubble's edge, makes the pointer.
  tail: { position: 'absolute', width: 14, height: 14, backgroundColor: pop.white, borderColor: pop.ink, transform: [{ rotate: '45deg' }] },
  tailLeft: { left: -8.5, top: '50%', marginTop: -7, borderLeftWidth: stroke.thick, borderBottomWidth: stroke.thick },
  tailTop: { top: -8.5, left: '50%', marginLeft: -7, borderLeftWidth: stroke.thick, borderTopWidth: stroke.thick },
  text: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: pop.ink },
});
