import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { Chunky } from '../../../components/Chunky';
import { Icon } from '../../../components/Icon';
import { Menu } from '../../../components/Menu';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { FeaturedCard, RecipeCard, RecipePhoto } from '../../../components/RecipeCard';
import { TabScreen } from '../../../components/TabScreen';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, HeaderButton, IconButton, SearchField, SectionHeader } from '../../../components/ui';
import { FAVORITES_ID, QUICK_FILTER, categories, filterTags, matchesFilter, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { showPaywall, useProGate } from '../../../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { useStore } from '../../../state/store';
import { cook, useTheme } from '../../../theme';

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

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Hi' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

export default function RecipesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, showOnlyTag, clearFilters, plan, allRecipes, getRecipe, favorites, cookbooks, cooked, profile } = useStore();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<Sort>('suggested');
  const { canAddRecipe, canAddCookbook, canImport, trialDaysLeft } = useProGate();
  const [reminderHidden, setReminderHidden] = useState(false);
  // Keeps the paywall's promise: a reminder in the app before the trial ends.
  const showTrialReminder = !reminderHidden && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 2;

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

  const hasFilters = !!category || tags.length > 0;
  const showExtras = !hasFilters && !q;
  const tonight = getRecipe(plan[todayIndex]?.Dinner);
  const mains = allRecipes.filter((r) => r.category !== 'Dessert');
  const featured = tonight ?? mains[dayNumber % Math.max(1, mains.length)] ?? allRecipes[0];
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';

  // Rows built only from real data: nothing shows until there's something to show.
  const cookAgain = [...lastCooked.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => getRecipe(id))
    .filter((r): r is Recipe => !!r)
    .slice(0, 8);
  // Each recipe shows up in one row only, so the screen never repeats itself.
  const shown = new Set([featured?.id, ...cookAgain.map((r) => r.id)]);
  const recentlySaved = [...favorites]
    .reverse()
    .map((id) => getRecipe(id))
    .filter((r): r is Recipe => !!r && !shown.has(r.id))
    .slice(0, 8);
  recentlySaved.forEach((r) => shown.add(r.id));
  const quick = allRecipes.filter((r) => matchesFilter(r, QUICK_FILTER) && !shown.has(r.id)).slice(0, 8);

  const margin = t.layout.screen;
  const contentWidth = Math.min(width, 900);
  const columns = contentWidth >= 700 ? 3 : 2;
  const gap = t.spacing.md;
  const cardWidth = Math.floor((contentWidth - margin * 2 - gap * (columns - 1)) / columns);
  // Cards in a sideways row: a bit narrower than the grid, so the next one peeks in.
  const railWidth = Math.min(168, Math.floor((contentWidth - margin * 2) / 2.3));
  const countLabel = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;

  const books = [{ id: FAVORITES_ID, name: 'Favorites', recipeIds: favorites }, ...cookbooks];

  const startImport = (url?: string) => {
    if (!canImport) {
      showPaywall('imports');
      return;
    }
    router.push(url ? { pathname: '/import', params: { url, auto: '1' } } : '/import');
  };

  return (
    <TabScreen
      maxWidth={900}
      title="What’s cooking?"
      kicker={greeting(firstName)}
      right={<HeaderButton icon="plus" onPress={() => setMenuOpen(true)} accessibilityLabel="Add a recipe" />}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {showTrialReminder && (
        <View style={[styles.reminder, { backgroundColor: t.colors.rewardSoft, borderColor: t.colors.reward }]} accessibilityRole="alert">
          <Icon name="crown" size={18} color={t.colors.rewardText} />
          <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]} testID="trial-reminder">
            Your free trial ends {trialDaysLeft === 0 ? 'today' : `in ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'}`}. Keep Pro, or cancel anytime before then.
          </Text>
          <PressableScale
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL).catch(() => toast({ message: 'Couldn’t open the link', tone: 'warning' }))}
            accessibilityLabel="Manage subscription"
            style={styles.reminderBtn}
          >
            <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.bold }]}>Manage</Text>
          </PressableScale>
          <IconButton icon="close" accessibilityLabel="Dismiss trial reminder" iconSize={13} color={t.colors.secondaryLabel} onPress={() => setReminderHidden(true)} />
        </View>
      )}

      {/* 1. Import: the fastest way to get a recipe in */}
      {showExtras && (
        <Reveal index={0}>
          <ImportBox onImport={startImport} />
        </Reveal>
      )}

      {/* 2. Search */}
      <Reveal index={1}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes or ingredients" style={{ marginTop: showExtras ? t.spacing.md : 0 }} />
      </Reveal>

      {/* 3. Filters: one category at a time, any number of tags. The row scrolls sideways. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -margin, marginTop: t.spacing.sm }}
        contentContainerStyle={[styles.chips, { paddingHorizontal: margin }]}
        accessibilityLabel="Filters"
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
        <View style={[styles.chipDivider, { backgroundColor: t.colors.fillStrong }]} />
        {filterTags.map((tag) => (
          <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
        ))}
      </ScrollView>

      <Animated.View entering={FadeIn.duration(250)}>
        {/* 4. Tonight's dinner from the plan, or the recipe of the day */}
        {showExtras && featured && (
          <>
            <SectionHeader
              title={tonight ? 'Tonight' : 'Today’s pick'}
              subtitle={tonight ? 'From your meal plan' : 'New every day'}
              right={
                <PressableScale onPress={() => router.push('/buddy-pick')} accessibilityLabel="Can't decide? Pick a random recipe" style={styles.surprise}>
                  <Icon name="shuffle" size={14} color={t.colors.tint} weight="bold" />
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.bold }]}>Surprise me</Text>
                </PressableScale>
              }
            />
            <Reveal index={3}>
              <FeaturedCard recipe={featured} label={tonight ? 'On the menu tonight' : 'Recipe of the day'} />
            </Reveal>
          </>
        )}

        {/* 5. Rows that come from what you've done */}
        {showExtras && cookAgain.length > 0 && <Rail title="Cook again" subtitle="Dishes you’ve made before" recipes={cookAgain} width={railWidth} />}
        {showExtras && recentlySaved.length > 0 && (
          <Rail
            title="Recently saved"
            subtitle="Your newest favorites"
            recipes={recentlySaved}
            width={railWidth}
            action={{ label: 'See all', onPress: () => router.push({ pathname: '/cookbook/[id]', params: { id: FAVORITES_ID } }) }}
          />
        )}
        {showExtras && quick.length > 1 && <Rail title="Quick meals" subtitle="Ready in 30 minutes or less" recipes={quick} width={railWidth} action={{ label: 'See all', onPress: () => showOnlyTag(QUICK_FILTER) }} />}

        {/* 6. Cookbooks, on their own soft band so the section stands apart */}
        {showExtras && (
          <View style={[styles.band, { marginHorizontal: -margin, paddingHorizontal: margin, backgroundColor: t.isDark ? t.colors.cell : t.colors.imagePlaceholder }]}>
            <SectionHeader title="Cookbooks" subtitle={`${books.length} ${books.length === 1 ? 'collection' : 'collections'}`} style={{ marginTop: 0 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -margin }} contentContainerStyle={[styles.rail, { paddingHorizontal: margin, gap: t.spacing.sm }]}>
              {books.map((b) => (
                <CookbookTile key={b.id} id={b.id} name={b.name} width={railWidth} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
              ))}
              <PressableScale
                onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
                accessibilityLabel="New cookbook"
                style={[styles.book, styles.newBook, { width: railWidth, backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}
              >
                <View style={[styles.newIcon, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name="plus" size={20} color={t.colors.tint} weight="bold" />
                </View>
                <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.bold }]}>New cookbook</Text>
              </PressableScale>
            </ScrollView>
          </View>
        )}

        {/* 7. All recipes */}
        <SectionHeader
          title={q ? 'Results' : hasFilters ? 'Filtered' : 'All recipes'}
          right={
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 4 }]} testID="result-count">
              {countLabel}
            </Text>
          }
        />
        {filtered.length > 1 && (
          <PressableScale onPress={() => setSortOpen(true)} accessibilityLabel={`Sort recipes. Now: ${SORTS.find((s) => s.value === sort)?.label}`} style={styles.sortBtn} scaleTo={0.96}>
            <Icon name="sort" size={15} color={t.colors.tint} weight="semibold" />
            <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>{SORTS.find((s) => s.value === sort)?.label}</Text>
            <Icon name="chevronDown" size={13} color={t.colors.tint} weight="semibold" />
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
          <View style={[styles.grid, { gap, rowGap: t.spacing.xl }]}>
            {sorted.map((r, i) => (
              <Animated.View key={r.id} layout={LinearTransition.duration(220)} entering={FadeInDown.duration(320).delay(Math.min(i, 8) * 45)}>
                <RecipeCard recipe={r} width={cardWidth} />
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      <Menu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        label="Add a recipe"
        rows={[
          {
            label: 'Import from link',
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

/**
 * The app's signature card: paste a link from TikTok, Instagram, YouTube or a recipe site.
 * Opens the import screen, which reads it.
 */
function ImportBox({ onImport }: { onImport: (url?: string) => void }) {
  const t = useTheme();
  const toast = useToast();
  const [link, setLink] = useState('');
  const value = link.trim();
  const paste = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (text) {
        setLink(text);
        haptics.select();
      } else toast({ message: 'Your clipboard is empty', tone: 'info' });
    } catch {
      toast({ message: 'Couldn’t read the clipboard. Long-press the box to paste.', tone: 'warning' });
    }
  };
  return (
    <View style={[styles.importBox, { backgroundColor: t.isDark ? t.colors.elevated : cook.background, borderRadius: t.radius.xl, ...t.shadow.card }]} testID="import-box">
      <View style={styles.importHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.type.title3, { color: cook.label }]}>Save a recipe from a link</Text>
          <Text style={[t.type.footnote, { color: cook.secondaryLabel }]}>TikTok, Instagram, YouTube or any recipe site</Text>
        </View>
        <View style={[styles.importIcon, { backgroundColor: t.colors.success }]}>
          <Icon name="link" size={18} color="#FFFFFF" weight="bold" />
        </View>
      </View>
      <View style={styles.importField}>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="Paste a link"
          placeholderTextColor="rgba(255,255,255,0.75)"
          style={[t.type.body, styles.importInput, { color: '#FFFFFF' }]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => value && onImport(value)}
          accessibilityLabel="Recipe link"
        />
        {!value && (
          // Just an icon: a second "Paste" word next to the hint looked like a glitch on narrow phones.
          <PressableScale onPress={paste} accessibilityLabel="Paste link from clipboard" style={styles.pasteBtn}>
            <Icon name="paste" size={18} color="#FFFFFF" weight="semibold" />
          </PressableScale>
        )}
        <Chunky onPress={() => onImport(value || undefined)} accessibilityLabel={value ? 'Import recipe' : 'Open recipe import'} face={t.colors.reward} faceStyle={styles.importBtn}>
          <Text style={[t.type.subhead, { color: t.colors.onReward, fontFamily: t.fonts.extrabold }]}>Import</Text>
          <Icon name="arrowRight" size={14} color={t.colors.onReward} weight="bold" />
        </Chunky>
      </View>
    </View>
  );
}

/** A cookbook cover: up to four food photos as a collage, then its name and size. */
function CookbookTile({ id, name, recipes, width }: { id: string; name: string; recipes: Recipe[]; width: number }) {
  const t = useTheme();
  const covers = recipes.slice(0, 4);
  const empty = covers.length === 0;
  const fav = id === FAVORITES_ID;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/cookbook/[id]', params: { id } })}
      accessibilityLabel={`${name} cookbook, ${recipes.length} recipes`}
      style={[styles.book, { width, backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}
    >
      <View style={[styles.covers, { backgroundColor: empty ? t.colors.tintSoft : t.colors.imagePlaceholder }]}>
        {empty ? (
          <Icon name={fav ? 'heart' : 'book'} size={30} color={t.colors.tint} weight="semibold" />
        ) : (
          covers.map((r, i) => {
            // One photo fills the cover; two side by side; three: one wide on top and two below; four as a grid.
            const w = width - 12;
            const n = covers.length;
            const wide = n === 1 || (n === 3 && i === 0);
            const size = { width: wide ? w : w / 2, height: n <= 2 ? COVER_H : COVER_H / 2 };
            return (
              <View key={r.id} style={[size, { overflow: 'hidden' }]}>
                <RecipePhoto recipe={r} iconSize={16} />
              </View>
            );
          })
        )}
      </View>
      <View style={styles.bookText}>
        {fav && <Icon name="heartFill" size={14} color={t.colors.accent} />}
        <Text style={[t.type.title3, { color: t.colors.label, fontSize: 17, flexShrink: 1 }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, paddingHorizontal: 12 }]} numberOfLines={1}>
        {empty ? (fav ? 'Tap ♥ on a recipe to save it' : 'Nothing yet') : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
      </Text>
    </PressableScale>
  );
}

/** Height of a cookbook cover collage. */
const COVER_H = 120;

const styles = StyleSheet.create({
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginBottom: 16, borderCurve: 'continuous' },
  reminderBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  band: { marginTop: 36, paddingVertical: 24 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44, marginTop: -10, marginBottom: 8 },
  rail: { paddingBottom: 4 },
  book: { borderCurve: 'continuous', paddingBottom: 12, minHeight: 164 },
  newBook: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
  newIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  covers: { height: COVER_H, margin: 6, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  bookText: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, marginTop: 6 },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center', minHeight: 52 },
  chipDivider: { width: 2, height: 24, marginHorizontal: 4, borderRadius: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  importBox: { padding: 16, gap: 14, borderCurve: 'continuous' },
  surprise: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 8 },
  importHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  importIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  importField: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingLeft: 18, paddingRight: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderCurve: 'continuous' },
  importInput: { flex: 1, minWidth: 0, alignSelf: 'stretch', minHeight: 44, paddingVertical: 0, outlineStyle: 'none' } as never,
  pasteBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16 },
});
