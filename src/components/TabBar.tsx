import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

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
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
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
  );
}

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
  bar: { flexDirection: 'row', paddingTop: 6, overflow: 'hidden' },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth * 2 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 50, justifyContent: 'center' },
  // Small enough that the longest label (Groceries) keeps clear space on each side, even on an SE.
  label: { fontSize: 11, lineHeight: 13, letterSpacing: -0.1 },
  pill: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: 3, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
