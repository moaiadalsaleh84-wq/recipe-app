import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Icon, type IconName } from '../../../components/Icon';
import { Menu } from '../../../components/Menu';
import { PopCard, PopChip, PopIconButton } from '../../../components/pop';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { RecipeCard, RecipePhoto, TonightCard } from '../../../components/RecipeCard';
import { TabScreen } from '../../../components/TabScreen';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, IconButton, SearchField, SectionHeader } from '../../../components/ui';
import { FAVORITES_ID, QUICK_FILTER, categories, filterTags, matchesFilter, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { pantryMatch, recipesForMood, type Mood } from '../../../lib/moods';
import { showPaywall, useProGate } from '../../../lib/pro';
import { streakOf } from '../../../lib/progress';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { useStore } from '../../../state/store';
import { pop, useTheme } from '../../../theme';

const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
/** Days since 1970, so the recipe of the day really changes daily. */
const dayNumber = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

type Sort = 'suggested' | 'az' | 'quickest' | 'cooked';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'cooked', label: 'Recently cooked' },
  { value: 'quickest', label: 'Quickest first' },
  { value: 'az', label: 'A to Z' },
];

/** One recipe at random, not `avoid` (so "Surprise me" never shows the same one twice in a row). Runs on tap only. */
function randomRecipe(list: Recipe[], avoid: string | null): Recipe | undefined {
  const pool = list.filter((r) => r.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
}

/** The four mood tiles. "Surprise me" opens a random pick instead of filtering. */
const MOODS: { id: Mood | 'surprise'; label: string; hint: string; icon: IconName; color: string }[] = [
  { id: 'quick', label: 'Quick', hint: '30 minutes or less', icon: 'timer', color: pop.sunshine },
  { id: 'pantry', label: 'My pantry', hint: 'Uses what you have', icon: 'fridge', color: pop.leaf },
  { id: 'cozy', label: 'Cozy', hint: 'Comfort food', icon: 'pot', color: pop.sky },
  { id: 'surprise', label: 'Surprise me', hint: 'Opens a random recipe', icon: 'shuffle', color: pop.lilac },
];

export default function RecipesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, showOnlyTag, clearFilters, plan, allRecipes, getRecipe, favorites, cookbooks, cooked, profile, pantry } = useStore();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<Sort>('suggested');
  const [mood, setMood] = useState<Mood | null>(null);
  const lastSurprise = useRef<string | null>(null);
  const { canAddRecipe, canAddCookbook, canImport, trialDaysLeft } = useProGate();
  const [reminderHidden, setReminderHidden] = useState(false);
  // Keeps the paywall's promise: a reminder in the app before the trial ends.
  const showTrialReminder = !reminderHidden && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 2;

  const q = query.trim().toLowerCase();
  // Popular searches, shown while the empty search box is focused. Only words that find recipes.
  const [searchFocused, setSearchFocused] = useState(false);
  const popular = useMemo(
    () =>
      POPULAR_SEARCHES.filter((word) => {
        const w = word.toLowerCase();
        return allRecipes.some((r) => r.title.toLowerCase().includes(w) || r.ingredients.some((i) => i.name.toLowerCase().includes(w)));
      }).slice(0, 6),
    [allRecipes],
  );
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

  // When each recipe was last cooked (ISO dates sort as text).
  const lastCooked = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cooked) if ((m.get(c.recipeId) ?? '') < c.date) m.set(c.recipeId, c.date);
    return m;
  }, [cooked]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'quickest') list.sort((a, b) => a.minutes - b.minutes);
    if (sort === 'cooked') list.sort((a, b) => (lastCooked.get(b.id) ?? '').localeCompare(lastCooked.get(a.id) ?? ''));
    return list;
  }, [filtered, sort, lastCooked]);

  const moodRecipes = useMemo(() => (mood ? recipesForMood(mood, allRecipes, pantry) : []), [mood, allRecipes, pantry]);

  const hasFilters = !!category || tags.length > 0;
  const showExtras = !hasFilters && !mood;
  const tonight = getRecipe(plan[todayIndex]?.Dinner);
  const mains = allRecipes.filter((r) => r.category !== 'Dessert');
  const featured = tonight ?? mains[dayNumber % Math.max(1, mains.length)] ?? allRecipes[0];
  const featuredMatch = featured ? pantryMatch(featured, pantry) : { have: 0, needed: 0 };
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  const streak = streakOf(cooked.map((c) => c.date));

  // Rows built only from real data: nothing shows until there's something to show.
  const cookAgain = [...lastCooked.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => getRecipe(id))
    .filter((r): r is Recipe => !!r)
    .slice(0, 8);
  // Each recipe shows up in one row only, so the screen never repeats itself.
  const shown = new Set([featured?.id, ...cookAgain.map((r) => r.id)]);
  const quick = allRecipes.filter((r) => matchesFilter(r, QUICK_FILTER) && !shown.has(r.id)).slice(0, 8);
  quick.forEach((r) => shown.add(r.id));
  const recentlySaved = [...favorites]
    .reverse()
    .map((id) => getRecipe(id))
    .filter((r): r is Recipe => !!r && !shown.has(r.id))
    .slice(0, 8);

  const margin = t.layout.screen;
  const contentWidth = Math.min(width, 900);
  const columns = contentWidth >= 700 ? 3 : 2;
  const gap = t.spacing.md;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);
  // Cards in a sideways row: a bit narrower than the grid, so the next one peeks in.
  const railWidth = Math.min(168, Math.floor((contentWidth - margin * 2) / 2.25));
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  // Favorites only shows up once you've hearted something, so it never opens to an empty page.
  const books = favorites.length ? [{ id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites }, ...cookbooks] : cookbooks;

  const startImport = () => {
    if (!canImport) {
      showPaywall('imports');
      return;
    }
    router.push('/import');
  };

  const pickMood = (id: Mood | 'surprise') => {
    if (id === 'surprise') {
      // Not a filter: opens one random recipe (never the same one twice in a row).
      const pick = randomRecipe(allRecipes, lastSurprise.current);
      if (pick) {
        lastSurprise.current = pick.id;
        router.push({ pathname: '/recipe/[id]', params: { id: pick.id } });
      }
      return;
    }
    setMood(mood === id ? null : id);
  };
  const moodInfo = MOODS.find((m) => m.id === mood);

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: t.pop.berry }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[t.type.title3, { color: t.pop.ink }]}>{(firstName[0] ?? '?').toUpperCase()}</Text>
        </View>
        <Text style={[t.type.headline, { color: t.colors.secondaryLabel, flex: 1 }]} testID="screen-kicker">
          {firstName ? `Hey ${firstName}!` : 'Hey there!'}
        </Text>
        <PressableScale
          onPress={() => router.navigate('/progress')}
          accessibilityLabel={`${streak} day cooking streak. Opens You`}
          style={[styles.streak, { backgroundColor: t.pop.sunshine, borderColor: t.pop.ink }]}
          testID="streak-pill"
        >
          <Icon name="flameFill" size={16} color={t.pop.tomato} />
          <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.black }]}>{streak}</Text>
        </PressableScale>
        <PopIconButton icon="plus" onPress={() => setMenuOpen(true)} accessibilityLabel="Add a recipe" accessibilityHint="Save one from a link, or write your own" />
      </View>
      <Text style={[t.type.hero, { color: t.colors.label, marginTop: 18 }]} accessibilityRole="header">
        {'Hungry?\nLet’s cook!'}
      </Text>
    </View>
  );

  return (
    <TabScreen maxWidth={900} title="Cook" header={header} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      {showTrialReminder && (
        <View style={[styles.reminder, { backgroundColor: t.colors.rewardSoft, borderColor: t.pop.ink }]} accessibilityRole="alert">
          <Icon name="crown" size={18} color={t.colors.rewardText} />
          <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]} testID="trial-reminder">
            Your free trial ends {trialDaysLeft === 0 ? 'today' : `in ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'}`}. Keep Pro, or cancel anytime before then.
          </Text>
          <PressableScale
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }))}
            accessibilityLabel="Manage subscription"
            style={styles.reminderBtn}
          >
            <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black }]}>Manage</Text>
          </PressableScale>
          <IconButton icon="close" accessibilityLabel="Dismiss trial reminder" iconSize={13} color={t.colors.secondaryLabel} onPress={() => setReminderHidden(true)} />
        </View>
      )}

      {/* 1. Mood tiles: a 2x2 grid of bold color blocks. */}
      <Reveal index={0}>
        <View style={styles.moods} accessibilityLabel="What are you in the mood for?">
          {MOODS.map((m) => {
            const on = mood === m.id;
            return (
              <PopCard
                key={m.id}
                color={m.color}
                radius={20}
                pressed={on}
                onPress={() => pickMood(m.id)}
                accessibilityLabel={`${m.label}. ${m.hint}${on ? '. Selected, tap to show all recipes' : ''}`}
                style={styles.moodTile}
                contentStyle={styles.moodFace}
                testID={`mood-${m.id}`}
              >
                <View style={[styles.moodIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
                  <Icon name={m.icon} size={20} color={t.pop.ink} weight="bold" />
                </View>
                <Text style={[t.type.title3, styles.moodLabel, { color: t.pop.ink }]}>{m.label}</Text>
                {on && (
                  <View style={[styles.moodCheck, { backgroundColor: t.pop.ink }]} accessibilityElementsHidden>
                    <Icon name="check" size={13} color={t.pop.white} weight="bold" />
                  </View>
                )}
              </PopCard>
            );
          })}
        </View>
      </Reveal>

      {/* 2. A mood is on: its recipes, right here. */}
      {mood && moodInfo && (
        <Animated.View entering={FadeIn.duration(220)} key={mood}>
          <SectionHeader
            title={moodInfo.label}
            subtitle={`${moodRecipes.length} ${moodRecipes.length === 1 ? 'recipe' : 'recipes'} · ${moodInfo.hint.toLowerCase()}`}
            right={<PopChip label="Clear" small onPress={() => setMood(null)} accessibilityLabel={`Clear the ${moodInfo.label} filter`} />}
            style={{ marginTop: 20 }}
          />
          {moodRecipes.length === 0 ? (
            <EmptyState
              icon={moodInfo.icon}
              title={mood === 'pantry' ? 'Nothing from your pantry yet' : 'Nothing here yet'}
              message={mood === 'pantry' ? 'Add what you have on the Pantry tab and matching recipes show up here.' : 'Add a few more recipes and they’ll show up here.'}
            />
          ) : (
            <View style={[styles.grid, { gap, rowGap: t.spacing.md }]}>
              {moodRecipes.map((r, i) => (
                <Animated.View key={r.id} entering={FadeInDown.duration(280).delay(Math.min(i, 8) * 40)}>
                  <RecipeCard recipe={r} width={cardWidth} />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {showExtras && (
        <Animated.View entering={FadeIn.duration(250)}>
          {/* 3. Tonight's dinner from the plan, or the pick of the day */}
          {featured && (
            <Reveal index={2} style={{ marginTop: 22 }}>
              <TonightCard
                recipe={featured}
                label={tonight ? 'On the menu tonight' : 'Recipe of the day'}
                have={featuredMatch.have}
                needed={featuredMatch.needed}
                onCook={() => router.push({ pathname: '/cook/[id]', params: { id: featured.id } })}
              />
            </Reveal>
          )}

          {/* 4. Rows */}
          {quick.length > 1 && <Rail title="Under 30 minutes" subtitle="Dinner without the wait" recipes={quick} width={railWidth} action={{ label: 'See all', onPress: () => showOnlyTag(QUICK_FILTER) }} />}
          {cookAgain.length > 0 && <Rail title="Cook again" subtitle="Dishes you’ve made before" recipes={cookAgain} width={railWidth} />}
          {recentlySaved.length > 0 && (
            <Rail
              title="Recently saved"
              subtitle="Your newest favorites"
              recipes={recentlySaved}
              width={railWidth}
              action={{ label: 'See all', onPress: () => router.push({ pathname: '/cookbook/[id]', params: { id: FAVORITES_ID } }) }}
            />
          )}

          {/* 5. Cookbooks */}
          <SectionHeader title="Cookbooks" subtitle={books.length ? `${books.length} ${books.length === 1 ? 'collection' : 'collections'}` : 'Save recipes you love in one place'} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -margin }} contentContainerStyle={[styles.rail, { paddingHorizontal: margin, gap: t.spacing.sm }]}>
            {books.map((b) => (
              <CookbookTile key={b.id} id={b.id} name={b.name} width={railWidth} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
            ))}
            <PopCard
              onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
              accessibilityLabel="New cookbook"
              color={t.pop.lilacTint}
              radius={22}
              depth={4}
              style={{ width: railWidth }}
              contentStyle={[styles.book, styles.newBook]}
            >
              <View style={[styles.newIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
                <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
              </View>
              <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.black }]}>New cookbook</Text>
            </PopCard>
          </ScrollView>
        </Animated.View>
      )}

      {/* 6. All recipes: search, filters, sort and the grid */}
      {!mood && (
        <>
          <SectionHeader
            title={q ? 'Results' : hasFilters ? 'Filtered' : 'All recipes'}
            right={
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 4 }]} testID="result-count">
                {countLabel}
              </Text>
            }
          />
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="What would you like to cook?"
            accessibilityLabel="Search recipes or ingredients"
            onFocus={() => setSearchFocused(true)}
            // A short delay, so tapping a popular search still lands before the row hides.
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />
          {searchFocused && !q && popular.length > 0 && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.popular} testID="popular-searches">
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>Popular searches</Text>
              <View style={styles.popularRow}>
                {popular.map((word) => (
                  <Chip key={word} label={word} toggle={false} accessibilityLabel={`Search for ${word.toLowerCase()}`} icon="search" onPress={() => setQuery(word)} />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Filters: one category at a time, any number of tags. The row scrolls sideways. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -margin, marginTop: t.spacing.sm }}
            contentContainerStyle={[styles.chips, { paddingHorizontal: margin }]}
            accessibilityLabel="Filters"
            keyboardShouldPersistTaps="handled"
          >
            {hasFilters && (
              <Chip
                label="Clear"
                icon="close"
                toggle={false}
                accessibilityLabel="Clear filter"
                onPress={() => {
                  clearFilters();
                  toast({ message: 'Filters cleared', tone: 'info' });
                }}
              />
            )}
            {categories.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
            ))}
            <View style={[styles.chipDivider, { backgroundColor: t.pop.ink }]} />
            {filterTags.map((tag) => (
              <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
            ))}
          </ScrollView>

          {filtered.length > 1 && (
            <PressableScale onPress={() => setSortOpen(true)} accessibilityLabel={`Sort recipes. Now: ${SORTS.find((s) => s.value === sort)?.label}`} style={styles.sortBtn} scaleTo={0.96}>
              <Icon name="sort" size={15} color={t.colors.tint} weight="bold" />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black }]}>{SORTS.find((s) => s.value === sort)?.label}</Text>
              <Icon name="chevronDown" size={13} color={t.colors.tint} weight="bold" />
            </PressableScale>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No recipes found"
              message="Try another word, or clear the filters to see everything."
              action={{
                label: 'Clear search and filters',
                icon: 'close',
                onPress: () => {
                  haptics.tap();
                  clearFilters();
                  setQuery('');
                },
              }}
            />
          ) : (
            <View style={[styles.grid, { gap, rowGap: t.spacing.md }]}>
              {sorted.map((r, i) => (
                <Animated.View key={r.id} layout={LinearTransition.duration(220)} entering={FadeInDown.duration(320).delay(Math.min(i, 8) * 45)}>
                  <RecipeCard recipe={r} width={cardWidth} />
                </Animated.View>
              ))}
            </View>
          )}
        </>
      )}

      <Menu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        label="Add a recipe"
        rows={[
          {
            label: 'Save from a link',
            hint: 'TikTok, YouTube, Instagram or any recipe site',
            icon: 'link',
            onPress: () => {
              setMenuOpen(false);
              startImport();
            },
          },
          {
            label: 'Write my own',
            hint: 'Type in a family favorite',
            icon: 'edit',
            onPress: () => {
              setMenuOpen(false);
              if (canAddRecipe) router.push('/recipe/new');
              else showPaywall('recipes');
            },
          },
        ]}
      />
      <Menu
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        label="Sort recipes"
        top={160}
        rows={SORTS.map((s) => ({
          label: s.label,
          selected: s.value === sort,
          onPress: () => {
            haptics.select();
            setSort(s.value);
            setSortOpen(false);
          },
        }))}
      />
    </TabScreen>
  );
}

