import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Mascot } from './mascot/Mascot';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

/** Size of the little Biscuit that rides on the tab bar. */
const BUDDY = 44;

/** One entry per tab folder in src/app/(tabs). Labels are short on purpose: five must fit on a small phone. */
const tabs: Record<string, { label: string; icon: IconName }> = {
  '(recipes)': { label: 'Recipes', icon: 'book' },
  plan: { label: 'Plan', icon: 'calendar' },
  pantry: { label: 'Pantry', icon: 'fridge' },
  groceries: { label: 'Groceries', icon: 'cart' },
  progress: { label: 'Progress', icon: 'trophy' },
};

/** The app's own tab bar: quiet icons on a frosted bar with a hairline; the current tab in aubergine. */
export function TabBar({ state, emitter, navigateToTab, badges = {} }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const shown = state.routes.filter((r) => tabs[r.name]);
  const visibleCount = shown.length;
  const visibleIndex = Math.max(0, shown.findIndex((r) => r.key === state.routes[state.index]?.key));
  return (
    <View style={styles.wrap}>
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <BlurView tint={t.isDark ? 'dark' : 'light'} intensity={50} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bar }]} />
      <View style={[styles.hairline, { backgroundColor: t.colors.separator }]} />
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const selected = state.index === i;
        const badge = badges[route.name] ?? 0;
        return (
          <PressableScale
            key={route.key}
            haptic="select"
            scaleTo={0.92}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={badge ? `${tab.label}, ${badge} to buy` : tab.label}
            testID={`tab-${tab.label.toLowerCase()}`}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !e.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <TabIcon icon={tab.icon} selected={selected} badge={badge} />
            <Text numberOfLines={1} style={[styles.label, { fontWeight: selected ? '600' : '500', color: selected ? t.colors.tint : t.colors.secondaryLabel }]}>
              {tab.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
      {/* Biscuit rides along on top of the tab bar and hops over to the tab you open. */}
      {width > 0 && <TabBuddy index={visibleIndex} count={visibleCount} width={width} />}
    </View>
  );
}

/** Biscuit sitting on the edge of the tab bar, above the open tab. */
function TabBuddy({ index, count, width }: { index: number; count: number; width: number }) {
  const reduceMotion = useReducedMotion();
  const slot = width / count;
  const x = useSharedValue(slot * (index + 0.5) - BUDDY / 2);
  const hop = useSharedValue(0);
  // He's happy for a moment each time you switch tabs (worked out while rendering, not in an effect).
  const [seen, setSeen] = useState(index);
  const [cheer, setCheer] = useState(false);
  if (seen !== index) {
    setSeen(index);
    setCheer(true);
  }
  useEffect(() => {
    if (!cheer) return;
    const id = setTimeout(() => setCheer(false), 1400);
    return () => clearTimeout(id);
  }, [cheer]);
  useEffect(() => {
    const to = slot * (index + 0.5) - BUDDY / 2;
    if (reduceMotion) {
      x.set(to);
      return;
    }
    // A little hop across: crouch, jump, land.
    x.set(withSpring(to, { damping: 16, stiffness: 140, mass: 0.9 }));
    hop.set(withSequence(withTiming(2, { duration: 70 }), withSpring(-14, { damping: 12, stiffness: 260 }), withSpring(0, { damping: 9, stiffness: 220 })));
  }, [index, slot, reduceMotion, x, hop]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: hop.get() }] }));
  return (
    <Animated.View style={[styles.buddy, style]} pointerEvents="box-none">
      <Mascot mood={cheer ? 'happy' : lateNight() ? 'sleepy' : 'idle'} size={BUDDY} playKey={`tab-${index}`} />
    </Animated.View>
  );
}

/** After 10 pm Biscuit gets sleepy. */
const lateNight = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 5;
};

function TabIcon({ icon, selected, badge }: { icon: IconName; selected: boolean; badge: number }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    // A small, quick pop when a tab becomes selected.
    if (selected && !reduceMotion) pop.set(withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, t.motion.pop)));
  }, [selected, reduceMotion, pop, t.motion.pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View style={[styles.pill, style]}>
      <Icon name={icon} size={25} color={selected ? t.colors.tint : t.colors.secondaryLabel} weight={selected ? 'semibold' : 'regular'} />
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: '#D23F5B', borderColor: t.isDark ? t.colors.background : t.colors.cell }]}>
          <Text style={[t.type.caption2, { color: '#FFFFFF', fontWeight: '700' }]}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  bar: { flexDirection: 'row', paddingTop: 6, overflow: 'hidden' },
  // Sits on the bar's top edge: most of Biscuit above it, his feet just over the line.
  buddy: { position: 'absolute', left: 0, top: -BUDDY + 10, width: BUDDY, height: BUDDY },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth * 2 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 50, justifyContent: 'center' },
  // Small enough that the longest label (Groceries) keeps clear space on each side, even on an SE.
  label: { fontSize: 11, lineHeight: 13, letterSpacing: -0.1 },
  pill: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: 3, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
