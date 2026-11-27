import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { Easing, View } from 'react-native';
import { TabBar } from '../../components/TabBar';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme';

/** The tab cross-fade: 150 ms, ease-out (opacity only). */
const TAB_FADE = { animation: 'timing' as const, config: { duration: 150, easing: Easing.out(Easing.cubic) } };

/** Four tabs with the app's own tab bar (see components/TabBar). You opens from the avatar on Recipes. */
export default function TabsLayout() {
  const t = useTheme();
  // The same number as "X left to buy" on the list (one shared source).
  const { leftToBuy, onboarded } = useStore();

  // First launch: the welcome quiz.
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Switching tabs: the content cross-fades in 150 ms (ease-out); the tab bar's pill slides. */}
      <Tabs screenOptions={{ headerShown: false, animation: 'fade', transitionSpec: TAB_FADE, sceneStyle: { backgroundColor: t.colors.background } }} tabBar={(props) => <TabBar {...props} badges={{ groceries: leftToBuy }} />}>
        <Tabs.Screen name="(recipes)" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="groceries" />
        <Tabs.Screen name="discover" />
      </Tabs>
    </View>
  );
}
