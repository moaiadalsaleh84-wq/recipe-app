import { NativeTabs } from 'expo-router/native-tabs';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme';

/** Real UITabBar on iOS (Material bottom navigation on Android). Four tabs. */
export default function TabsLayout() {
  const t = useTheme();
  const { groceries } = useStore();
  const remaining = groceries.filter((g) => !g.checked).length;

  return (
    <NativeTabs tintColor={t.colors.tint} badgeBackgroundColor={t.colors.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(recipes)">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
        <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groceries">
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md="shopping_cart" />
        <NativeTabs.Trigger.Label>Groceries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={remaining === 0}>{String(remaining)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
