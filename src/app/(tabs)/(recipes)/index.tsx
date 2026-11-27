import { router } from 'expo-router';
import { withProfiler } from '../../../lib/devProfiler';
import { StagedList, useRenderInStages } from '../../../lib/useRenderInStages';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Icon, type IconName } from '../../../components/Icon';
import { Menu } from '../../../components/Menu';
import { PopButton, PopCard, PopChip } from '../../../components/pop';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { RecipeCard, RecipePhoto, TonightCard, openRecipe } from '../../../components/RecipeCard';
import { TabScreen } from '../../../components/TabScreen';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, IconButton, Odometer, SearchField, SectionHeader } from '../../../components/ui';
import { FAVORITES_ID, QUICK_FILTER, matchesFilter, type Recipe } from '../../../data/mock';
import { fitsDiet } from '../../../lib/onboardingPicks';
import { haptics } from '../../../lib/haptics';
import { EXAMPLE_URL } from '../../../lib/importApi';
import { recipesForMood, type Mood } from '../../../lib/moods';
import { showPaywall, useProGate } from '../../../lib/pro';
import { streakOf } from '../../../lib/progress';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { useTonightPick } from '../../../lib/tonightPick';
import { FREE_LIMITS, useStore } from '../../../state/store';
import { fonts, pop, useTheme } from '../../../theme';
import { PhotoFrame } from '../../../components/PhotoFrame';
import { HorizontalList } from '../../../components/HorizontalList';
import { WelcomeChecklist } from '../../../components/WelcomeChecklist';
import { FoxSays, type FoxPose } from '../../../components/mascot/Fox';


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

/** The chip bar above the recipe grid. */
type HomeView = 'all' | 'cookbooks' | 'again' | 'quick' | 'Breakfast' | 'Lunch' | 'Dinner';
const VIEWS: { id: HomeView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cookbooks', label: 'Cookbooks' },
  { id: 'again', label: 'Cook again' },
  { id: 'quick', label: 'Under 30m' },
  { id: 'Breakfast', label: 'Breakfast' },
  { id: 'Lunch', label: 'Lunch' },
  { id: 'Dinner', label: 'Dinner' },
];

/** A tile's filter: a mood, or your hearted recipes. */
type TileMood = Exclude<Mood, 'pantry'> | 'favorites';

/** The four mood tiles. "Surprise me" opens a random pick instead of filtering. */
const MOODS: { id: TileMood | 'surprise'; label: string; hint: string; icon: IconName; color: string; tint: string }[] = [
  { id: 'quick', label: 'Quick', hint: '30 minutes or less', icon: 'timer', color: pop.sunshine, tint: pop.sunshineTint },
  { id: 'favorites', label: 'Favorites', hint: 'Your hearted recipes', icon: 'heart', color: pop.leaf, tint: pop.leafTint },
  { id: 'cozy', label: 'Cozy', hint: 'Comfort food', icon: 'pot', color: pop.sky, tint: pop.skyTint },
  { id: 'surprise', label: 'Surprise', hint: 'Opens a random recipe', icon: 'shuffle', color: pop.lilac, tint: pop.lilacTint },
];

function RecipesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { allRecipes, getRecipe, favorites, cookbooks, cooked, profile, isPro, importsUsed } = useStore();
  const importsLeft = Math.max(0, FREE_LIMITS.imports - importsUsed);

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<Sort>('suggested');
  const [mood, setMood] = useState<TileMood | null>(null);
  // The one chip bar above the grid: All, Cookbooks, Cook again, Under 30m, Breakfast, Lunch, Dinner.
  const [view, setView] = useState<HomeView>('all');
  // The tile lights up the instant you tap it (mood); the recipes below follow a moment later
  // (moodShown), so building that grid never makes the tap feel slow.
  const moodShown = useDeferredValue(mood);
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
  // When each recipe was last cooked (ISO dates sort as text).
  const lastCooked = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cooked) if ((m.get(c.recipeId) ?? '') < c.date) m.set(c.recipeId, c.date);
    return m;
  }, [cooked]);

  // Your diet always applies; then the search words and the chip you picked.
  const filtered = useMemo(
    () =>
      allRecipes.filter(
        (r) =>
          fitsDiet(r, profile.diets) &&
          (view === 'all' || view === 'cookbooks' || (view === 'again' ? lastCooked.has(r.id) : view === 'quick' ? matchesFilter(r, QUICK_FILTER) : r.category === view)) &&
          (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q))),
      ),
    [allRecipes, profile.diets, view, lastCooked, q],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'quickest') list.sort((a, b) => a.minutes - b.minutes);
    if (sort === 'cooked' || (view === 'again' && sort === 'suggested')) list.sort((a, b) => (lastCooked.get(b.id) ?? '').localeCompare(lastCooked.get(a.id) ?? ''));
    return list;
  }, [filtered, sort, lastCooked, view]);

  const moodRecipes = useMemo(
    () =>
      !moodShown
        ? []
        : moodShown === 'favorites'
          ? [...favorites].reverse().map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)
          : recipesForMood(moodShown, allRecipes, []),
    [moodShown, allRecipes, favorites, getRecipe],
  );

  // Searching or picking a chip shows only the results (DESIGN.md).
  const showExtras = view === 'all' && !moodShown && !q;
  // Tonight's dinner from the plan, otherwise the day's pick: fits your diet and goal, 45 minutes or
  // less, best pantry match (the same pick as onboarding, the reminder and the empty states).
  const { tonight: dayPick } = useTonightPick();
  // One Tonight's Pick (no shuffle button: "Surprise me" is the randomizer).
  const pick = dayPick;
  const quickTonight = useMemo(() => allRecipes.filter((r) => matchesFilter(r, QUICK_FILTER) && r.id !== dayPick?.recipe.id && fitsDiet(r, profile.diets)).slice(0, 8), [allRecipes, dayPick, profile.diets]);
  // Opening Recipes: the first two cards of the sideways row now, the rest a frame later.
  const railShown = useRenderInStages(quickTonight.length, 2);
  const tonight = dayPick?.fromPlan ? dayPick.recipe : undefined;
  const featured = pick?.recipe;
  const featuredMatch = pick ? { have: pick.have, needed: pick.needed } : { have: 0, needed: 0 };
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  const streak = streakOf(cooked.map((c) => c.date));
  const cookedToday = cooked.some((c) => new Date(c.date).toDateString() === new Date().toDateString());

  const margin = t.layout.screen;
  const contentWidth = Math.min(width, 900);
  const columns = contentWidth >= 700 ? 3 : 2;
  // Two columns with a 12pt gap; carousels use exactly the same card width.
  const gap = t.spacing.sm;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);
  // Sideways rows: a bit narrower than the grid, so the next card peeks in.
  const railWidth = Math.round(cardWidth * 0.82);
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  // Favorites only shows up once you've hearted something, so it never opens to an empty page.
  const books = favorites.length ? [{ id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites }, ...cookbooks] : cookbooks;

  // First 3 opens: show how importing works, with a one-tap example.
  const tryExample = () => {
    router.push({ pathname: '/import', params: { url: EXAMPLE_URL, auto: '1' } });
  };

  const startImport = () => {
    if (!canImport) {
      showPaywall('imports');
      return;
    }
    router.push('/import');
  };

  const pickMood = (id: TileMood | 'surprise') => {
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
  const moodInfo = MOODS.find((m) => m.id === moodShown);

  // One line, by time of day: "Good evening, Moaiad".
  const hour = new Date().getHours();
  // What the fox says: the streak first, then today's cooking, then the day's pick.
  const foxLine: { pose: FoxPose; text: string } =
    streak >= 2 && cookedToday
      ? { pose: 'cheer', text: `${streak} days in a row. Chef behavior.` }
      : streak >= 2
        ? { pose: 'happy', text: `You’re on a ${streak}-day roll. Keep it going tonight?` }
        : cookedToday
          ? { pose: 'happy', text: 'You cooked today. I’m very proud of us.' }
          : tonight
            ? { pose: 'chef', text: `Tonight: ${tonight.title}. Apron on?` }
            : featured
              ? hour < 11
                ? { pose: 'wave', text: 'Morning! Today’s idea is ready.' }
                : { pose: 'happy', text: 'Dinner idea ready! Have a look.' }
              : { pose: 'wave', text: 'Hi! Save a recipe and I’ll keep it safe.' };
  const greet = hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const header = (
    <View style={styles.header}>
      {/* 44 high: streak, then Import and your avatar on the right. */}
      <View style={styles.topRow}>
        <PressableScale
          onPress={() => router.push('/progress')}
          accessibilityLabel={streak > 0 ? `${streak} day cooking streak. Opens You` : 'No streak yet. Opens You'}
          style={[styles.streak, { backgroundColor: streak > 0 ? t.pop.sunshineTint : t.colors.fill }]}
          testID="streak-pill"
        >
          <Flicker on={streak >= 1 && !cookedToday}>
            {/* No streak yet: a quiet gray flame and no "0". From day one: a colored flame and the number. */}
            <Icon name="flameFill" size={18} color={streak > 0 ? t.pop.tomato : '#B9B5C6'} />
          </Flicker>
          {/* At 0: "Start" next to the gray flame, so the pill never looks empty or broken. */}
          {streak === 0 && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="streak-start">
              Start
            </Text>
          )}
          {streak > 0 && (
            // The streak rolls up on odometer wheels when Recipes opens and when it grows.
            <Odometer value={streak} style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.black }]} testID="streak-count-home" />
          )}
        </PressableScale>
        <View style={{ flex: 1 }} />
        <PopButton label="Import" icon="plus" size="small" color={t.pop.white} onPress={() => setMenuOpen(true)} accessibilityLabel="Import a recipe" accessibilityHint="Save one from a link, or write your own" testID="home-import" />
        {/* Your avatar opens You: level, streak, achievements, history, goals and settings. */}
        <PressableScale onPress={() => router.push('/progress')} accessibilityLabel="You: your level, streak and settings" style={[styles.avatar, { backgroundColor: t.pop.berry }]} testID="home-avatar">
          <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.black }]}>{(firstName[0] ?? '?').toUpperCase()}</Text>
        </PressableScale>
      </View>
      <Text style={[styles.greeting, { color: t.colors.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} accessibilityRole="header" testID="screen-kicker">
        {firstName ? `${greet}, ${firstName}` : `${greet}!`}
      </Text>
      {/* The fox, with one line that fits the moment. Tapping it opens the day's pick. */}
      <FoxSays pose={foxLine.pose} text={foxLine.text} size={44} onPress={featured ? () => openRecipe(featured.id) : undefined} style={{ marginTop: 12 }} testID="home-fox" />
    </View>
  );

  return (
    <TabScreen maxWidth={900} title="Recipes" header={header} scrollToTopTab="(recipes)" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      {showTrialReminder && (
        <View style={[styles.reminder, { backgroundColor: t.colors.rewardSoft, borderColor: t.colors.border }]} accessibilityRole="alert">
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

      {/* First steps (ReciMe-style welcome card): ticks itself, folds away, hides when done. */}
      <WelcomeChecklist
        onImport={() => setMenuOpen(true)}
        onExample={tryExample}
        onCookbook={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
        onCook={() => (featured ? router.push({ pathname: '/cook/[id]', params: { id: featured.id } }) : router.push('/import'))}
      />

      {/* 1. Mood tiles: four equal tiles (80 high: icon + label) that always fit the width. */}
      <Reveal index={0}>
        <View style={styles.moods}>
          {MOODS.map((m) => {
            const on = mood === m.id;
            return (
              // White tiles with a light border and a colored icon circle; selected: the soft tint and a
              // colored border. Color stays an accent.
              <PressableScale
                key={m.id}
                onPress={() => pickMood(m.id)}
                haptic="select"
                scaleTo={0.96}
                aria-selected={on}
                accessibilityLabel={`${m.label}. ${m.hint}${on ? '. Selected, tap to show all recipes' : ''}`}
                style={[styles.mood, styles.moodFace, { backgroundColor: on ? m.tint : t.colors.cell, borderColor: on ? m.color : t.colors.border }]}
                testID={`mood-${m.id}`}
              >
                <View style={[styles.moodIcon, { backgroundColor: m.color }]}>
                  <Icon name={m.icon} size={17} color={t.pop.ink} weight="bold" />
                </View>
                {/* One word on one line: it shrinks a little rather than wrap or cut. */}
                <Text style={[styles.moodLabel, { color: t.pop.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
                  {m.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Reveal>

      {/* 2. A mood is on: its recipes, right here. */}
      {moodShown && moodInfo && (
        <Animated.View entering={FadeIn.duration(220)} key={moodShown}>
          <SectionHeader
            title={moodInfo.label}
            subtitle={`${moodRecipes.length} ${moodRecipes.length === 1 ? 'recipe' : 'recipes'} · ${moodInfo.hint.toLowerCase()}`}
            right={<PopChip label="Clear" small onPress={() => setMood(null)} accessibilityLabel={`Clear the ${moodInfo.label} filter`} />}
            style={{ marginTop: 20 }}
          />
          {moodRecipes.length === 0 ? (
            <EmptyState
              icon={moodInfo.icon}
              fox="sleepy"
              title={moodShown === 'favorites' ? 'No favorites yet' : 'Nothing here yet'}
              message={moodShown === 'favorites' ? 'Tap the heart on any recipe and it shows up here.' : 'Add a few more recipes and they’ll show up here.'}
              action={moodShown === 'favorites' ? { label: 'Browse recipes', onPress: () => setMood(null) } : { label: 'Import a recipe', onPress: () => router.push('/import') }}
            />
          ) : (
            <View style={[styles.grid, { gap, rowGap: t.spacing.md }]}>
              {/* One entrance per container: the mood view fades in; its first cards are there at once,
                  the rest a frame later. */}
              <StagedList
                items={moodRecipes}
                render={(r) => (
                  <Animated.View key={r.id} style={styles.cardSlot}>
                    <RecipeCard recipe={r} width={cardWidth} />
                  </Animated.View>
                )}
              />
            </View>
          )}
        </Animated.View>
      )}

      {showExtras && (
        <Animated.View entering={FadeIn.duration(250)}>
          {/* 3. Tonight's dinner from the plan, or the pick of the day */}
          {featured && (
            <Reveal index={2} style={{ marginTop: t.layout.section }}>
              <TonightCard
                note={pick?.because ? `Picked for you because ${pick.because}` : undefined}
                recipe={featured}
                label={tonight ? 'On the menu tonight' : 'Recipe of the day'}
                have={featuredMatch.have}
                needed={featuredMatch.needed}
                onCook={() => router.push({ pathname: '/cook/[id]', params: { id: featured.id } })}
              />
            </Reveal>
          )}

          {/* "Quick tonight": 30 minutes or less, as a row (not the pick above). */}
          {quickTonight.length > 1 && (
            <View style={{ marginTop: t.layout.section }}>
              <SectionHeader title="Quick tonight" subtitle="30 minutes or less" action={{ label: 'See all', onPress: () => setView('quick') }} style={{ marginTop: 0 }} />
              <HorizontalList gap={12}>
                {quickTonight.slice(0, railShown).map((r) => (
                  <RecipeCard key={r.id} recipe={r} width={railWidth} />
                ))}
              </HorizontalList>
            </View>
          )}
        </Animated.View>
      )}

      {/* 6. All recipes: search, filters, sort and the grid */}
      {!moodShown && (
        <>
          <SectionHeader
            // Your diet from onboarding always applies (change it in Settings); "Clear" only removes
            // the filters tapped here.
            title={q ? 'Results' : view === 'all' ? (profile.diets.length ? 'For you' : 'All recipes') : VIEWS.find((v) => v.id === view)!.label}
            subtitle={profile.diets.length ? profile.diets.join(' · ') : undefined}
            right={
              view === 'cookbooks' ? undefined : (
                <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 4 }]} testID="result-count">
                  {countLabel}
                </Text>
              )
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

          {/* One chip bar: what the grid below shows. The row scrolls sideways. */}
          <View style={{ marginTop: t.spacing.sm }} accessibilityLabel="Show">
            <HorizontalList gap={8} contentStyle={styles.chips} keyboardShouldPersistTaps="handled">
              {VIEWS.map((v) => (
                <Chip key={v.id} label={v.label} selected={view === v.id} onPress={() => setView(v.id === view && v.id !== 'all' ? 'all' : v.id)} />
              ))}
            </HorizontalList>
          </View>

          {view !== 'cookbooks' && filtered.length > 1 && (
            <PressableScale onPress={() => setSortOpen(true)} accessibilityLabel={`Sort recipes. Now: ${SORTS.find((s) => s.value === sort)?.label}`} style={styles.sortBtn} scaleTo={0.96}>
              <Icon name="sort" size={15} color={t.colors.tint} weight="bold" />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black }]}>{SORTS.find((s) => s.value === sort)?.label}</Text>
              <Icon name="chevronDown" size={13} color={t.colors.tint} weight="bold" />
            </PressableScale>
          )}

          {view === 'cookbooks' ? (
            <View style={{ marginTop: t.spacing.sm }}>
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
                <View style={[styles.newIcon, { backgroundColor: t.pop.white, borderColor: t.colors.border }]}>
                  <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.newLabel, { color: t.pop.ink }]}>New cookbook</Text>
                  <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} numberOfLines={2}>
                    {'Like ‘Weeknights’ or ‘Date night’'}
                  </Text>
                </View>
              </PopCard>
            ) : (
              <View style={[styles.grid, { gap, rowGap: t.spacing.md, marginTop: t.spacing.md }]}>
                {books.map((b) => (
                  <CookbookTile key={b.id} id={b.id} name={b.name} width={cardWidth} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
                ))}
                <PopCard
                  onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
                  accessibilityLabel="New cookbook"
                  color={t.pop.lilacTint}
                  radius={24}
                  style={{ width: cardWidth }}
                  contentStyle={styles.newBook}
                >
                  <View style={[styles.newIcon, { backgroundColor: t.pop.white, borderColor: t.colors.border }]}>
                    <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
                  </View>
                  <Text style={[styles.newLabel, { color: t.pop.ink }]}>{'New\u00A0cookbook'}</Text>
                </PopCard>
              </View>
            )}
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="search"
              fox="oops"
              title="No matches yet"
              message={profile.diets.length ? `Try another word, or clear the filters. Only recipes that fit your diet (${profile.diets.join(', ')}) are shown; change it in Settings.` : 'Try fewer words or another dish.'}
              action={{
                label: 'Clear all',
                icon: 'close',
                onPress: () => {
                  haptics.tap();
                  setView('all');
                  setQuery('');
                },
              }}
            />
          ) : (
            <View style={[styles.grid, { gap, rowGap: t.spacing.md }]}>
              {/* The cards you can see first, the rest a frame later (whenever the grid appears).
                  Cards glide when the order changes, but not in long lists (over 20): too much motion. */}
              <StagedList
                items={sorted}
                render={(r) => (
                  <Animated.View key={r.id} layout={sorted.length <= 20 ? LinearTransition.duration(220) : undefined} style={styles.cardSlot}>
                    <RecipeCard recipe={r} width={cardWidth} />
                  </Animated.View>
                )}
              />
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
            label: 'Import a link',
            // Free version: how many imports are left, right where you import.
            hint: isPro ? 'TikTok, YouTube, Instagram or any recipe site' : `TikTok, YouTube, Instagram or any site · ${importsLeft} free ${importsLeft === 1 ? 'import' : 'imports'} left`,
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
/** The streak flame. It used to flicker (a scale loop); now it simply sits still: no loops. */
function Flicker({ children }: { on: boolean; children: React.ReactNode }) {
  return <>{children}</>;
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
  header: { marginBottom: 24 },
  greeting: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, marginTop: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // A small pill: 36 high (44 to tap).
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, minWidth: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 2.5, marginBottom: 16, borderCurve: 'continuous' },
  reminderBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  // Icon in a circle at the top left, the label underneath on one line.
  moods: { flexDirection: 'row', gap: 8 },
  mood: { flex: 1, minWidth: 0 },
  moodFace: { height: 80, paddingHorizontal: 4, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderRadius: 16, borderCurve: 'continuous' },
  moodIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  moodLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, textAlign: 'center' },
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

export default withProfiler('Home', RecipesScreen);
