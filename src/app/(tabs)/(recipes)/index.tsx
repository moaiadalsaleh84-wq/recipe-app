import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Mascot } from '../../../components/mascot/Mascot';
import { MascotSays } from '../../../components/mascot/MascotSays';
import { greetingSituation, say } from '../../../components/mascot/lines';
import { Chunky } from '../../../components/Chunky';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { FeaturedCard, RecipeCard, RecipePhoto } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Chip, EmptyState, IconButton, SearchField } from '../../../components/ui';
import { FAVORITES_ID, categories, filterTags, matchesFilter, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { showPaywall, useProGate } from '../../../lib/pro';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../lib/purchases';
import { TabScreen } from '../../../components/TabScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
/** Days since 1970, so the recipe of the day really changes daily. */
const dayNumber = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

export default function RecipesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { category, setCategory, tags, toggleTag, clearFilters, plan, allRecipes, getRecipe, favorites, cookbooks, profile } = useStore();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tip, setTip] = useState(-1); // -1 = greeting, then cycles tips
  const [petLine, setPetLine] = useState<ReturnType<typeof say> | null>(null);
  const { canAddRecipe, canAddCookbook, canImport, trialDaysLeft } = useProGate();
  const [reminderHidden, setReminderHidden] = useState(false);
  // Keeps the paywall's promise: a reminder in the app before the trial ends.
  const showTrialReminder = !reminderHidden && trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft <= 2;
  // The screen's one main action: add a recipe (import from a link, or write your own).
  const addButton = (
    <Chunky onPress={() => setMenuOpen(true)} accessibilityLabel="Add a recipe" face={t.colors.tintFill} lip={t.colors.tintDeep} depth={t.depth.small} radius={t.radius.pill} faceStyle={styles.addBtn}>
      <Icon name="plus" size={16} color={t.colors.onTint} weight="bold" />
      <Text style={[t.type.subhead, { color: t.colors.onTint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Add</Text>
    </Chunky>
  );

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
  const mains = allRecipes.filter((r) => r.category !== 'Dessert');
  const featured = tonight ?? mains[dayNumber % Math.max(1, mains.length)] ?? allRecipes[0];
  const firstName = profile.name.trim().split(/\s+/)[0] ?? '';
  // Decided once per visit: now and then Biscuit greets you with something new.
  const [surprise] = useState(() => Math.random());
  const line = tip < 0 ? say(greetingSituation(), { name: firstName }, dayNumber, surprise) : say('tip', {}, tip);

  const margin = t.layout.screen;
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
    <TabScreen maxWidth={900} title="Recipes" right={addButton} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">

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
            <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700' }]}>Manage</Text>
          </PressableScale>
          <IconButton icon="close" accessibilityLabel="Dismiss trial reminder" iconSize={13} color={t.colors.secondaryLabel} onPress={() => setReminderHidden(true)} />
        </View>
      )}

      {/* 1. A short hello */}
      {showExtras && (
        <MascotSays
          line={petLine ?? line}
          size={88}
          hint="Tap for a tip"
          onNext={() => {
            setPetLine(null);
            setTip((n) => n + 1);
          }}
          onPet={() => setPetLine(say('pet', {}, tip + 1))}
          style={{ marginBottom: t.layout.gap }}
        />
      )}

      {/* 2. Search */}
      <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes or ingredients" />

      {/* 3. Filters: one category at a time, any number of tags */}
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
        {/* 4. Recipe of the day */}
        {showExtras && featured && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
                {tonight ? 'On the menu tonight' : 'Recipe of the day'}
              </Text>
              <Chip label="Surprise me" icon="shuffle" toggle={false} accessibilityLabel="Can't decide? Let Biscuit pick" onPress={() => router.push('/buddy-pick')} />
            </View>
            <FeaturedCard recipe={featured} label={tonight ? 'On the menu tonight' : 'Recipe of the day'} />
          </>
        )}

        {/* 5. Cookbooks: a grid, so no card is ever cut off */}
        {showExtras && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
                Cookbooks
              </Text>
            </View>
            <View style={[styles.grid, { gap }]}>
              {books.map((b) => (
                <CookbookTile key={b.id} id={b.id} name={b.name} width={cardWidth} recipes={b.recipeIds.map((id) => getRecipe(id)).filter((r): r is Recipe => !!r)} />
              ))}
              <PressableScale
                onPress={() => (canAddCookbook ? router.push('/cookbook-edit') : showPaywall('cookbooks'))}
                accessibilityLabel="New cookbook"
                style={[styles.book, styles.newBook, { width: cardWidth, backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}
              >
                <View style={[styles.newIcon, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name="plus" size={20} color={t.colors.tint} weight="bold" />
                </View>
                <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>New cookbook</Text>
              </PressableScale>
            </View>
          </>
        )}

        {/* 6. All recipes */}
        <View style={styles.sectionHeader}>
          <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
            {q ? 'Results' : hasFilters ? 'Filtered' : 'All recipes'}
          </Text>
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="result-count">
            {countLabel}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            cat="oops"
            title="No recipes found"
            message={say('noResults').text}
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
            {filtered.map((r) => (
              <Animated.View key={r.id} layout={LinearTransition.duration(220)} entering={FadeIn.duration(200)}>
                <RecipeCard recipe={r} width={cardWidth} />
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>
      <AddMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onImport={() => {
          setMenuOpen(false);
          if (canImport) router.push('/import');
          else showPaywall('imports');
        }}
        onWrite={() => {
          setMenuOpen(false);
          if (canAddRecipe) router.push('/recipe/new');
          else showPaywall('recipes');
        }}
      />
    </TabScreen>
  );
}

/** The + menu: import from a link, or write a recipe by hand. */
function AddMenu({ visible, onClose, onImport, onWrite }: { visible: boolean; onClose: () => void; onImport: () => void; onWrite: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const rows = [
    { label: 'Import from link', hint: 'TikTok, YouTube, Instagram or any recipe site', icon: 'link' as const, onPress: onImport },
    { label: 'Write my own', hint: 'Type in a family favorite', icon: 'edit' as const, onPress: onWrite },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.menu, { top: insets.top + 64, backgroundColor: t.colors.elevated, ...t.chunky.card }]} accessibilityRole="menu">
        {rows.map((r, i) => (
          <PressableScale key={r.label} onPress={r.onPress} accessibilityLabel={r.label} accessibilityRole="menuitem" style={[styles.menuRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator }]} scaleTo={0.98}>
            <View style={[styles.pickIcon, { backgroundColor: t.colors.tintSoft }]}>
              <Icon name={r.icon} size={18} color={t.colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>{r.label}</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.hint}</Text>
            </View>
          </PressableScale>
        ))}
      </View>
    </Modal>
  );
}

function CookbookTile({ id, name, recipes, width }: { id: string; name: string; recipes: Recipe[]; width: number }) {
  const t = useTheme();
  const covers = recipes.slice(0, 2);
  const empty = covers.length === 0;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/cookbook/[id]', params: { id } })}
      accessibilityLabel={`${name} cookbook, ${recipes.length} recipes`}
      style={[styles.book, { width, backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}
    >
      <View style={[styles.covers, { backgroundColor: empty ? t.colors.tintSoft : t.colors.imagePlaceholder }]}>
        {empty ? (
          // A friendly little picture instead of a grey box.
          <View style={styles.emptyCover}>
            <Mascot mood={id === FAVORITES_ID ? 'love' : 'idle'} size={64} petable={false} hold />
          </View>
        ) : (
          covers.map((r) => (
            <View key={r.id} style={styles.cover}>
              <RecipePhoto recipe={r} iconSize={16} />
            </View>
          ))
        )}
      </View>
      <View style={styles.bookText}>
        {id === FAVORITES_ID && <Icon name="heartFill" size={14} color={t.colors.accent} />}
        <Text style={[t.type.headline, { color: t.colors.label, fontSize: 16, flexShrink: 1 }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, paddingHorizontal: 12 }]} numberOfLines={1}>
        {empty ? (id === FAVORITES_ID ? 'Tap ♥ to save' : 'Nothing yet') : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 16 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginBottom: 16, borderCurve: 'continuous' },
  reminderBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  pickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12, minHeight: 44 },
  book: { borderCurve: 'continuous', paddingBottom: 12, minHeight: 164 },
  // Same size and weight as a cookbook card; only the inside differs.
  newBook: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
  newIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  covers: { height: 88, margin: 8, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  cover: { flex: 1, height: '100%' },
  emptyCover: { marginTop: 14 },
  bookText: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, marginTop: 2 },
  chips: { gap: 8, paddingVertical: 4, alignItems: 'center', minHeight: 52 },
  chipDivider: { width: 2, height: 24, marginHorizontal: 4, borderRadius: 1 },
  menu: { position: 'absolute', right: 16, width: 300, maxWidth: '92%', borderRadius: 20, overflow: 'hidden', borderCurve: 'continuous' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
