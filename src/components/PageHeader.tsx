import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { PressableScale } from './PressableScale';
import { IconButton } from './ui';

/**
 * Header for pushed screens and sheets: a back (or Cancel) button, a centered title
 * and optional actions on the right.
 */
export function PageHeader({
  title,
  subtitle,
  right,
  mode = 'back',
  onBack,
  inSheet,
  cancelLabel = 'Cancel',
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** 'none' hides the left button (the screen offers its own way out). */
  mode?: 'back' | 'cancel' | 'none';
  onBack?: () => void;
  /** Sheets on iOS already sit below the status bar (elsewhere they cover the whole screen). */
  inSheet?: boolean;
  /** The word on the left button in 'cancel' mode ("Done" for screens with nothing to discard). */
  cancelLabel?: string;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={[styles.header, { paddingTop: inSheet && Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
      <View style={styles.side}>
        {mode === 'none' ? null : mode === 'back' ? (
          <IconButton icon="back" accessibilityLabel="Back" onPress={back} color={t.colors.tint} iconSize={19} />
        ) : (
          <PressableScale onPress={back} style={styles.textButton} accessibilityLabel={cancelLabel}>
            <Text style={[t.type.body, { color: t.colors.tint, fontFamily: t.fonts.semibold }]}>{cancelLabel}</Text>
          </PressableScale>
        )}
      </View>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={[t.type.title3, { color: t.colors.label }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{subtitle}</Text>}
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  side: { width: 96 },
  right: { flexDirection: 'row', alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
