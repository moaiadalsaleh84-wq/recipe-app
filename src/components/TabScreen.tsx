/**
 * The frame of every tab: an optional friendly line (a greeting, today's date) above a large
 * Fredoka title that collapses into a small centered title on a blurred bar as you scroll. A solid
 * strip always sits behind the clock and battery, and the bottom leaves room for the tab bar (its height + 24).
 *
 *   <TabScreen title="Pantry" kicker="8 things at home" right={<HeaderButton … />}>…</TabScreen>
 */
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTabBarSpace } from './TabBar';

/** Height of the small bar under the status bar. */
export const BAR = 44;
/** Height of the large title row. */
const TITLE = 56;

type Props = Omit<ScrollViewProps, 'children'> & {
  title: string;
  /** A short friendly line above the title, e.g. "Good evening, Sam". */
  kicker?: string;
  /** Actions on the right of the large title (e.g. an Add or Settings button). */
  right?: ReactNode;
  children: ReactNode;
  /** Widest the content gets on big screens. */
  maxWidth?: number;
};

export function TabScreen({ title, kicker, right, children, maxWidth = 700, contentContainerStyle, ...rest }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  // The small bar fades in as the large title slides under it.
  const fadeAt = kicker ? TITLE + 20 : TITLE;
  // The big title stretches a little when you pull down, and shrinks and fades as you scroll up.
  const titleStyle = useAnimatedStyle(() => {
    const v = y.get();
    return {
      opacity: interpolate(v, [0, fadeAt - 8], [1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(v, [-120, 0, fadeAt], [1.12, 1, 0.92], Extrapolation.CLAMP) }, { translateY: interpolate(v, [0, fadeAt], [0, 10], Extrapolation.CLAMP) }],
    };
  });
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [fadeAt - 24, fadeAt - 4], [0, 1], Extrapolation.CLAMP) }));

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
          { paddingTop: insets.top + 12, paddingHorizontal: t.layout.screen, paddingBottom: tabSpace, width: '100%', maxWidth, alignSelf: 'center' },
          contentContainerStyle,
        ]}
      >
        <View style={styles.titleRow}>
          <Animated.View style={[{ flex: 1, transformOrigin: 'left bottom' }, titleStyle]}>
            {kicker ? (
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.semibold }]} numberOfLines={1} testID="screen-kicker">
                {kicker}
              </Text>
            ) : null}
            <Text style={[t.type.largeTitle, { color: t.colors.label }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {title}
            </Text>
          </Animated.View>
          {right ? <View style={styles.actions}>{right}</View> : null}
        </View>
        {children}
      </Animated.ScrollView>

      {/* Behind the clock: always solid. */}
      <View style={[styles.status, { height: insets.top, backgroundColor: t.colors.background }]} testID="screen-status" />
      {/* The small bar: blurred cream, a hairline and the small title once the large one is gone. */}
      <Animated.View pointerEvents="none" style={[styles.bar, { top: insets.top, height: BAR }, barStyle]} testID="screen-bar" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BlurView tint="light" intensity={40} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bar }]} />
        <View style={[styles.hairline, { backgroundColor: t.colors.separator }]} />
        <Text style={[t.type.title3, { color: t.colors.label }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', minHeight: TITLE, marginBottom: 16, gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth * 2 },
});
