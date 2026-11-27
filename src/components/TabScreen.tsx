/**
 * The frame of every tab: an optional friendly line (a greeting, today's date) above a large
 * Fredoka title that collapses into a small centered title on a blurred bar as you scroll. A solid
 * strip always sits behind the clock and battery, and the bottom leaves room for the tab bar (its height + 24).
 *
 *   <TabScreen title="Pantry" kicker="8 things at home" right={<HeaderButton … />}>…</TabScreen>
 */
import { useEffect, useState, type ReactNode } from 'react';
import { RefreshControl, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { Fox } from './mascot/Fox';
import { Text } from './Text';
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { onTabReselect, useTabBarSpace } from './TabBar';

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
  /** A custom header in place of the kicker + title row (the title still shows in the small bar). */
  header?: ReactNode;
  /** This screen's tab (e.g. "(recipes)"): tapping that tab again scrolls back to the top. */
  scrollToTopTab?: string;
  /** Floats above the page and stays put while it scrolls (e.g. a round + button). */
  overlay?: ReactNode;
  /** Pull to refresh: the fox peeks down from the top while you pull, and stays while it works. */
  onRefresh?: () => Promise<void>;
};

export function TabScreen({ title, kicker, right, children, maxWidth = 700, header, scrollToTopTab, overlay, onRefresh, contentContainerStyle, ...rest }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const y = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useEffect(() => {
    if (!scrollToTopTab) return;
    return onTabReselect((tab) => {
      if (tab === scrollToTopTab) scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [scrollToTopTab, scrollRef]);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  // The small bar fades in as the large title slides under it.
  const fadeAt = header ? 150 : kicker ? TITLE + 20 : TITLE;
  // The big title shrinks and fades as you scroll up.
  const titleStyle = useAnimatedStyle(() => {
    const v = y.get();
    return {
      // Full ink while readable; it only fades in the last stretch before the small bar covers it.
      opacity: interpolate(v, [fadeAt - 32, fadeAt - 8], [1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(v, [0, fadeAt], [1, 0.92], Extrapolation.CLAMP) }, { translateY: interpolate(v, [0, fadeAt], [0, 10], Extrapolation.CLAMP) }],
    };
  });
  // The small bar is always solid (nothing shows through it): it slides down from behind the
  // status strip instead of fading in.
  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(y.get(), [fadeAt - 24, fadeAt - 4], [-BAR - 4, 0], Extrapolation.CLAMP) }] }));
  // Pull to refresh: the fox hangs upside down from the top edge, lowered as far as you pull.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    : undefined;
  const foxStyle = useAnimatedStyle(() => {
    const pull = Math.min(96, Math.max(0, -y.get()));
    return { opacity: pull > 6 ? 1 : 0, transform: [{ translateY: -60 + pull * 0.9 }, { rotate: '180deg' }] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Animated.ScrollView
        {...rest}
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Only a screen with pull to refresh bounces at the top (the fox fills that space).
        bounces={!!refresh}
        refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" /> : undefined}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={{ flex: 1, backgroundColor: t.colors.background }}
        contentContainerStyle={[
          { paddingTop: insets.top + 12, paddingHorizontal: t.layout.screen, paddingBottom: tabSpace, width: '100%', maxWidth, alignSelf: 'center' },
          contentContainerStyle,
        ]}
      >
        {header ? (
          <Animated.View style={[{ transformOrigin: 'left top' }, titleStyle]}>{header}</Animated.View>
        ) : (
        <View style={styles.titleRow}>
          <Animated.View style={[{ flex: 1, transformOrigin: 'left bottom' }, titleStyle]}>
            {kicker ? (
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.semibold }]} testID="screen-kicker">
                {kicker}
              </Text>
            ) : null}
            <Text style={[t.type.largeTitle, { color: t.colors.label }]} accessibilityRole="header">
              {title}
            </Text>
          </Animated.View>
          {right ? <View style={styles.actions}>{right}</View> : null}
        </View>
        )}
        {children}
      </Animated.ScrollView>

      {/* The small bar, once the big title has scrolled away: white, a 2pt ink line, the title on one line. */}
      <Animated.View pointerEvents="none" style={[styles.bar, { top: insets.top, height: BAR, backgroundColor: t.colors.background, borderBottomColor: t.colors.border }, barStyle]} testID="screen-bar" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[t.type.title3, styles.barTitle, { color: t.colors.label }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
      {refresh && (
        <Animated.View pointerEvents="none" style={[styles.pullFox, { top: insets.top }, foxStyle]}>
          <Fox pose={refreshing ? 'cheer' : 'happy'} size={56} still />
        </Animated.View>
      )}
      {overlay}
      {/* Behind the clock: always solid. */}
      <View style={[styles.status, { height: insets.top, backgroundColor: t.colors.background }]} testID="screen-status" />
    </View>
  );
}

const styles = StyleSheet.create({
  pullFox: { position: 'absolute', alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', minHeight: TITLE, marginBottom: 16, gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 64, borderBottomWidth: 2 },
  barTitle: { fontSize: 18, lineHeight: 22 },
});
