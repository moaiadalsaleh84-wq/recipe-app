/**
 * "Add to your list": a sheet where you pick what to buy before anything goes on the shopping list.
 * Opened from a recipe's basket button (`?recipe=<id>&servings=<n>`) or from "Shop the week" on the
 * Plan tab (`?week=1`). Every ingredient starts ticked; untick what you already have or don't
 * need, then "Add 8 items". Nothing is added until you tap it.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar } from '../components/BottomBar';
import { PopButton } from '../components/pop/PopButton';
import { PressableScale } from '../components/PressableScale';
import { Text } from '../components/Text';
import { useToast } from '../components/Toast';
import { CheckCircle, EmptyState, Section, Separator, TextButton } from '../components/ui';
import { meals, type Ingredient, type Recipe } from '../data/mock';
import { slotKey, weekId } from '../lib/groceries';
import { haptics } from '../lib/haptics';
import { amountFor } from '../lib/scale';
import { isIOS } from '../navigation/screenOptions';
import { useStore } from '../state/store';
import { useTheme } from '../theme';

/** One recipe's part of the sheet: which recipe, how many servings, and its ingredients. */
type Group = { recipe: Recipe; servings: number };

const keyOf = (recipeId: string, ingredientId: string) => `${recipeId}|${ingredientId}`;

export default function AddToList() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { getRecipe, plan, planAdded, units, addIngredients, addWeekToGroceries } = useStore();
  const params = useLocalSearchParams<{ recipe?: string; servings?: string; week?: string }>();
  const week = params.week === '1';

  // The recipes in this sheet: one recipe, or every planned meal not yet added this week.
  const groups = useMemo<Group[]>(() => {
    if (!week) {
      const r = params.recipe ? getRecipe(params.recipe) : undefined;
      return r ? [{ recipe: r, servings: Math.max(1, Number(params.servings) || r.servings) }] : [];
    }
    const done = new Set(planAdded ?? []);
    const id = weekId();
    const out: Group[] = [];
    for (const [day, slots] of Object.entries(plan)) {
      for (const meal of meals) {
        const rid = slots?.[meal];
        if (!rid || done.has(slotKey(id, day, meal, rid))) continue;
        const r = getRecipe(rid);
        if (r && !out.some((g) => g.recipe.id === r.id)) out.push({ recipe: r, servings: r.servings });
      }
    }
    return out;
    // Worked out once when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Everything starts ticked: untick what you already have.
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(groups.flatMap((g) => g.recipe.ingredients.map((i) => keyOf(g.recipe.id, i.id)))));
  const total = groups.reduce((n, g) => n + g.recipe.ingredients.length, 0);
  const count = ticked.size;

  const toggle = (k: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const allOn = count === total;
  const setAll = (on: boolean) => setTicked(on ? new Set(groups.flatMap((g) => g.recipe.ingredients.map((i) => keyOf(g.recipe.id, i.id)))) : new Set());

  // One recipe: "Butter Chicken · 4 servings". The week: "This week · 3 meals".
  const subtitle = week
    ? groups.length
      ? `This week · ${groups.length} ${groups.length === 1 ? 'meal' : 'meals'}`
      : ''
    : groups[0]
      ? `${groups[0].recipe.title} · ${groups[0].servings} ${groups[0].servings === 1 ? 'serving' : 'servings'}`
      : '';

  const close = () => (router.canGoBack() ? router.back() : router.replace('/groceries'));

  const add = () => {
    if (week) {
      addWeekToGroceries((recipeId, ing) => ticked.has(keyOf(recipeId, ing.id)));
    } else {
      for (const g of groups) {
        const chosen = g.recipe.ingredients.filter((i) => ticked.has(keyOf(g.recipe.id, i.id)));
        if (chosen.length) addIngredients(g.recipe.id, chosen, g.servings / g.recipe.servings);
      }
    }
    haptics.success();
    close();
    toast({ message: `Added ${count} ${count === 1 ? 'item' : 'items'} to your list`, icon: 'cart', action: { label: 'View', onPress: () => router.navigate('/groceries') } });
  };

  const row = (g: Group, i: Ingredient, index: number) => {
    const k = keyOf(g.recipe.id, i.id);
    const on = ticked.has(k);
    const shown = amountFor(i, g.servings, g.recipe.servings, units);
    return (
      <View key={k}>
        {index > 0 && <Separator inset={56} />}
        <PressableScale
          onPress={() => toggle(k)}
          haptic="select"
          scaleTo={0.98}
          accessibilityRole="checkbox"
          aria-checked={on}
          accessibilityLabel={`${i.name}${shown.text ? `, ${shown.text}` : ''}`}
          style={styles.row}
        >
          <CheckCircle checked={on} color={t.pop.leaf} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[t.type.body, { color: on ? t.colors.label : t.colors.secondaryLabel }]}>{i.name}</Text>
          </View>
          {!!shown.text && <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]}>{shown.text}</Text>}
        </PressableScale>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      {/* Our own grab handle (the system one floated over the header), then one 44pt row: Cancel,
          the title, All/None. The recipe name sits on its own muted line under it. */}
      <View style={[styles.top, { paddingTop: isIOS ? 8 : insets.top + 8, borderBottomColor: t.colors.separator }]}>
        <View style={[styles.handle, { backgroundColor: t.colors.border }]} />
        <View style={styles.header}>
          <PressableScale onPress={close} style={styles.side} accessibilityLabel="Cancel">
            <Text style={[t.type.body, { color: t.colors.tint }]} numberOfLines={1}>
              Cancel
            </Text>
          </PressableScale>
          <Text style={[t.type.headline, styles.title, { color: t.colors.label }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Add to your list
          </Text>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>
            {total > 0 && <TextButton label={allOn ? 'None' : 'All'} small onPress={() => setAll(!allOn)} accessibilityLabel={allOn ? 'Untick everything' : 'Tick everything'} />}
          </View>
        </View>
        {!!subtitle && (
          <Text style={[t.type.footnote, styles.subtitle, { color: t.colors.secondaryLabel }]} numberOfLines={1} testID="add-to-list-subtitle">
            {subtitle}
          </Text>
        )}
      </View>

      {groups.length === 0 ? (
        <EmptyState icon="cart" fox="happy" title="Nothing new to add" message={week ? 'This week’s meals are already on your list.' : 'This recipe has no ingredients yet.'} action={{ label: 'Close', onPress: close }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]}>
          {groups.map((g) => (
            <Section key={g.recipe.id} title={week ? g.recipe.title : undefined} footer={week ? undefined : 'Untick what you already have.'}>
              {g.recipe.ingredients.map((i, index) => row(g, i, index))}
            </Section>
          ))}
        </ScrollView>
      )}

      {groups.length > 0 && (
        <BottomBar color={t.colors.groupedBackground} border>
          <PopButton
            label={count ? `Add ${count} ${count === 1 ? 'item' : 'items'}` : 'Pick what you need'}
            icon="cartAdd"
            onPress={add}
            disabled={!count}
            style={{ flex: 1 }}
            testID="add-to-list-confirm"
          />
        </BottomBar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 6 },
  // Cancel and All/None get equal widths, so the title is truly centred and never runs into them.
  header: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 8 },
  side: { width: 84, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { flex: 1, textAlign: 'center' },
  subtitle: { textAlign: 'center', paddingHorizontal: 24 },
  content: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 16, paddingVertical: 8 },
});
