/**
 * Discover: every recipe the owner published. Search, then ONE row of chips: "Filters" (a bottom
 * sheet with cuisine, meal, ingredient and diet) and your three most-used filters. The grid starts
 * right below. With only a few recipes, a friendly card says more land every week.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { BottomSheet } from '../../../components/BottomSheet';
import { DiscoverCard } from '../../../components/DiscoverCard';
import { HorizontalList } from '../../../components/HorizontalList';
import { Icon } from '../../../components/Icon';
import { PopButton } from '../../../components/pop/PopButton';
import { TabScreen } from '../../../components/TabScreen';
import { Text } from '../../../components/Text';
import { Chip, EmptyState, SearchField, TextButton } from '../../../components/ui';
import { RecipeCardSkeleton } from '../../../components/RecipeCard';
import { CUISINES, DIETS, INGREDIENT_CHIPS, MEAL_TYPES, discoverList, type DiscoverCardData, type DiscoverFilters } from '../../../lib/discoverApi';
import { useTheme } from '../../../theme';
import { useRenderInStages } from '../../../lib/useRenderInStages';

type Key = Exclude<keyof DiscoverFilters, 'q'>;
type Quick = { key: Key; value: string; label: string };

/** Every filter as a chip, so the top row can show any three of them. */
const ALL: Quick[] = [
  ...MEAL_TYPES.map((m) => ({ key: 'mealType' as const, value: m.value, label: m.label })),
  ...INGREDIENT_CHIPS.map((i) => ({ key: 'ingredient' as const, value: i, label: i })),
  ...DIETS.map((d) => ({ key: 'diet' as const, value: d, label: d })),
  ...CUISINES.map((c) => ({ key: 'cuisine' as const, value: c, label: c })),
];
const id = (q: Pick<Quick, 'key' | 'value'>) => `${q.key}:${q.value}`;
/** Before you've used any: dinner, chicken and vegetarian. */
const DEFAULT_TOP = ['mealType:dinner', 'ingredient:Chicken', 'diet:Vegetarian'];
const USE_KEY = 'pantry-pop-discover-filter-use-v1';

