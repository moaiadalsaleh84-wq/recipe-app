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

/** Large title and trailing actions at the top of a tab screen. */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // On iOS the scroll view's automatic insets already clear the status bar.
  // On web, Expo's tab bar floats over the top of the page, so leave room for it.
  const top = isIOS ? t.spacing.xs : insets.top + t.spacing.xs + (Platform.OS === 'web' ? 64 : 0);
  return (
    <View style={[styles.row, { paddingTop: top }]}>
      <Text style={[t.type.largeTitle, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, marginBottom: 8 },
});
