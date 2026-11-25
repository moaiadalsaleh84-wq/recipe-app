import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MascotSays } from '../components/mascot/MascotSays';
import type { Line } from '../components/mascot/lines';
import { PageHeader } from '../components/PageHeader';
import { PhotoFrame } from '../components/PhotoFrame';
import { Button } from '../components/ui';
import { matchesFilter, type Recipe } from '../data/mock';
import { fitsDiet } from '../lib/onboardingPicks';
import { haptics } from '../lib/haptics';
import { isIOS } from '../navigation/screenOptions';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { Lift } from '../components/pop/Lift';
import { nb, duration } from '../lib/text';

/** "Can't decide?" Biscuit shuffles through recipes and lands on one. */
export default function BuddyPick() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { allRecipes, profile, category, tags } = useStore();

  // Respect the diet from onboarding and any filters that are on.
  const pool = useMemo(() => {
    const fits = allRecipes.filter(
      (r) => fitsDiet(r, profile.diets) && (!category || r.category === category) && tags.every((tag) => matchesFilter(r, tag)),
    );
    return fits.length ? fits : allRecipes;
  }, [allRecipes, profile.diets, category, tags]);

  const [index, setIndex] = useState(0);
  const [rolling, setRolling] = useState(true);
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Fast at first, slowing down like a wheel, then land on a random pick.
    const final = Math.floor(Math.random() * pool.length);
    const ticks = 14 + Math.floor(Math.random() * 4);
    let k = 0;
    const step = () => {
      k += 1;
      haptics.select();
      setIndex((i) => (k >= ticks ? final : (i + 1) % pool.length));
      if (k >= ticks) {
        setRolling(false);
        haptics.success();
        return;
      }
      timer.current = setTimeout(step, 55 + k * k * 1.6);
    };
    timer.current = setTimeout(step, 120);
    return () => clearTimeout(timer.current);
  }, [pool, round]);

  const recipe: Recipe = pool[index % pool.length];
  const line: Line = rolling
    ? { text: 'Let me sniff around…', mood: 'thinking' }
    : { text: 'How about this one? Mmm!', mood: 'hungry' };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title="Pick for me" mode="cancel" inSheet={isIOS} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
        <Lift radius={24}>
          {/* Ink behind the photo, so its soft edges never show a light hairline (see PhotoFrame). */}
          <View style={[styles.card, { backgroundColor: t.pop.ink, ...t.chunky.card }]} accessibilityLiveRegion="polite" accessibilityLabel={rolling ? 'Shuffling recipes' : `Picked: ${recipe.title}`}>
            <Animated.View key={`${round}-${index}-${rolling}`} entering={FadeIn.duration(rolling ? 60 : 220)}>
              <PhotoFrame recipe={recipe} iconSize={48} radius={21.5} corners="top" edge="bottom" style={styles.photo} />
            </Animated.View>
            <View style={{ padding: 14, gap: 2, backgroundColor: t.colors.cell, borderBottomLeftRadius: 21.5, borderBottomRightRadius: 21.5 }}>
              <Text style={[t.type.title3, { color: t.colors.label }]} testID="pick-title">
                {recipe.title}
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                {duration(recipe.minutes)} · {nb(recipe.calories, 'kcal')}
              </Text>
            </View>
          </View>
        </Lift>

        <MascotSays line={line} size={110} style={{ marginTop: 18 }} />

        <View style={styles.actions}>
          <Button
            label="Pick again"
            icon="shuffle"
            variant="tinted"
            disabled={rolling}
            onPress={() => {
              setRolling(true);
              setRound((r) => r + 1);
            }}
            style={{ flex: 1 }}
          />
          <Button label="Cook this" icon="pot" disabled={rolling} onPress={() => router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } })} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { borderRadius: 24, overflow: 'hidden', borderCurve: 'continuous' },
  photo: { height: 230 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 'auto', paddingTop: 16 },
});
