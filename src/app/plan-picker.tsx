import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, PixelRatio, StyleSheet, View, type ListRenderItem } from 'react-native';
import { Text } from '../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { RecipeRow } from '../components/RecipeCard';
import { Fox } from '../components/mascot/Fox';
import { useToast } from '../components/Toast';
import { SearchField, Separator, TextButton } from '../components/ui';
import { meals, type Meal, type Recipe } from '../data/mock';
import { isIOS } from '../navigation/screenOptions';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { weekDays } from '../lib/week';

/** Sheet for choosing a recipe for one meal slot. */
export default function PlanPicker() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setMeal, allRecipes } = useStore();
  const params = useLocalSearchParams<{ day: string; meal: string }>();
  const day = Math.min(6, Math.max(0, Number(params.day) || 0));
  const meal: Meal = meals.includes(params.meal as Meal) ? (params.meal as Meal) : 'Dinner';
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = allRecipes.filter((r) => !q || r.title.toLowerCase().includes(q));
  const suggested = matches.filter((r) => r.category === meal);
  const others = matches.filter((r) => r.category !== meal);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  const choose = (r: Recipe) => {
    setMeal(day, meal, r.id);
    close();
    toast({ message: `${r.title} added to ${weekDays[day].long}`, icon: 'calendar' });
  };

  // One virtualized list: a title row, then that group's recipes, each row a fixed height (so the
  // list knows where everything is without measuring, and only renders what's on screen).
  const items = useMemo<Item[]>(() => {
    const group = (title: string, list: Recipe[]): Item[] => (list.length ? [{ kind: 'title', key: `t-${title}`, title }, ...list.map((r, i) => ({ kind: 'row' as const, key: r.id, recipe: r, first: i === 0, last: i === list.length - 1 }))] : []);
    return [...group(`${meal} recipes`, suggested), ...group(suggested.length ? 'Other recipes' : 'All recipes', others)];
  }, [meal, suggested, others]);
  const offsets = useMemo(() => {
    let y = 0;
    return items.map((it) => {
      const at = { offset: y, length: it.kind === 'title' ? TITLE_H : ROW_H };
      y += at.length;
      return at;
    });
  }, [items]);
  // Exact at the default text size; with larger text, rows grow and the list measures them itself.
  const fixedSizes = PixelRatio.getFontScale() <= 1;
  const getItemLayout = useCallback((_: ArrayLike<Item> | null | undefined, index: number) => ({ ...offsets[index], index }), [offsets]);
  const renderItem: ListRenderItem<Item> = ({ item }) =>
    item.kind === 'title' ? (
      <View style={[styles.title, fixedSizes && { height: TITLE_H }]}>
        <Text style={[t.type.title2, { color: t.colors.label }]} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
    ) : (
      <View style={[styles.cell, { backgroundColor: t.colors.cell, borderColor: t.colors.border }, item.first && styles.cellFirst, item.last && styles.cellLast, fixedSizes && { height: ROW_H }]}>
        {!item.first && <Separator inset={84} />}
        <RecipeRow recipe={item.recipe} onPress={() => choose(item.recipe)} accessibilityHint={`Adds it to ${meal.toLowerCase()} on ${weekDays[day].long}`} />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <View style={[styles.header, { paddingTop: isIOS ? 14 : insets.top + 8, borderBottomColor: t.colors.separator }]}>
        <PressableScale onPress={close} style={styles.cancel} accessibilityLabel="Cancel">
          <Text style={[t.type.body, { color: t.colors.tint }]}>Cancel</Text>
        </PressableScale>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={[t.type.headline, { color: t.colors.label }]} accessibilityRole="header">
            Add {meal}
          </Text>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{weekDays[day].full}</Text>
        </View>
        <View style={styles.cancel} />
      </View>

      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes" />
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(it) => it.key}
        getItemLayout={fixedSizes ? getItemLayout : undefined}
        removeClippedSubviews
        initialNumToRender={10}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 8, marginTop: 24 }}>
            <Fox pose="oops" size={88} />
            <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>No recipes match “{query.trim()}”.</Text>
            {/* Never a dead end: one tap back to every recipe. */}
            <TextButton label="Clear search" onPress={() => setQuery('')} testID="picker-clear" />
          </View>
        }
      />
    </View>
  );
}

type Item = { kind: 'title'; key: string; title: string } | { kind: 'row'; key: string; recipe: Recipe; first: boolean; last: boolean };
/** Fixed heights: a group title (with the space above it) and a recipe row (84 + its 2pt borders). */
const TITLE_H = 56;
const ROW_H = 86;

const styles = StyleSheet.create({
  search: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { justifyContent: 'flex-end', paddingBottom: 10, minHeight: TITLE_H },
  // The group's rows read as one card: side borders on every row, rounded top and bottom ends.
  cell: { borderLeftWidth: 2, borderRightWidth: 2, overflow: 'hidden', justifyContent: 'center' },
  cellFirst: { borderTopWidth: 2, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cellLast: { borderBottomWidth: 2, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cancel: { minWidth: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  titleWrap: { flex: 1, alignItems: 'center' },
});