/** A titled row of recipe cards that scrolls sideways. The cards slide in one after another. */
function Rail({ title, subtitle, recipes, width, action }: { title: string; subtitle?: string; recipes: Recipe[]; width: number; action?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -t.layout.screen }} contentContainerStyle={[styles.rail, { paddingHorizontal: t.layout.screen, gap: t.spacing.sm }]}>
        {recipes.map((r, i) => (
          <Animated.View key={r.id} entering={FadeInRight.duration(360).delay(i * 60)}>
            <RecipeCard recipe={r} width={width} />
          </Animated.View>
        ))}
      </ScrollView>
    </>
  );
}

/** A cookbook cover: up to four food photos as a collage, then its name and size. */
function CookbookTile({ id, name, recipes, width }: { id: string; name: string; recipes: Recipe[]; width: number }) {
  const t = useTheme();
  const covers = recipes.slice(0, 4);
  const empty = covers.length === 0;
  const fav = id === FAVORITES_ID;
  return (
    <PopCard
      onPress={() => router.push({ pathname: '/cookbook/[id]', params: { id } })}
      accessibilityLabel={`${name} cookbook, ${recipes.length} recipes`}
      radius={22}
      depth={4}
      style={{ width }}
      contentStyle={styles.book}
    >
      <View style={[styles.covers, { backgroundColor: empty ? t.pop.berryTint : t.colors.imagePlaceholder, borderColor: t.pop.ink }]}>
        {empty ? (
          <Icon name={fav ? 'heart' : 'book'} size={30} color={t.pop.ink} weight="bold" />
        ) : (
          covers.map((r, i) => {
            // One photo fills the cover; two side by side; three: one wide on top and two below; four as a grid.
            // Percentages, not pixel halves: two rounded halves could add up to a hair more than the
            // cover and push a photo onto a hidden row, leaving a white gap.
            const n = covers.length;
            const wide = n === 1 || (n === 3 && i === 0);
            const size = { width: wide ? '100%' : '50%', height: n <= 2 ? '100%' : '50%' } as const;
            return (
              <View key={r.id} style={[size, { overflow: 'hidden' }]}>
                <RecipePhoto recipe={r} iconSize={16} />
              </View>
            );
          })
        )}
      </View>
      <View style={styles.bookText}>
        {fav && <Icon name="heartFill" size={14} color={t.pop.tomato} />}
        <Text style={[t.type.title3, { color: t.colors.label, fontSize: 18, flexShrink: 1 }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, paddingHorizontal: 12 }]} numberOfLines={1}>
        {empty ? 'Nothing yet' : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
      </Text>
    </PopCard>
  );
}

/** Searches offered under the search box. Words that find no recipe are left out. */
const POPULAR_SEARCHES = ['Chicken', 'Pasta', 'Rice', 'Cheese', 'Potato', 'Mushroom', 'Egg', 'Tomato'];

/** Height of a cookbook cover collage. */
const COVER_H = 120;

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: pop.ink, alignItems: 'center', justifyContent: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2.5 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 2.5, marginBottom: 16, borderCurve: 'continuous' },
  reminderBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  moodTile: { width: '48.4%' },
  // Icon in a circle at the top left, the label underneath on one line.
  moodFace: { height: 96, padding: 12, justifyContent: 'space-between' },
  moodIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  moodLabel: { fontSize: 19, lineHeight: 23 },
  moodCheck: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44, marginBottom: 4 },
  rail: { paddingBottom: 4 },
  book: { paddingBottom: 12, minHeight: 168 },
  newBook: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12 },
  newIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  covers: { height: COVER_H, margin: 6, borderRadius: 16, borderWidth: 2.5, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  bookText: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, marginTop: 6 },
  popular: { gap: 8, marginTop: 12 },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center', minHeight: 56 },
  chipDivider: { width: 2.5, height: 24, marginHorizontal: 4, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
