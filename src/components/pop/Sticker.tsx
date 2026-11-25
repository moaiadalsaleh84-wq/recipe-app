import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';
import { fonts, pop, stroke } from '../../theme';

/**
 * A small tilted label, like a sticker slapped on a card ("TONIGHT'S PICK").
 * Ink outline, a 3pt solid shadow, rotated -4° by default (a label only: never a photo).
 */
export function Sticker({
  label,
  color = pop.tomato,
  rotate = -4,
  caps = true,
  style,
}: {
  label: string;
  color?: string;
  rotate?: number;
  /** False keeps the label as written ("From TikTok") instead of capitals. */
  caps?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    // Drawn as one smooth picture while tilted, so its edges stay clean on iOS and Android.
    <View style={[styles.wrap, { transform: [{ rotate: `${rotate}deg` }] }, style]} shouldRasterizeIOS renderToHardwareTextureAndroid accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.shadow} />
      <View style={[styles.face, { backgroundColor: color }]}>
        <Text style={[styles.text, !caps && styles.textPlain]} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {caps ? label.toUpperCase() : label}
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
  textPlain: { letterSpacing: 0 },
});
