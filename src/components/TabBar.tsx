import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { spring } from '../motion';
import { fonts, pop, stroke } from '../theme';
import { Icon, type IconName } from './Icon';

/** One entry per tab folder in src/app/(tabs). */
const tabs: Record<string, { label: string; long: string; icon: IconName }> = {
  '(recipes)': { label: 'Cook', long: 'Cook', icon: 'pot' },
  plan: { label: 'Plan', long: 'Meal plan', icon: 'calendar' },
  pantry: { label: 'Pantry', long: 'Pantry', icon: 'fridge' },
  groceries: { label: 'List', long: 'Shopping list', icon: 'cart' },
  progress: { label: 'You', long: 'You', icon: 'trophy' },
};

const PILL_W = 52;

/** Height of the bar itself, above the home indicator. */
export const TAB_BAR_HEIGHT = 64;

/** The bar's full height on this phone (bar + home indicator area). */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);
}

/**
 * Room a scrolling tab screen leaves at the bottom, so its last item never hides behind the bar:
 * the bar's full height + 24.
 */
export function useTabBarSpace() {
  return useTabBarHeight() + 24;
}

/**
 * The app's tab bar: five equal tabs on white, under a thick ink line. Tabs never move or change
 * width. The selected tab gets a sunshine pill behind its icon and a heavier ink label.
 */
export function TabBar({ state, emitter, navigateToTab, badges = {} }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // One sunshine pill that slides to the selected tab (a spring), instead of one pill per tab.
  const count = state.routes.filter((r) => tabs[r.name]).length || 1;
  const [barW, setBarW] = useState(0);
  const x = useSharedValue(-1);
  const tabW = barW / count;
  useEffect(() => {
    if (!barW) return;
    const to = state.index * tabW + (tabW - PILL_W) / 2;
    // First placement (and Reduce Motion): jump there. Then: slide.
    x.set(reduceMotion || x.get() < 0 ? to : withSpring(to, spring));
  }, [state.index, tabW, barW, reduceMotion, x]);
  const pillStyle = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 0 : 1, transform: [{ translateX: x.get() }] }));
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.pill, styles.slidingPill, pillStyle]} />
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const selected = state.index === i;
        const badge = badges[route.name] ?? 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={badge ? `${tab.long}, ${badge} to buy` : tab.long}
            testID={`tab-${tab.label.toLowerCase()}`}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !e.defaultPrevented) {
                haptics.select();
                navigateToTab(route.key);
              }
            }}
            style={styles.tab}
          >
            <TabIcon icon={tab.icon} selected={selected} badge={badge} />
            <Text style={[styles.label, selected ? styles.labelOn : styles.labelOff]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ icon, selected, badge }: { icon: IconName; selected: boolean; badge: number }) {
  // No bounce: tabs are switched tens of times a day, so the sliding pill is all the motion they get.
  return (
    <View style={styles.iconBox}>
      <View>
        <Icon name={icon} size={22} color={selected ? pop.ink : pop.inkMuted} weight={selected ? 'bold' : 'semibold'} />
      </View>
      {badge > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Pinned to the bottom over the screen; the screens leave room for it (useTabBarSpace).
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: pop.white,
    borderTopWidth: stroke.thick,
    borderTopColor: pop.ink,
    paddingTop: 6,
  },
  // Five equal tabs: the same width whether selected or not.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: TAB_BAR_HEIGHT - 8, minWidth: 0 },
  iconBox: { width: 52, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: PILL_W, height: 32, borderRadius: 16, backgroundColor: pop.sunshine, borderWidth: stroke.thin, borderColor: pop.ink },
  // Sits behind the selected tab's icon: the bar's 6pt top padding + the 3pt left over when the 50pt icon+label block is centered in the 56pt tab.
  slidingPill: { top: 6 + 3, left: 0 },
  label: { fontSize: 12, lineHeight: 15 },
  labelOn: { fontFamily: fonts.black, color: pop.ink },
  labelOff: { fontFamily: fonts.medium, color: pop.inkMuted },
  badge: {
    position: 'absolute',
    top: -6,
    right: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: pop.tomato,
    borderWidth: stroke.thin,
    borderColor: pop.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: pop.ink },
});
