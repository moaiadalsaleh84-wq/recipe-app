import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Was: a solid ink shadow under cards and pills. The design is flat now (only buttons are 3D, see
 * PopButton), so Lift just lays its child out: no shadow, no extra space. Kept so every screen
 * that wraps a card in <Lift> keeps working.
 */
export function Lift({ children, style }: { children: ReactNode; radius?: number; offset?: number; pressed?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={style}>{children}</View>;
}
