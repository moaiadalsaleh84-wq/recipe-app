import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Mascot } from '../components/mascot/Mascot';
import { MOODS, type Mood } from '../components/mascot/moods';
import { AskNotifications } from '../state/timers';
import { useTheme } from '../theme';

/**
 * Dev tool, not part of the app: draws Biscuit on a plain page.
 *   /dev-cat?mood=happy          one big Biscuit, holding the pose (add &live=1 to let it act and relax)
 *   /dev-cat?view=grid           every mood at once (add &size=44 for small sizes)
 *   /dev-cat?view=ask            the notification prompt
 * Only enabled in builds made with EXPO_PUBLIC_DEV_ROUTES=1.
 */
export default function DevCat() {
  const t = useTheme();
  const { mood = 'happy', view, live, size, bg } = useLocalSearchParams<{ mood?: Mood; view?: string; live?: string; size?: string; bg?: string }>();
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  // The notification permission prompt, to check its design (it can't open on the web).
  if (view === 'ask') return <AskNotifications open onAnswer={() => {}} />;
  const background = bg === 'white' ? '#FFFFFF' : t.colors.background;
  if (view === 'grid') {
    const s = Number(size) || 112;
    return (
      <View testID="cat" style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: background, padding: 8, gap: 4, width: 390 }}>
        {MOODS.map((m) => (
          <View key={m} style={{ alignItems: 'center', width: Math.max(s, 60) + 8 }}>
            <Mascot mood={m} size={s} petable={false} hold={live !== '1'} />
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{m}</Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', backgroundColor: background, paddingTop: 20 }}>
      <View testID="cat" style={{ width: 360, height: 360, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}>
        <Mascot mood={mood} size={340} petable={false} hold={live !== '1'} />
      </View>
    </View>
  );
}
