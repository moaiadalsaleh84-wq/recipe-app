/** Every fox pose side by side (to check the art). Only enabled with EXPO_PUBLIC_DEV_ROUTES=1. */
import { ScrollView, View } from 'react-native';
import { Fox, FoxSays } from '../components/mascot/Fox';
import { FOX_POSES } from '../components/mascot/foxPoses';
import { Text } from '../components/Text';
import { useTheme } from '../theme';

export default function DevFox() {
  const t = useTheme();
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60, gap: 16, backgroundColor: t.colors.background }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {FOX_POSES.map((p) => (
          <View key={p} style={{ alignItems: 'center', width: 104 }}>
            <Fox pose={p} size={96} />
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{p}</Text>
          </View>
        ))}
      </View>
      <FoxSays pose="happy" text="Dinner idea ready!" />
      <FoxSays pose="cheer" text="You’re on a 3-day roll. Keep it going tonight?" />
    </ScrollView>
  );
}
