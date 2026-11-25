import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
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

// A slide ends with the finger lifting over some tab: that lift must not also count as a tap.
// (There's one tab bar, so this lives here rather than in each render.)
let slidUntil = 0;
const startSlide = () => {
  slidUntil = Number.MAX_SAFE_INTEGER;
};
const endSlide = () => {
  slidUntil = Date.now() + 400;
};
const justSlid = () => Date.now() < slidUntil;

/** The pill's one spring: settles without overshooting (no bounce, no jump). */
const PILL_SPRING = { damping: 30, stiffness: 320, mass: 1, overshootClamping: true } as const;

/**
 * The app's tab bar: five equal tabs on white, under a thick ink line. Tabs never move or change
 * width. One sunshine pill sits behind the selected tab's icon and slides between tabs.
 *
 * - The tabs' positions are measured once (onLayout); the pill only animates translateX, with one
 *   spring that never overshoots, so far jumps (You → Cook) glide instead of flashing.
 * - Slide to select: press anywhere on the bar and slide; the pill follows your finger, ticks
 *   (selection haptic) each time it passes a tab, and lifting your finger opens that tab.
 *   A plain tap still works.
 */
export function TabBar({ state, emitter, navigateToTab, badges = {} }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const routes = state.routes.filter((r) => tabs[r.name]);
  // Each tab's x and width, measured once when laid out.
  const [slots, setSlots] = useState<Record<number, { x: number; w: number }>>({});
  const measured = routes.every((_, i) => slots[i]);
  const targets = routes.map((_, i) => (slots[i] ? slots[i].x + (slots[i].w - PILL_W) / 2 : 0));
  const centers = routes.map((_, i) => (slots[i] ? slots[i].x + slots[i].w / 2 : 0));
  const x = useSharedValue(-1);
  // While sliding: the tab under the finger (-1 when not sliding).
  const hover = useSharedValue(-1);
  const [hovered, setHovered] = useState(-1);
  const active = state.index;

  useEffect(() => {
    if (!measured) return;
    const to = targets[active];
    // First placement (and Reduce Motion): straight there. Then one spring, no overshoot.
    x.set(reduceMotion || x.get() < 0 ? to : withSpring(to, PILL_SPRING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, measured, reduceMotion, slots]);

  const pillStyle = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 0 : 1, transform: [{ translateX: x.get() }] }));

  const open = (i: number) => {
    const route = routes[i];
    if (!route) return;
    const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.routes[state.index]?.key !== route.key && !e.defaultPrevented) navigateToTab(route.key);
    else x.set(reduceMotion ? targets[active] : withSpring(targets[active], PILL_SPRING));
  };
  const tick = (i: number) => {
    haptics.select();
    setHovered(i);
  };
  const release = (i: number) => {
    endSlide();
    setHovered(-1);
    open(i);
  };

  // Horizontal slides only (vertical scrolls and taps pass through to the tabs).
  const minX = targets[0] ?? 0;
  const maxX = targets[targets.length - 1] ?? 0;
  const slide = Gesture.Pan()
    .enabled(measured)
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onStart((e) => {
      scheduleOnRN(startSlide);
      hover.set(-1);
      x.set(Math.min(maxX, Math.max(minX, e.x - PILL_W / 2)));
    })
    .onUpdate((e) => {
      x.set(Math.min(maxX, Math.max(minX, e.x - PILL_W / 2)));
      let near = 0;
      for (let i = 1; i < centers.length; i++) if (Math.abs(centers[i] - e.x) < Math.abs(centers[near] - e.x)) near = i;
      if (near !== hover.get()) {
        hover.set(near);
        scheduleOnRN(tick, near);
      }
    })
    // Ended or cancelled (the browser can report a release as a cancel): open what's under the pill.
    .onFinalize(() => {
      if (hover.get() < 0 && x.get() === targets[active]) return;
      const n = hover.get() < 0 ? active : hover.get();
      x.set(reduceMotion ? targets[n] : withSpring(targets[n], PILL_SPRING));
      hover.set(-1);
      scheduleOnRN(release, n);
    });

  return (
    <GestureDetector gesture={slide}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
        <Animated.View pointerEvents="none" style={[styles.pill, styles.slidingPill, pillStyle]} />
        {routes.map((route, i) => {
          const tab = tabs[route.name];
          const selected = hovered >= 0 ? hovered === i : state.routes[state.index]?.key === route.key;
          const badge = badges[route.name] ?? 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              aria-selected={selected}
              accessibilityLabel={badge ? `${tab.long}, ${badge} to buy` : tab.long}
              testID={`tab-${tab.label.toLowerCase()}`}
              onLayout={(e) => {
                const { x: lx, width } = e.nativeEvent.layout;
                setSlots((prev) => (prev[i]?.x === lx && prev[i]?.w === width ? prev : { ...prev, [i]: { x: lx, w: width } }));
              }}
              onPress={() => {
                if (justSlid()) return;
                if (!selected) haptics.select();
                open(i);
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
    </GestureDetector>
  );
}

function TabIcon({ icon, selected, badge }: { icon: IconName; selected: boolean; badge: number }) {
  // The selected icon lifts 2pt (no scaling): the sliding pill is the motion.
  return (
    <View style={styles.iconBox}>
      <View style={{ transform: [{ translateY: selected ? -2 : 0 }] }}>
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
