import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { CatSays } from '../../../components/cats/CatSays';
import { greetingSituation, say } from '../../../components/cats/dialogue';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { FeaturedCard, RecipeCard, RecipeCardSkeleton, RecipePhoto } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, IconButton, SearchField, Skeleton } from '../../../components/ui';
import { FAVORITES_ID, categories, filterTags, matchesFilter, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { showPaywall, useProGate } from '../../../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { ScreenTitle, isIOS } from '../../../navigation/screenOptions';
import { useBuddy, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0

export default function RecipesScreen() {
  const t = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const buddy = useBuddy();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, clearFilters, plan, allRecipes, getRecipe, favorites, cookbooks, profile } = useStore();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tip, setTip] = useState(-1); // -1 = greeting, then cycles tips
  const [petLine, setPetLine] = useState<ReturnType<typeof say> | null>(null);
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
      setTip((n) => n + 1);
      toast({ message: 'Recipes are up to date', tone: 'info', icon: 'checkCircle' });
    }, 1100);
  }, [toast]);

  const { canAddRecipe, canAddCookbook, trialDaysLeft } = useProGate();
  const [reminderHidden, setReminderHidden] = useState(false);
  // Keeps the paywall's promise: a reminder in the app before the trial ends.
  const showTrialReminder = !reminderHidden && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 2;
  const addButton = useMemo(
    () => (
      <IconButton
        icon="plus"
        accessibilityLabel="Add your own recipe"
        iconSize={20}
        onPress={() => (canAddRecipe ? router.push('/recipe/new') : showPaywall('recipes'))}
      />
    ),
    [canAddRecipe],
  );

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
      allRecipes.filter(
        (r) =>
          (!category || r.category === category) &&
          tags.every((tag) => matchesFilter(r, tag)) &&
          (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
      ),
    [allRecipes, category, tags, q],
  );

  const hasFilters = !!category || tags.length > 0;
  const showExtras = !hasFilters && !q;
  const tonight = getRecipe(plan[todayIndex]?.Dinner);
  const featured = tonight ?? allRecipes.find((r) => r.id === 'masala-dosa') ?? allRecipes[0];
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  const line = tip < 0 ? say(buddy, greetingSituation(), { name: firstName }) : say(buddy, 'tip', {}, tip);

  const margin = t.spacing.md;
  const contentWidth = Math.min(width, 900);
  const columns = contentWidth >= 700 ? 3 : 2;
  const gap = t.spacing.md;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  const books = [
    { id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites },
    ...cookbooks,
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={[styles.content, { paddingHorizontal: margin, maxWidth: 900 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.tint} colors={[t.colors.tint]} />}
    >
      <ScreenTitle title="Recipes" right={addButton} />

      {showTrialReminder && (
        <View style={[styles.reminder, { backgroundColor: t.colors.cell, borderColor: t.colors.warning }]} accessibilityRole="alert">
          <Icon name="crown" size={18} color={t.colors.warning} />
          <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]} testID="trial-reminder">
            Your free trial ends {trialDaysLeft === 0 ? 'today' : `in ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'}`}. Keep Pro, or cancel anytime before then.
          </Text>
          <PressableScale
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }))}
            accessibilityLabel="Manage subscription"
            style={styles.reminderBtn}
          >
            <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700' }]}>Manage</Text>
          </PressableScale>
          <IconButton icon="close" accessibilityLabel="Dismiss trial reminder" iconSize={13} color={t.colors.secondaryLabel} onPress={() => setReminderHidden(true)} />
        </View>
      )}

      {showExtras && (
        <>
          <CatSays
            buddy={buddy}
            line={petLine ?? line}
            size={112}
            hint="Tap for a tip"
            onNext={() => {
              setPetLine(null);
              setTip((n) => n + 1);
            }}
            onPet={() => setPetLine(say(buddy, 'pet', {}, tip + 1))}
            style={{ marginBottom: t.spacing.sm }}
          />
          <PressableScale
            onPress={() => router.push('/buddy-pick')}
            accessibilityLabel={`Can't decide? Let ${buddy === 'tank' ? 'Tank' : 'Biscuit'} pick`}
            style={[styles.pickBtn, { backgroundColor: t.colors.cell, ...t.chunky.card }]}
          >
            <View style={[styles.pickIcon, { backgroundColor: t.colors.tintFill }]}>
              <Icon name="shuffle" size={18} color={t.colors.onTint} weight="bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>Can’t decide?</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>Let {buddy === 'tank' ? 'Tank' : 'Biscuit'} pick something for you</Text>
            </View>
            <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />
          </PressableScale>
        </>
      )}

      {!isIOS && (
        <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes or ingredients" style={{ marginBottom: t.spacing.sm }} />
      )}

      {/* Cookbooks */}
      {showExtras && (
        <>
          <View style={styles.rowHeader}>
            <Text style={[t.type.title3, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
              Cookbooks
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -margin }} contentContainerStyle={[styles.books, { paddingHorizontal: margin }]}>
            {books.map((b) => (
              <CookbookTile key={b.id} id={b.id} name={b.name} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
            ))}
            <PressableScale
              onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
              accessibilityLabel="New cookbook"
              style={[styles.book, styles.newBook, { borderColor: t.colors.border }]}
            >
              <Icon name="plus" size={22} color={t.colors.tint} weight="bold" />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700', fontFamily: t.fonts.rounded }]}>New cookbook</Text>
            </PressableScale>
          </ScrollView>
        </>
      )}

      {/* Filters: one category at a time, any number of tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -margin, marginTop: showExtras ? t.spacing.lg : 0 }}
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
          {showExtras && featured && (
            <View style={{ marginTop: t.spacing.md }}>
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
              cat={{ buddy, mood: 'think' }}
              title="No Recipes Found"
              message={say(buddy, 'noResults').text}
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

function CookbookTile({ id, name, recipes }: { id: string; name: string; recipes: Recipe[] }) {
  const t = useTheme();
  const covers = recipes.slice(0, 3);
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/cookbook/[id]', params: { id } })}
      accessibilityLabel={`${name} cookbook, ${recipes.length} recipes`}
      style={[styles.book, { backgroundColor: t.colors.cell, ...t.chunky.card }]}
    >
      <View style={[styles.covers, { backgroundColor: t.colors.imagePlaceholder }]}>
        {covers.length === 0 ? (
          <Icon name={id === FAVORITES_ID ? 'heart' : 'book'} size={26} color={t.colors.tertiaryLabel} />
        ) : (
          covers.map((r) => (
            <View key={r.id} style={styles.cover}>
              <RecipePhoto recipe={r} iconSize={16} />
            </View>
          ))
        )}
      </View>
      <View style={styles.bookText}>
        {id === FAVORITES_ID && <Icon name="heartFill" size={13} color={t.colors.accent} />}
        <Text style={[t.type.subhead, { color: t.colors.label, fontWeight: '700', fontFamily: t.fonts.rounded, flexShrink: 1 }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, paddingHorizontal: 10 }]}>
        {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, width: '100%', alignSelf: 'center' },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 2, paddingVertical: 6, borderRadius: 16, borderWidth: 2, marginBottom: 14, borderCurve: 'continuous' },
  reminderBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, marginBottom: 16, borderCurve: 'continuous' },
  pickIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  books: { gap: 12, paddingBottom: 6 },
  book: { width: 148, borderRadius: 18, borderCurve: 'continuous', paddingBottom: 10 },
  newBook: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 140 },
  covers: { height: 84, margin: 6, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  cover: { flex: 1, height: '100%' },
  bookText: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, marginTop: 2 },
  chips: { gap: 8, paddingVertical: 6, alignItems: 'center', minHeight: 48 },
  chipDivider: { width: 2, height: 22, marginHorizontal: 4, borderRadius: 1 },
  featuredSkeleton: { height: 300, marginTop: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
