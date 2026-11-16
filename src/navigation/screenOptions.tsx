import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export const isIOS = Platform.OS === 'ios';

/**
 * Stack options for a tab's root screen. The title is drawn inside the page on
 * every platform (see <ScreenTitle>): the native iOS large title left an empty
 * band above the search bar.
 */
export function useTabStackOptions(background: 'plain' | 'grouped') {
  const t = useTheme();
  const bg = background === 'plain' ? t.colors.background : t.colors.groupedBackground;
  return { headerShown: false, contentStyle: { backgroundColor: bg } } as const;
}

/**
 * The header of every tab: the same title size, the same height and the same distance to the
 * content below. Actions sit on the right, centered on the title.
 */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // On iOS the scroll view's automatic insets already clear the status bar.
  const top = isIOS ? t.spacing.xs : insets.top + t.spacing.xs;
  return (
    <View style={[styles.row, { marginTop: top }]}>
      <Text style={[t.type.largeTitle, { color: t.colors.label, flex: 1 }]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={styles.actions}>{right}</View> : null}
    </View>
  );
}

/** Padding for the scrolling content of every tab, so all five line up. */
export function useTabContent() {
  const t = useTheme();
  return { paddingHorizontal: t.layout.screen, paddingBottom: t.layout.bottom, width: '100%', maxWidth: 700, alignSelf: 'center' } as const;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 56, marginBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
