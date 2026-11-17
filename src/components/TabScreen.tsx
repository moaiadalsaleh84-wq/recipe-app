/**
 * The frame of every tab: a large title that collapses into a small centered title on a blurred
 * cream bar with a hairline as you scroll. A solid strip always sits behind the clock and battery,
 * so content never shows under the status bar.
 *
 *   <TabScreen title="Pantry" right={<HeaderButton … />}>…</TabScreen>
 */
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** Height of the small bar under the status bar. */
export const BAR = 44;
/** Height of the large title row. */
const TITLE = 56;

type Props = Omit<ScrollViewProps, 'children'> & {
  title: string;
  /** Actions on the right of the large title (e.g. an Add or Settings button). */
  right?: ReactNode;
  children: ReactNode;
  /** Widest the content gets on big screens. */
  maxWidth?: number;
};

export function TabScreen({ title, right, children, maxWidth = 700, contentContainerStyle, ...rest }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  // The small bar fades in as the large title slides under it.
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [TITLE - 24, TITLE - 4], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Animated.ScrollView
        {...rest}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={{ flex: 1, backgroundColor: t.colors.background }}
        contentContainerStyle={[
          { paddingTop: insets.top + 8, paddingHorizontal: t.layout.screen, paddingBottom: t.layout.bottom, width: '100%', maxWidth, alignSelf: 'center' },
          contentContainerStyle,
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[t.type.largeTitle, { color: t.colors.label, flex: 1 }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </Text>
          {right ? <View style={styles.actions}>{right}</View> : null}
        </View>
        {children}
      </Animated.ScrollView>

      {/* Behind the clock: always solid. */}
      <View style={[styles.status, { height: insets.top, backgroundColor: t.colors.background }]} testID="screen-status" />
      {/* The small bar: blurred cream, a hairline and the small title once the large one is gone. */}
      <Animated.View pointerEvents="none" style={[styles.bar, { top: insets.top, height: BAR }, barStyle]} testID="screen-bar" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BlurView tint={t.isDark ? 'dark' : 'light'} intensity={40} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bar }]} />
        <View style={[styles.hairline, { backgroundColor: t.colors.separator }]} />
        <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', height: TITLE, marginBottom: 12, gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth * 2 },
});
