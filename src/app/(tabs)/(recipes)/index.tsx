import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { FeaturedCard, RecipeCard, RecipeCardSkeleton } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, SearchField, Skeleton } from '../../../components/ui';
import { categories, filterTags, getRecipe, matchesFilter, recipes } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { ScreenTitle, isIOS } from '../../../navigation/screenOptions';
import { useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

export default function RecipesScreen() {
  const t = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, clearFilters, plan } = useStore();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Mock network load so the skeletons have something to stand in for.
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 900);
    return () => {
      clearTimeout(id);
      clearTimeout(refreshTimer.current);
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshTimer.current = setTimeout(() => {
      setRefreshing(false);
      toast({ message: 'Recipes are up to date', tone: 'info', icon: 'sparkles' });
    }, 1100);
  }, [toast]);

  // iOS: the native search bar lives in the navigation bar.
  useLayoutEffect(() => {
    if (!isIOS) return;
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search recipes or ingredients',
        onChangeText: (e: { nativeEvent: { text: string } }) => setQuery(e.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
        hideWhenScrolling: false,
        tintColor: t.colors.tint,
      },
    });
  }, [navigation, t.colors.tint]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      recipes.filter(
        (r) =>
          (!category || r.category === category) &&
          tags.every((tag) => matchesFilter(r, tag)) &&
          (!q ||
            r.title.toLowerCase().includes(q) ||
            r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
      ),
    [category, tags, q],
  );

  const hasFilters = !!category || tags.length > 0;
  const showFeatured = !hasFilters && !q;
  const tonight = getRecipe(plan[todayIndex]?.Dinner);
  const featured = tonight ?? recipes[1];

  const margin = t.spacing.md;
  const contentWidth = Math.min(width, 900);
  const columns = contentWidth >= 700 ? 3 : 2;
  const gap = t.spacing.md;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);

  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={[styles.content, { paddingHorizontal: margin, maxWidth: 900 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.tint} colors={[t.colors.tint]} />}
    >
      <ScreenTitle title="Recipes" />
      {!isIOS && (
        <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes or ingredients" style={{ marginBottom: t.spacing.sm }} />
      )}

      {/* Filters: one category at a time, any number of tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -margin }}
        contentContainerStyle={[styles.chips, { paddingHorizontal: margin }]}
        accessibilityLabel="Filters"
      >
        {hasFilters && (
          <Chip
            label="Clear"
            icon="close"
            selected={false}
            onPress={() => {
              clearFilters();
              toast({ message: 'Filters cleared', tone: 'info' });
            }}
          />
        )}
        {categories.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
        ))}
        <View style={[styles.chipDivider, { backgroundColor: t.colors.separator }]} />
        {filterTags.map((tag) => (
          <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
        ))}
      </ScrollView>

      {loading ? (
        <View accessibilityLabel="Loading recipes">
          <Skeleton style={[styles.featuredSkeleton, { borderRadius: t.radius.xl }]} />
          <Skeleton style={{ height: 22, width: 140, marginTop: t.spacing.xl, marginBottom: t.spacing.sm }} />
          <View style={[styles.grid, { gap }]}>
            {Array.from({ length: columns * 2 }).map((_, i) => (
              <RecipeCardSkeleton key={i} width={cardWidth} />
            ))}
          </View>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(250)}>
          {showFeatured && (
            <View style={{ marginTop: t.spacing.xs }}>
              <FeaturedCard recipe={featured} eyebrow={tonight ? 'On the menu tonight' : 'Recipe of the day'} />
            </View>
          )}

          <View style={styles.listHeader}>
            <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
              {q ? 'Results' : hasFilters ? 'Filtered' : 'All Recipes'}
            </Text>
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="result-count">
              {countLabel}
            </Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No Recipes Found"
              message={q ? `Nothing matches “${query.trim()}”. Try another search or fewer filters.` : 'No recipes match all of these filters.'}
              action={{
                label: 'Clear Search & Filters',
                icon: 'close',
                onPress: () => {
                  haptics.tap();
                  clearFilters();
                  setQuery('');
                },
              }}
            />
          ) : (
            <View style={[styles.grid, { gap, rowGap: t.spacing.xl }]}>
              {filtered.map((r) => (
                <Animated.View key={r.id} layout={LinearTransition.duration(220)} entering={FadeIn.duration(200)}>
                  <RecipeCard recipe={r} width={cardWidth} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, width: '100%', alignSelf: 'center' },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center', minHeight: 44 },
  chipDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 4 },
  featuredSkeleton: { height: 300, marginTop: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
