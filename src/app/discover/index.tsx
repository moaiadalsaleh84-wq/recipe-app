/**
 * Discover: every recipe the owner published, with search ("What would you like to cook?") and
 * filters (cuisine, meal type, ingredient, diet). Most saved this week first.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DiscoverCard } from '../../components/DiscoverCard';
import { PageHeader } from '../../components/PageHeader';
import { Text } from '../../components/Text';
import { Chip, EmptyState, SearchField, Skeleton } from '../../components/ui';
import { CUISINES, DIETS, INGREDIENT_CHIPS, MEAL_TYPES, discoverList, type DiscoverCardData, type DiscoverFilters } from '../../lib/discoverApi';
import { useTheme } from '../../theme';
import { HorizontalList } from '../../components/HorizontalList';

export default function DiscoverScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const margin = t.layout.screen;
  const gap = t.spacing.sm;
  const columns = width >= 700 ? 3 : 2;
  const cardWidth = Math.floor((Math.min(width, 900) - margin * 2 - gap * (columns - 1)) / columns);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [items, setItems] = useState<DiscoverCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const [retry, setRetry] = useState(0);

  // Search waits for a short pause in typing; filters apply at once.
  useEffect(() => {
    const n = ++seq.current;
    const id = setTimeout(
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
    return () => clearTimeout(id);
  }, [q, filters, retry]);

  const toggle = <K extends keyof DiscoverFilters>(key: K, value: DiscoverFilters[K]) => setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }));
  const filtered = !!q.trim() || Object.values(filters).some(Boolean);

  const chipRow = (label: string, chips: { label: string; selected: boolean; onPress: () => void }[]) => (
    <View style={{ gap: 6 }}>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontFamily: t.fonts.semibold }]}>{label}</Text>
      <HorizontalList gap={8}>
        {chips.map((c) => (
          <Chip key={c.label} label={c.label} selected={c.selected} onPress={c.onPress} />
        ))}
      </HorizontalList>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <PageHeader title="Discover" />
      <ScrollView contentContainerStyle={{ padding: margin, paddingBottom: 32, gap: 16 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <SearchField value={q} onChangeText={setQ} placeholder="What would you like to cook?" returnKeyType="search" accessibilityLabel="Search Discover" testID="discover-search" />
        {chipRow('Cuisine', CUISINES.map((c) => ({ label: c, selected: filters.cuisine === c, onPress: () => toggle('cuisine', c) })))}
        {chipRow('Meal', MEAL_TYPES.map((m) => ({ label: m.label, selected: filters.mealType === m.value, onPress: () => toggle('mealType', m.value) })))}
        {chipRow('With', INGREDIENT_CHIPS.map((i) => ({ label: i, selected: filters.ingredient === i, onPress: () => toggle('ingredient', i) })))}
        {chipRow('Diet', DIETS.map((d) => ({ label: d, selected: filters.diet === d, onPress: () => toggle('diet', d) })))}

        {error && !items ? (
          <EmptyState icon="info" title="Couldn’t load Discover" message={error} action={{ label: 'Try again', onPress: () => setRetry((n) => n + 1) }} />
        ) : !items ? (
          <View style={[styles.grid, { gap }]}>
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} style={{ width: cardWidth, height: cardWidth * 1.35, borderRadius: 24 }} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="search"
            title={filtered ? 'No matches yet' : 'Nothing here yet'}
            message={filtered ? 'Try fewer words or another dish.' : 'Fresh recipes are on their way.'}
            action={filtered ? { label: 'Clear filters', onPress: () => { setQ(''); setFilters({}); } } : { label: 'Back to recipes', onPress: () => (router.canGoBack() ? router.back() : router.replace('/')) }}
          />
        ) : (
          <View style={[styles.grid, { gap }]} testID="discover-grid">
            {items.map((c) => (
              <DiscoverCard key={c.id} card={c} width={cardWidth} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
});
