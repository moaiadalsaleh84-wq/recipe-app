import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { TabBar } from '../../components/TabBar';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme';

/** Five tabs with the app's own tab bar (see components/TabBar). */
export default function TabsLayout() {
  const t = useTheme();
  // The same number as "X left to buy" on the list (one shared source).
  const { leftToBuy, onboarded } = useStore();

  // First launch: the welcome quiz.
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Tabs screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: t.colors.background } }} tabBar={(props) => <TabBar {...props} badges={{ groceries: leftToBuy }} />}>
        <Tabs.Screen name="(recipes)" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="pantry" />
        <Tabs.Screen name="groceries" />
        <Tabs.Screen name="progress" />
      </Tabs>
    </View>
  );
}
