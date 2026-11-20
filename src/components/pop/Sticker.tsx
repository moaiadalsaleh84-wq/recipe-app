import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { fonts, pop, stroke } from '../../theme';

/**
 * A small tilted label, like a sticker slapped on a card ("TONIGHT'S PICK").
 * Ink outline, a 3pt solid shadow, rotated -4° by default (a label only: never a photo).
 */
export function Sticker({ label, color = pop.tomato, rotate = -4, style }: { label: string; color?: string; rotate?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.wrap, { transform: [{ rotate: `${rotate}deg` }] }, style]} accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.shadow} />
      <View style={[styles.face, { backgroundColor: color }]}>
        <Text style={styles.text} maxFontSizeMultiplier={1.3}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', paddingBottom: 3 },
  shadow: { position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, backgroundColor: pop.ink, borderRadius: 10 },
  face: { borderWidth: stroke.thick, borderColor: pop.ink, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: fonts.black, fontSize: 13, lineHeight: 17, letterSpacing: 0.6, color: pop.ink },
});
