import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroceries } from '../../state/GroceryContext';
import { colors, fonts, radius, shadow } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={22} color={focused ? colors.white : colors.inkMuted} />
    </View>
  );
}

export default function TabsLayout() {
  const { items } = useGroceries();
  const insets = useSafeAreaInsets();
  const remaining = items.filter((i) => !i.checked).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { height: 78 + insets.bottom, paddingBottom: Math.max(insets.bottom, 10) }],
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Recipes', tabBarIcon: ({ focused }) => <TabIcon name="book" focused={focused} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Groceries',
          tabBarIcon: ({ focused }) => <TabIcon name="basket" focused={focused} />,
          tabBarBadge: remaining > 0 ? remaining : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 8,
    ...shadow.card,
  },
  item: { paddingVertical: 2 },
  label: { fontFamily: fonts.bold, fontSize: 12 },
  iconWrap: { width: 48, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primary },
  badge: { backgroundColor: colors.accent, color: colors.ink, fontFamily: fonts.bold, fontSize: 11 },
});
