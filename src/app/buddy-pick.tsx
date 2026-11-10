import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CatSays } from '../components/cats/CatSays';
import { buddyInfo, type Line } from '../components/cats/dialogue';
import { PageHeader } from '../components/PageHeader';
import { RecipePhoto } from '../components/RecipeCard';
import { Button } from '../components/ui';
import { matchesFilter, type Recipe } from '../data/mock';
import { haptics } from '../lib/haptics';
import { isIOS } from '../navigation/screenOptions';
import { useBuddy, useStore } from '../state/store';
import { useTheme } from '../theme';

/** "Can't decide?" The buddy shuffles through recipes and lands on one. */
export default function BuddyPick() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const buddy = useBuddy();
  const { allRecipes, profile, category, tags } = useStore();

  // Respect the diet from onboarding and any filters that are on.
  const pool = useMemo(() => {
    const fits = allRecipes.filter(
      (r) => profile.diets.every((d) => matchesFilter(r, d)) && (!category || r.category === category) && tags.every((tag) => matchesFilter(r, tag)),
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
    ? { text: buddy === 'tank' ? 'Let me scout the playbook…' : 'Ooh, let me sniff around the kitchen…', mood: 'think' }
    : buddy === 'tank'
      ? { text: `${recipe.title}. ${recipe.nutrition.protein} g protein. That’s the call, ${profile.name.trim().split(/\s+/)[0] || 'champ'}.`, mood: 'flex' }
      : { text: `Tonight: ${recipe.title}! I can already smell it. Mmm!`, mood: 'celebrate' };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader title={`Let ${buddyInfo[buddy].name} pick`} mode="cancel" inSheet={isIOS} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]} accessibilityLiveRegion="polite" accessibilityLabel={rolling ? 'Shuffling recipes' : `Picked: ${recipe.title}`}>
          <Animated.View key={`${round}-${index}-${rolling}`} entering={FadeIn.duration(rolling ? 60 : 220)} style={styles.photo}>
            <RecipePhoto recipe={recipe} iconSize={48} />
          </Animated.View>
          <View style={{ padding: 14, gap: 2 }}>
            <Text style={[t.type.title3, { color: t.colors.label }]} numberOfLines={1} testID="pick-title">
              {recipe.title}
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
              {recipe.minutes} min · {buddy === 'tank' ? `${recipe.nutrition.protein} g protein` : `${recipe.calories} kcal`}
            </Text>
          </View>
        </View>

        <CatSays buddy={buddy} line={line} size={110} style={{ marginTop: 18 }} />

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
