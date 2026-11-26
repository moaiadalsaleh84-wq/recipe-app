import { View } from 'react-native';
import { pop, stroke } from '../theme';
import { Icon } from './Icon';

/**
 * Pantry Pop's icon, drawn in code: a sunshine rounded square with the pot. Used where the app
 * shows its own icon (the notification preview) until real icon artwork exists.
 */
export function AppIcon({ size = 38 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: pop.sunshine, borderWidth: stroke.thin, borderColor: pop.line, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' }}
    >
      <Icon name="pot" size={size * 0.55} color={pop.ink} weight="bold" />
    </View>
  );
}