export default function DiscoverScreen() {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const { width, height: screenH } = useWindowDimensions();
  const margin = t.layout.screen;
  const gap = t.layout.gap;
  const columns = width >= 700 ? 3 : 2;
  const cardWidth = Math.floor((Math.min(width, 900) - margin * 2 - gap * (columns - 1)) / columns);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [items, setItems] = useState<DiscoverCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const seq = useRef(0);
  const [retry, setRetry] = useState(0);

  // How often you use each filter (on this phone), so the top row shows your three favorites.
  const [uses, setUses] = useState<Record<string, number>>({});
  useEffect(() => {
    AsyncStorage.getItem(USE_KEY)
      .then((raw) => raw && setUses(JSON.parse(raw) as Record<string, number>))
      .catch(() => {});
  }, []);
  const top = Object.keys(uses).length
    ? [...ALL].sort((a, b) => (uses[id(b)] ?? 0) - (uses[id(a)] ?? 0) || DEFAULT_TOP.indexOf(id(b)) - DEFAULT_TOP.indexOf(id(a))).slice(0, 3)
    : DEFAULT_TOP.map((k) => ALL.find((a) => id(a) === k)!);

  // Search waits for a short pause in typing; filters apply at once.
  useEffect(() => {
    const n = ++seq.current;
    const timer = setTimeout(
      () => {
        discoverList({ ...filters, q: q.trim() || undefined }).then((res) => {
          if (n !== seq.current) return;
          if (res.ok) {
            setItems(res.items);
            setError(null);
          } else setError(res.message);
        });
      },
      q ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [q, filters, retry]);

  // The first cards render with the screen, the rest a frame later (taps never wait on them).
  const shown = useRenderInStages(items?.length ?? 0, 4);

  const toggle = (f: Pick<Quick, 'key' | 'value'>) => {
    const on = filters[f.key] === f.value;
    setFilters((cur) => ({ ...cur, [f.key]: on ? undefined : f.value }));
    if (!on) {
      const next = { ...uses, [id(f)]: (uses[id(f)] ?? 0) + 1 };
      setUses(next);
      AsyncStorage.setItem(USE_KEY, JSON.stringify(next)).catch(() => {});
    }
  };
  const active = (Object.keys(filters) as Key[]).filter((k) => k !== ('q' as never) && filters[k]).length;
  const filtered = !!q.trim() || active > 0;
  const clearAll = () => {
    setQ('');
    setFilters({});
  };

  const group = (title: string, chips: Quick[]) => (
    <View style={{ gap: 8 }}>
      <Text style={[t.type.headline, { color: t.colors.label }]}>{title}</Text>
      <View style={styles.wrap}>
        {chips.map((c) => (
          <Chip key={id(c)} label={c.label} selected={filters[c.key] === c.value} onPress={() => toggle(c)} />
        ))}
      </View>
    </View>
  );

  return (
    <>
      <TabScreen title="Discover" kicker="New recipes from creators" maxWidth={900} scrollToTopTab="discover" contentContainerStyle={{ gap: 12 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <SearchField value={q} onChangeText={setQ} placeholder="What would you like to cook?" returnKeyType="search" accessibilityLabel="Search Discover" testID="discover-search" />

        {/* One row: Filters (with how many are on), then your three most-used filters. */}
        <HorizontalList gap={8} contentStyle={{ paddingHorizontal: 16 }}>
          <Chip label={active ? `Filters · ${active}` : 'Filters'} icon="sliders" toggle={false} selected={active > 0} onPress={() => setSheetOpen(true)} accessibilityLabel={active ? `Filters, ${active} on` : 'Filters'} />
          {top.map((c) => (
            <Chip key={id(c)} label={c.label} selected={filters[c.key] === c.value} onPress={() => toggle(c)} />
          ))}
        </HorizontalList>

        {error && !items ? (
          <EmptyState icon="info" title="Couldn’t load Discover" message={error} action={{ label: 'Try again', onPress: () => setRetry((n) => n + 1) }} />
        ) : !items ? (
          // Loading: shimmering stand-ins shaped like the cards (photo, title, one line).
          <View style={[styles.grid, { columnGap: gap, rowGap: 20 }]} testID="discover-loading">
            {[0, 1, 2, 3].map((k) => (
              <RecipeCardSkeleton key={k} width={cardWidth} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="search"
            title={filtered ? 'No matches yet' : 'Nothing here yet'}
            message={filtered ? 'Try fewer words or another dish.' : 'New recipes land here every week.'}
            action={filtered ? { label: 'Clear filters', onPress: clearAll } : { label: 'Browse my recipes', onPress: () => router.navigate('/') }}
          />
        ) : (
          <>
            {/* The cards fade in over the loading boxes once (one entrance for the whole grid). */}
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} style={[styles.grid, { columnGap: gap, rowGap: 20 }]} testID="discover-grid">
              {items.slice(0, shown).map((c) => (
                <DiscoverCard key={c.id} card={c} width={cardWidth} />
              ))}
            </Animated.View>
            {/* Only a few so far: say more are coming, instead of an empty-looking page. */}
            {items.length < 4 && !filtered && (
              <View style={[styles.soon, { backgroundColor: t.pop.skyTint }]} testID="discover-soon">
                <Icon name="sparkles" size={20} color={t.pop.ink} weight="bold" />
                <Text style={[t.type.headline, { color: t.colors.label, flex: 1 }]}>New recipes land here every week</Text>
              </View>
            )}
          </>
        )}
      </TabScreen>

      {/* All the filters, in a sheet: cuisine, meal, ingredient, diet. */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} accessibilityLabel="Filters">
        {(close) => (
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]}>Filters</Text>
            {active > 0 && <TextButton label="Clear all" small onPress={() => setFilters({})} />}
          </View>
          {/* The chips scroll inside the sheet; the title and the button stay put. */}
          <ScrollView style={{ maxHeight: Math.round(screenH * 0.58) }} contentContainerStyle={{ gap: 20, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
            {group('Meal', ALL.filter((a) => a.key === 'mealType'))}
            {group('With', ALL.filter((a) => a.key === 'ingredient'))}
            {group('Diet', ALL.filter((a) => a.key === 'diet'))}
            {group('Cuisine', ALL.filter((a) => a.key === 'cuisine'))}
          </ScrollView>
          <PopButton label={items ? `Show ${items.length} ${items.length === 1 ? 'recipe' : 'recipes'}` : 'Show recipes'} onPress={close} style={{ marginTop: 8 }} testID="filters-done" />
        </View>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderCurve: 'continuous', marginTop: 8 },
  sheet: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
});
