import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { depth, pop } from '../../theme';

/**
 * THE shadow, the same everywhere: a solid ink shape with the same corners, sitting straight
 * below the element (4pt for cards and big buttons, 3pt for small buttons, chips and pills).
 * No blur. Wrap the element; give the element its own background and ink border.
 *
 *   <Lift radius={22}><View style={{ borderRadius: 22, borderWidth: 2.5, ... }}>…</View></Lift>
 *
 * `pressed` hides the shadow; move the element down by `offset` yourself (PopButton does).
 * Text inputs never get one, so they don't look like buttons.
 */
export function Lift({ children, radius, offset = depth.card, pressed, style }: { children: ReactNode; radius: number; offset?: number; pressed?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingBottom: offset }, style]}>
      {!pressed && <View pointerEvents="none" style={[styles.shadow, { top: offset, borderRadius: radius }]} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: pop.ink, borderCurve: 'continuous' },
});
