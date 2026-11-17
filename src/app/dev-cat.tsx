import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Mascot } from '../components/mascot/Mascot';
import { EXPRESSIONS, MOODS, type Mood } from '../components/mascot/moods';
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
  const { mood = 'happy', view, live, size, bg, sil } = useLocalSearchParams<{ mood?: Mood; view?: string; live?: string; size?: string; bg?: string; sil?: string }>();
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  // The notification permission prompt, to check its design (it can't open on the web).
  if (view === 'ask') return <AskNotifications open onAnswer={() => {}} />;
  const background = bg === 'white' ? '#FFFFFF' : t.colors.background;
  if (view === 'grid' || view === 'sheet') {
    const s = Number(size) || 112;
    const list = view === 'sheet' ? EXPRESSIONS : MOODS;
    return (
      <View testID="cat" style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: background, padding: 8, rowGap: 28, columnGap: 4, width: s >= 200 ? 780 : s >= 112 ? 600 : 390 }}>
        {list.map((m) => (
          <View key={m} style={{ alignItems: 'center', width: Math.max(s, 60) + 8 }}>
            <Mascot mood={m} size={s} petable={false} hold={live !== '1'} silhouette={sil === '1'} />
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{m}</Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', backgroundColor: background, paddingTop: 20 }}>
      <View testID="cat" style={{ width: 360, height: 360, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}>
        <Mascot mood={mood} size={340} petable={false} hold={live !== '1'} silhouette={sil === '1'} />
      </View>
    </View>
  );
}
