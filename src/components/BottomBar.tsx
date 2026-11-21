import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, pop, stroke } from '../theme';

type Props = {
  children: ReactNode;
  /** The screen's own background, so the bar reads as part of the page (default white). */
  color?: string;
  /** An ink line on top, for screens whose content scrolls up to the bar. */
  border?: boolean;
  /** Buttons side by side (default) or stacked. */
  direction?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The bar of main actions at the bottom of a screen. It sits in the normal layout, under the
 * screen's scroll view (never on top of it), so nothing can hide behind it: put it after the
 * ScrollView in a flex: 1 column and give the scroll content a paddingBottom of 24.
 * Bottom padding: the home indicator area plus 12.
 */
export function BottomBar({ children, color = pop.white, border = false, direction = 'row', style, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: direction,
          alignItems: direction === 'row' ? 'flex-start' : 'stretch',
          gap: 12,
          paddingHorizontal: layout.screen,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: color,
        },
        border && { borderTopWidth: stroke.thick, borderTopColor: pop.ink },
        style,
      ]}
    >
      {children}
    </View>
  );
}
