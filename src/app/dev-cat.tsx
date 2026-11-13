import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { CatBuddy } from '../components/cats/CatBuddy';
import type { BuddyId, Mood } from '../components/cats/types';
import { AskNotifications } from '../state/timers';

/**
 * Dev tool, not part of the app: draws one cat on a transparent page so
 * the Live Activity face images can be saved from it (assets/live-activity), and shows
 * the notification prompt with ?view=ask.
 * Only enabled in builds made with EXPO_PUBLIC_DEV_ROUTES=1.
 */
export default function DevCat() {
  const { buddy = 'tank', mood = 'happy', view, live } = useLocalSearchParams<{ buddy?: BuddyId; mood?: Mood; view?: string; live?: string }>();
  if (process.env.EXPO_PUBLIC_DEV_ROUTES !== '1') return null;
  // The notification permission prompt, to check its design (it can't open on the web).
  if (view === 'ask') return <AskNotifications open onAnswer={() => {}} />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', backgroundColor: 'transparent', paddingTop: 20 }}>
      <View testID="cat" style={{ width: 360, height: 360, alignItems: 'center', justifyContent: 'center' }}>
        <CatBuddy buddy={buddy} mood={mood} size={340} petable={false} hold={live !== '1'} />
      </View>
    </View>
  );
}
