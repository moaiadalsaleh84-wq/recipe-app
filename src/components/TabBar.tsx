import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

/** One entry per tab folder in src/app/(tabs). Labels are short so five fit in the floating bar. */
const tabs: Record<string, { label: string; long: string; icon: IconName }> = {
  '(recipes)': { label: 'Recipes', long: 'Recipes', icon: 'book' },
  plan: { label: 'Plan', long: 'Meal plan', icon: 'calendar' },
  pantry: { label: 'Pantry', long: 'Pantry', icon: 'fridge' },
  groceries: { label: 'List', long: 'Grocery list', icon: 'cart' },
  progress: { label: 'You', long: 'Your progress', icon: 'trophy' },
};

/** Height of the floating bar itself. */
const BAR_HEIGHT = 64;
/** How far the bar floats above the bottom edge (or the home indicator). */
const FLOAT = 10;

/** Room a scrolling tab screen leaves at the bottom so its last item isn't hidden behind the bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + FLOAT + Math.max(insets.bottom, 12) + 8;
}

/**
 * The app's tab bar: a floating white pill. The selected tab grows into a basil capsule with its
 * label; the others show an icon with a small label underneath.
 */
export function TabBar({ state, emitter, navigateToTab, badges = {} }: BottomTabBarProps & { badges?: Record<string, number> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) - 2 + FLOAT / 2 }]}>
      <View style={[styles.bar, { backgroundColor: t.colors.elevated, borderColor: t.colors.border }, t.shadow.floating]} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const tab = tabs[route.name];
          if (!tab) return null;
          const selected = state.index === i;
          const badge = badges[route.name] ?? 0;
          return (
            // The selected capsule takes the width its label needs; the other tabs share the rest.
            <Animated.View key={route.key} layout={LinearTransition.duration(220)} style={selected ? styles.activeSlot : styles.slot}>
              <PressableScale
                haptic="select"
                scaleTo={0.92}
                accessibilityRole="tab"
                aria-selected={selected}
                accessibilityLabel={badge ? `${tab.long}, ${badge} to buy` : tab.long}
                testID={`tab-${tab.label.toLowerCase()}`}
                onPress={() => {
                  const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!selected && !e.defaultPrevented) navigateToTab(route.key);
                }}
                style={styles.item}
              >
                {selected ? (
                  <View style={[styles.active, { backgroundColor: t.colors.tintFill }]}>
                    <TabIcon icon={tab.icon} selected badge={0} />
                    <Text style={[styles.activeLabel, { color: t.colors.onTint, fontFamily: t.fonts.bold }]} maxFontSizeMultiplier={1.15}>
                      {tab.label}
                    </Text>
                    {/* On the selected tab the count sits after the label, so it never covers it. */}
                    {badge > 0 && (
                      <View style={[styles.inlineBadge, { backgroundColor: t.colors.reward }]}>
                        <Text style={[t.type.caption2, { color: t.colors.onReward, fontFamily: t.fonts.extrabold }]}>{badge > 99 ? '99+' : badge}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <TabIcon icon={tab.icon} selected={false} badge={badge} />
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.label, { color: t.colors.secondaryLabel, fontFamily: t.fonts.semibold }]}>
                      {tab.label}
                    </Text>
                  </>
                )}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
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
    <Animated.View style={style}>
      <Icon name={icon} size={selected ? 20 : 22} color={selected ? t.colors.onTint : t.colors.secondaryLabel} weight={selected ? 'bold' : 'semibold'} />
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: t.colors.reward, borderColor: selected ? t.colors.tintFill : t.colors.elevated }]}>
          <Text style={[t.type.caption2, { color: t.colors.onReward, fontFamily: t.fonts.extrabold }]}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Floats over the screen; the screens leave room for it (useTabBarSpace).
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', height: BAR_HEIGHT, width: '100%', maxWidth: 520, borderRadius: BAR_HEIGHT / 2, borderWidth: 1, paddingHorizontal: 6, borderCurve: 'continuous' },
  slot: { flex: 1, minWidth: 0 },
  activeSlot: { flexShrink: 0, paddingHorizontal: 2 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  active: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 14, borderRadius: 24, borderCurve: 'continuous' },
  activeLabel: { fontSize: 14, lineHeight: 18 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
  inlineBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -7, right: -12, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
