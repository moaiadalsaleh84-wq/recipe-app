import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, FadeInRight, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { enter } from '../../../motion';
import { Icon, type IconName } from '../../../components/Icon';
import { Menu } from '../../../components/Menu';
import { PopButton, PopCard, PopChip, PopIconButton } from '../../../components/pop';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { RecipeCard, RecipePhoto, TonightCard } from '../../../components/RecipeCard';
import { TabScreen } from '../../../components/TabScreen';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, IconButton, SearchField, SectionHeader } from '../../../components/ui';
import { FAVORITES_ID, QUICK_FILTER, categories, filterTags, matchesFilter, type Recipe } from '../../../data/mock';
import { fitsDiet } from '../../../lib/onboardingPicks';
import { useImportTip } from '../../../lib/appOpens';
import { haptics } from '../../../lib/haptics';
import { EXAMPLE_URL } from '../../../lib/importApi';
import { recipesForMood, type Mood } from '../../../lib/moods';
import { showPaywall, useProGate } from '../../../lib/pro';
import { streakOf } from '../../../lib/progress';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { useTonightPick } from '../../../lib/tonightPick';
import { useFlip } from '../../../components/useFlip';
import { useStore } from '../../../state/store';
import { fonts, pop, useTheme } from '../../../theme';
import { nb } from '../../../lib/text';
import { PhotoFrame } from '../../../components/PhotoFrame';
import { DiscoverRow } from '../../../components/DiscoverRow';
import { HorizontalList } from '../../../components/HorizontalList';


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
  const reduceMotion = useReducedMotion();
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, showOnlyTag, clearFilters, allRecipes, getRecipe, favorites, cookbooks, cooked, profile, pantry } = useStore();

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
          fitsDiet(r, profile.diets) &&
          (!category || r.category === category) &&
          tags.every((tag) => matchesFilter(r, tag)) &&
          (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
      ),
    [allRecipes, profile.diets, category, tags, q],
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
  // Searching or filtering shows only the results (DESIGN.md).
  const showExtras = !hasFilters && !mood && !q;
  // Tonight's dinner from the plan, otherwise the day's pick: fits your diet and goal, 45 minutes or
  // less, best pantry match (the same pick as onboarding, the reminder and the empty states).
  const { tonight: dayPick, picks } = useTonightPick();
  // "Show me another" flips through the top 5 picks (not when tonight's dinner is already planned).
  const [shuffled, setShuffled] = useState(0);
  const others = dayPick && !dayPick.fromPlan ? [dayPick, ...picks.filter((p) => p.recipe.id !== dayPick.recipe.id).slice(0, 4)] : [];
  const pick = others.length > 1 ? others[shuffled % others.length] : dayPick;
  const tonight = dayPick?.fromPlan ? dayPick.recipe : undefined;
  const featured = pick?.recipe;
  const featuredMatch = pick ? { have: pick.have, needed: pick.needed } : { have: 0, needed: 0 };
  const card = useFlip();
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  const streak = streakOf(cooked.map((c) => c.date));
  const cookedToday = cooked.some((c) => new Date(c.date).toDateString() === new Date().toDateString());

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
  // Two columns with a 12pt gap; carousels use exactly the same card width.
  const gap = t.spacing.sm;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);
  // Cards in a sideways row: a bit narrower than the grid, so the next one peeks in.
  const railWidth = cardWidth;
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  // Favorites only shows up once you've hearted something, so it never opens to an empty page.
  const books = favorites.length ? [{ id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites }, ...cookbooks] : cookbooks;

  // First 3 opens: show how importing works, with a one-tap example.
  const importTip = useImportTip();
  const tryExample = () => {
    importTip.dismiss();
    router.push({ pathname: '/import', params: { url: EXAMPLE_URL, auto: '1' } });
  };

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
        {/* One line: a very long name is shortened ("Hey Maximilia…"), never "Hey". */}
        <View style={styles.greeting} testID="screen-kicker" accessible accessibilityLabel={firstName ? `Hey ${firstName}!` : 'Hey there!'}>
          <Text style={[t.type.headline, { color: t.colors.secondaryLabel }]}>{'Hey\u00A0'}</Text>
          <Text style={[t.type.headline, { color: t.colors.secondaryLabel, flexShrink: 1 }]} numberOfLines={1}>
            {`${firstName || 'there'}!`}
          </Text>
        </View>
        <PressableScale
          onPress={() => router.navigate('/progress')}
          accessibilityLabel={streak > 0 ? `${streak} day cooking streak. Opens You` : 'No streak yet. Opens You'}
          style={[styles.streak, { backgroundColor: t.pop.sunshine, borderColor: t.pop.ink }]}
          testID="streak-pill"
        >
          <Flicker on={streak >= 1 && !cookedToday}>
            <Icon name="flameFill" size={16} color={t.pop.tomato} />
          </Flicker>
          <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.black }]}>{streak > 0 ? streak : 'Start'}</Text>
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

      {importTip.show && (
        <Animated.View exiting={FadeOut.duration(160)} style={{ marginBottom: t.spacing.lg }}>
          <PopCard color={t.pop.skyTint} contentStyle={styles.tip} testID="import-tip">
            {/* Icon row (icon left, small ✕ right), then the text full width, then the button full width. */}
            <View style={styles.tipTop}>
              <View style={[styles.tipIcon, { borderColor: t.pop.ink, backgroundColor: t.pop.white }]}>
                <Icon name="link" size={18} color={t.pop.ink} weight="bold" />
              </View>
              <PressableScale onPress={importTip.dismiss} hitSlop={4} accessibilityLabel="Dismiss tip" style={[styles.tipClose, { borderColor: t.pop.ink, backgroundColor: t.pop.white }]}>
                <Icon name="close" size={13} color={t.pop.ink} weight="bold" />
              </PressableScale>
            </View>
            <Text style={[t.type.headline, { color: t.pop.ink }]} numberOfLines={3}>
              Got a recipe on TikTok or a blog? Paste the link and cook from it.
            </Text>
            <PopButton label="Try an example" icon="sparkles" size="small" color={t.pop.white} onPress={tryExample} testID="import-example" />
          </PopCard>
        </Animated.View>
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
                <Animated.View key={r.id} entering={enter(i, reduceMotion)} style={styles.cardSlot}>
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
              <Animated.View style={card.style}>
              <TonightCard
                note={pick?.because ? `Picked for you because ${pick.because}` : undefined}
                onShuffle={others.length > 1 ? () => card.flip(() => setShuffled((n) => n + 1)) : undefined}
                recipe={featured}
                label={tonight ? 'On the menu tonight' : 'Recipe of the day'}
                have={featuredMatch.have}
                needed={featuredMatch.needed}
                onCook={() => router.push({ pathname: '/cook/[id]', params: { id: featured.id } })}
              />
              </Animated.View>
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

          {/* Discover: recipes the owner published (hidden when there are none) */}
          <DiscoverRow width={railWidth} />

          {/* 5. Cookbooks */}
          <SectionHeader title="Cookbooks" subtitle={books.length ? nb(books.length, books.length === 1 ? 'collection' : 'collections') : 'Save recipes you love in one place'} />
          {books.length === 0 ? (
            // No cookbooks yet: one slim row, not a big empty square.
            <PopCard
              onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
              accessibilityLabel="New cookbook"
              color={t.pop.lilacTint}
              radius={20}
              depth={3}
              contentStyle={styles.newBookSlim}
              testID="new-cookbook-slim"
            >
              <View style={[styles.newIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
                <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.newLabel, { color: t.pop.ink }]}>New cookbook</Text>
                <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
                  {'Like ‘Weeknights’ or ‘Date night’'}
                </Text>
              </View>
            </PopCard>
          ) : (
            <HorizontalList gap={t.spacing.sm} contentStyle={styles.rail}>
              {books.map((b) => (
                <CookbookTile key={b.id} id={b.id} name={b.name} width={railWidth} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
              ))}
              <PopCard
                onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
                accessibilityLabel="New cookbook"
                color={t.pop.lilacTint}
                radius={24}
                style={{ width: railWidth }}
                contentStyle={styles.newBook}
              >
                <View style={[styles.newIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
                  <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
                </View>
                <Text style={[styles.newLabel, { color: t.pop.ink }]}>{'New\u00A0cookbook'}</Text>
              </PopCard>
            </HorizontalList>
          )}
        </Animated.View>
      )}

      {/* 6. All recipes: search, filters, sort and the grid */}
      {!mood && (
        <>
          <SectionHeader
            // Your diet from onboarding always applies (change it in Settings); "Clear" only removes
            // the filters tapped here.
            title={q ? 'Results' : hasFilters ? 'Filtered' : profile.diets.length ? 'For you' : 'All recipes'}
            subtitle={profile.diets.length ? profile.diets.join(' · ') : undefined}
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
          <View style={{ marginTop: t.spacing.sm }} accessibilityLabel="Filters">
          <HorizontalList gap={8} contentStyle={styles.chips} keyboardShouldPersistTaps="handled">
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
          </HorizontalList>
          </View>

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
              message={profile.diets.length ? `Try another word, or clear the filters. Only recipes that fit your diet (${profile.diets.join(', ')}) are shown; change it in Settings.` : 'Try another word, or clear the filters to see everything.'}
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
                // Cards glide when the order changes, but not in long lists (over 20): too much motion.
                <Animated.View key={r.id} layout={sorted.length <= 20 ? LinearTransition.duration(220) : undefined} entering={enter(i, reduceMotion)} style={styles.cardSlot}>
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
/**
 * The streak flame flickers gently (a slow, small scale loop) while today's cook is still to come:
 * a quiet reminder, nothing more. Still with Reduce Motion, and once you've cooked today.
 */
function Flicker({ on, children }: { on: boolean; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (on && !reduceMotion) s.set(withRepeat(withSequence(withTiming(1.14, { duration: 700 }), withTiming(0.96, { duration: 600 })), -1, true));
    else s.set(withTiming(1, { duration: 150 }));
  }, [on, reduceMotion, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Rail({ title, subtitle, recipes, width, action }: { title: string; subtitle?: string; recipes: Recipe[]; width: number; action?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      <HorizontalList gap={t.spacing.sm} contentStyle={styles.rail}>
        {recipes.map((r, i) => (
          // A row, so the card stretches to the tallest card's height.
          <Animated.View key={r.id} entering={FadeInRight.duration(360).delay(i * 60)} style={styles.cardSlot}>
            <RecipeCard recipe={r} width={width} />
          </Animated.View>
        ))}
      </HorizontalList>
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
      radius={24}
      style={{ width }}
      // Ink behind the covers, so photo edges never show a light hairline (see PhotoFrame).
      color={empty ? pop.white : pop.ink}
      contentStyle={styles.book}
    >
      <PhotoFrame radius={21.5} corners="top" edge="bottom" placeholderColor={empty ? t.pop.berryTint : undefined} style={styles.covers}>
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
      </PhotoFrame>
      <View style={[styles.bookBody, { backgroundColor: pop.white }]}>
      <View style={styles.bookText}>
        {fav && <Icon name="heartFill" size={14} color={t.pop.tomato} />}
        <Text style={[t.type.title3, { color: t.colors.label, fontSize: 18, flexShrink: 1 }]}>
          {name}
        </Text>
      </View>
      <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, paddingHorizontal: 12 }]}>
        {empty ? 'Nothing yet' : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
      </Text>
      </View>
    </PopCard>
  );
}

/** Searches offered under the search box. Words that find no recipe are left out. */
const POPULAR_SEARCHES = ['Chicken', 'Pasta', 'Rice', 'Cheese', 'Potato', 'Mushroom', 'Egg', 'Tomato'];

/** Height of a cookbook cover collage. */
const COVER_H = 120;

const styles = StyleSheet.create({
  tip: { padding: 14, gap: 12 },
  tipTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // 36 to look at, 44 to tap (hitSlop 4).
  tipClose: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  greeting: { flex: 1, flexDirection: 'row', minWidth: 0 },
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
  book: { minHeight: 168 },
  bookBody: { flexGrow: 1, paddingBottom: 12, borderBottomLeftRadius: 21.5, borderBottomRightRadius: 21.5 },
  // 16pt inside; the + circle and the label both centered.
  newBook: { flexGrow: 1, minHeight: 168, padding: 16, gap: 10, alignItems: 'center', justifyContent: 'center' },
  newIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  newLabel: { fontFamily: fonts.black, fontSize: 16, lineHeight: 21, textAlign: 'center' },
  bookHint: { justifyContent: 'center', paddingHorizontal: 4 },
  // Flush with the card's top border, top corners following its inner curve (24 − 2.5).
  covers: { height: COVER_H, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  bookText: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, marginTop: 6 },
  popular: { gap: 8, marginTop: 12 },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center', minHeight: 56 },
  chipDivider: { width: 2.5, height: 24, marginHorizontal: 4, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Holds one card; a row so the card fills the row's height (cards in a row are equally tall).
  cardSlot: { flexDirection: 'row' },
  newBookSlim: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
