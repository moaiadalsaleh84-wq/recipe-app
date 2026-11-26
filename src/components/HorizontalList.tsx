/**
 * Every sideways-scrolling row (recipe rails, Discover, chips, "You might also like"): it reaches
 * the screen edges, and its first item starts exactly at the page margin (16). iOS never adds its
 * own insets, so the first card can't slide left of the margin.
 */
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';

/** The page's side margin; rows bleed out by this much and pad back in. */
export const RAIL_PADDING = 16;

export function HorizontalList({ children, gap = 12, contentStyle, testID, keyboardShouldPersistTaps }: { children: ReactNode; gap?: number; contentStyle?: StyleProp<ViewStyle>; testID?: string; keyboardShouldPersistTaps?: 'handled' | 'always' | 'never' }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      style={{ marginHorizontal: -RAIL_PADDING, flexGrow: 0 }}
      contentContainerStyle={[{ paddingHorizontal: RAIL_PADDING, gap, alignItems: 'stretch' }, contentStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}
