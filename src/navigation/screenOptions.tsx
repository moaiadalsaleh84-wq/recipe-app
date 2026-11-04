import { useNavigation } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export const isIOS = Platform.OS === 'ios';

/**
 * Stack options for a tab's root screen: an iOS large title that collapses into
 * a blurred bar on scroll. Other platforms draw the title inside the content
 * (see <ScreenTitle>), so the layout matches.
 */
export function useTabStackOptions(background: 'plain' | 'grouped') {
  const t = useTheme();
  const bg = background === 'plain' ? t.colors.background : t.colors.groupedBackground;
  return {
    headerShown: isIOS,
    headerLargeTitleEnabled: true,
    headerTransparent: true,
    headerBlurEffect: 'systemChromeMaterial',
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: t.colors.tint,
    headerTitleStyle: { color: t.colors.label },
    headerLargeTitleStyle: { color: t.colors.label },
    contentStyle: { backgroundColor: bg },
  } as const;
}

/**
 * Title and trailing actions for a tab screen.
 * iOS: puts `right` into the native navigation bar. Elsewhere: renders an inline large title.
 * Pass a memoized `right` element.
 */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    if (isIOS) navigation.setOptions({ title, headerRight: right ? () => right : undefined });
  }, [navigation, title, right]);

  if (isIOS) return null;
  return (
    // On web, Expo's tab bar floats over the top of the page, so leave room for it.
    <View style={[styles.row, { paddingTop: insets.top + t.spacing.xs + (Platform.OS === 'web' ? 64 : 0) }]}>
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
