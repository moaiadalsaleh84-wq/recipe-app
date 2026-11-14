import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { StatusBarShade, TabBar } from '../../components/TabBar';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme';

/** Five tabs with the app's own tab bar (see components/TabBar). */
export default function TabsLayout() {
  const t = useTheme();
  const { groceries, onboarded } = useStore();
  const remaining = groceries.filter((g) => !g.checked).length;

  // First launch: the welcome quiz.
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.colors.background } }} tabBar={(props) => <TabBar {...props} badges={{ groceries: remaining }} />}>
        <Tabs.Screen name="(recipes)" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="pantry" />
        <Tabs.Screen name="groceries" />
        <Tabs.Screen name="buddy" />
      </Tabs>
      <StatusBarShade />
    </View>
  );
}
