/**
 * The fox mascot (Phase 2). Final artwork isn't in yet: until it is, this draws nothing, so every
 * screen reads fine without it. Each spot where the fox will appear already renders
 * <FoxMascot mood="…" size={…} />, so dropping the art in is one change, here:
 *
 *   1. Put the images (or a Lottie / Rive file per mood) in assets/mascot/fox/.
 *   2. Map each mood to its file in FOX_ART below and set FOX_READY = true.
 *
 * To see the spots while laying out screens, set SHOW_MASCOT_PLACEHOLDER (pop/MascotSlot) to true:
 * each one then shows a dashed circle with its mood name.
 *
 * Spots (see docs/mascot-slots.md): welcome screen, "Setting up your kitchen", Cook Mode finish,
 * empty shopping list, empty pantry, You header, paywall.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, pop } from '../../theme';
import { SHOW_MASCOT_PLACEHOLDER } from '../pop/MascotSlot';
import { Text } from '../Text';

export type FoxMood = 'happy' | 'excited' | 'chef' | 'celebration' | 'playful' | 'studying' | 'champion' | 'loving';

/** Set to true once FOX_ART has real artwork for every mood. */
export const FOX_READY = false;

/** mood → artwork (an image `require(...)`, or a Lottie source). Empty until the art exists. */
export const FOX_ART: Partial<Record<FoxMood, number>> = {};

export function FoxMascot({ mood, size = 96, style }: { mood: FoxMood; size?: number; style?: StyleProp<ViewStyle> }) {
  if (!FOX_READY && !SHOW_MASCOT_PLACEHOLDER) return null;
  // Placeholder: a dashed circle with the mood's name, the size the fox will be.
  return (
    <View
      style={[styles.slot, { width: size, height: size, borderRadius: size / 2 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`fox-${mood}`}
    >
      <Text style={styles.label} maxFontSizeMultiplier={1}>
        {mood}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { borderWidth: 2, borderStyle: 'dashed', borderColor: pop.inkMuted, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 11, color: pop.inkMuted },
});
