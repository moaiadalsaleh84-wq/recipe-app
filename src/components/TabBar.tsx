import type { BottomTabBarProps } from 'expo-router/tabs';
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

/** The app's own tab bar: big icons in a soft pill, short labels, room to breathe. */
export function TabBar({ state, emitter, navigateToTab, badges = {} }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: t.colors.cell, borderTopColor: t.colors.border, paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
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
            <Text numberOfLines={1} style={[styles.label, { fontFamily: selected ? t.fonts.display : t.fonts.displayMedium, color: selected ? t.colors.tint : t.colors.secondaryLabel }]}>
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
    // A small squash and pop when a tab becomes selected.
    if (selected && !reduceMotion) pop.set(withSequence(withTiming(0.82, { duration: 80 }), withSpring(1, t.motion.pop)));
  }, [selected, reduceMotion, pop, t.motion.pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View style={[styles.pill, selected && { backgroundColor: t.colors.tintSoft }, style]}>
      <Icon name={icon} size={24} color={selected ? t.colors.tint : t.colors.secondaryLabel} weight={selected ? 'bold' : 'semibold'} />
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: t.colors.tintFill, borderColor: t.colors.cell }]}>
          <Text style={[t.type.caption2, { color: t.colors.onTint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 2, paddingTop: 8, paddingHorizontal: 4 },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 54, justifyContent: 'center' },
  // Small enough that the longest label (Groceries) keeps clear space on each side, even on an SE.
  label: { fontSize: 11, lineHeight: 14, fontWeight: 'normal', letterSpacing: 0.1 },
  pill: { width: 54, height: 32, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: 2, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
