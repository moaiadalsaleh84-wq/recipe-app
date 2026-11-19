import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { FoodIcon } from '../../../components/FoodIcon';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipePhoto, openRecipe } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, Chip, EmptyState, IconButton, ProgressBar, Section, SectionHeader, Separator } from '../../../components/ui';
import { haptics } from '../../../lib/haptics';
import { COMMON_ITEMS, PANTRY_CATEGORIES, pantryCategory, smartSuggestions, suggestionsFor, whatCanICook, type PantryMatch } from '../../../lib/pantry';
import { showPaywall, useProGate } from '../../../lib/pro';
import { TabScreen } from '../../../components/TabScreen';
import { FREE_LIMITS, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

/** What's in your kitchen, and what you can cook with it. */
export default function PantryScreen() {
  const t = useTheme();
  const toast = useToast();
  const { pantry, addPantry, removePantry, restorePantry, allRecipes, addIngredients } = useStore();
  const { isPro, canAddPantry } = useProGate();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => whatCanICook(allRecipes, pantry), [allRecipes, pantry]);
  const suggestions = useMemo(() => smartSuggestions(matches), [matches]);
  const typed = useMemo(() => suggestionsFor(query, allRecipes, pantry), [query, allRecipes, pantry]);
  const common = COMMON_ITEMS.filter((c) => !pantry.some((p) => p.toLowerCase() === c.toLowerCase())).slice(0, 8);
  const ready = matches.filter((m) => m.missing.length === 0).length;

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (!canAddPantry) {
      showPaywall('pantry');
      return;
    }
    if (addPantry(clean)) {
      haptics.select();
      setQuery('');
    } else {
      toast({ message: `${clean} is already in your pantry`, tone: 'info' });
    }
  };

  const remove = (name: string) => {
    const before = pantry;
    removePantry(name);
    toast({ message: `Removed ${name}`, icon: 'trash', tone: 'info', action: { label: 'Undo', onPress: () => restorePantry(before) } });
  };

  const addMissing = (m: PantryMatch) => {
    const n = addIngredients(m.recipe.id, m.missing);
    haptics.success();
    toast({ message: `Added ${n} ${n === 1 ? 'item' : 'items'} for ${m.recipe.title}`, icon: 'cartAdd', action: { label: 'View', onPress: () => router.navigate('/groceries') } });
  };

  // Your items, grouped by kitchen category. Typing in the box also narrows the list.
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const shownItems = q ? pantry.filter((p) => p.toLowerCase().includes(q)) : pantry;
    return PANTRY_CATEGORIES.map((cat) => ({ cat, items: shownItems.filter((p) => pantryCategory(p) === cat).sort((a, b) => a.localeCompare(b)) })).filter((g) => g.items.length > 0);
  }, [pantry, q]);

  return (
    <TabScreen title="Pantry" kicker={pantry.length ? `${pantry.length} ${pantry.length === 1 ? 'thing' : 'things'} at home` : 'What’s in your kitchen?'} keyboardShouldPersistTaps="handled">
      {/* Add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => add(query)}
          placeholder={pantry.length ? 'Add or find an item' : 'Add what you have, e.g. eggs'}
          placeholderTextColor={t.colors.tertiaryLabel}
          returnKeyType="done"
          accessibilityLabel="Add a pantry item"
          style={[t.type.body, styles.addInput, { color: t.colors.label }]}
        />
        {query.trim() ? (
          <PressableScale onPress={() => add(query)} accessibilityLabel={`Add ${query.trim()}`} style={[styles.addBtn, { backgroundColor: t.colors.tintFill }]}>
            <Icon name="plus" size={18} color={t.colors.onTint} weight="bold" />
          </PressableScale>
        ) : null}
      </View>

      {typed.length > 0 && (
        <View style={styles.chips}>
          {typed.map((name) => (
            <Chip key={name} label={name} icon="plus" toggle={false} accessibilityLabel={`Add ${name}`} onPress={() => add(name)} />
          ))}
        </View>
      )}

      {!query && common.length > 0 && (
        <>
          <Text style={[t.type.subhead, styles.label, { color: t.colors.secondaryLabel, fontFamily: t.fonts.bold }]}>Tap to add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.quick}>
            {common.map((name) => (
              <Chip key={name} label={name} icon="plus" toggle={false} accessibilityLabel={`Add ${name}`} onPress={() => add(name)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Your items */}
      <SectionHeader
        title="In your pantry"
        subtitle={pantry.length ? 'Grouped by where it lives in the kitchen' : undefined}
        right={
          // The count only matters near the free limit.
          !isPro && pantry.length >= FREE_LIMITS.pantry - 3 ? (
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 4 }]} testID="pantry-count">
              {pantry.length} of {FREE_LIMITS.pantry}
            </Text>
          ) : undefined
        }
      />
      {pantry.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <EmptyState icon="fridge" photos={['mushroom-spaghetti', 'chicken-fried-rice', 'masala-dosa']} title="Your pantry is empty" message="Add what’s in your kitchen. You’ll see which recipes you can cook and what’s missing." />
          <Text style={styles.hidden} testID="pantry-empty">Your pantry is empty</Text>
        </View>
      ) : groups.length === 0 ? (
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 8 }]}>Nothing in your pantry matches “{query.trim()}”.</Text>
      ) : (
        // One list with a small header per category, like the aisles on the grocery list.
        <Animated.View layout={LinearTransition.duration(200)} style={{ marginTop: 8 }}>
          <Section>
            {groups.map(({ cat, items }, gi) => (
              <View key={cat}>
                <View style={[styles.groupLabel, { backgroundColor: t.colors.fill }, gi > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.colors.separator }]}>
                  <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.display, fontWeight: 'normal' }]} accessibilityRole="header">
                    {cat}
                  </Text>
                </View>
                {items.map((name, i) => (
                  <Animated.View key={name} entering={FadeIn.duration(180)}>
                    {i > 0 && <Separator inset={52} />}
                    <View style={styles.itemRow}>
                      <FoodIcon name={name} size={22} bare />
                      <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{name}</Text>
                      <IconButton icon="close" accessibilityLabel={`Remove ${name}`} color={t.colors.secondaryLabel} iconSize={13} onPress={() => remove(name)} />
                    </View>
                  </Animated.View>
                ))}
              </View>
            ))}
          </Section>
        </Animated.View>
      )}
      {!isPro && pantry.length >= FREE_LIMITS.pantry && (
        <PressableScale onPress={() => showPaywall('pantry')} accessibilityLabel="Unlock an unlimited pantry" style={[styles.limit, { backgroundColor: t.colors.tintSoft }]}>
          <Icon name="lock" size={16} color={t.colors.tint} />
          <Text style={[t.type.footnote, { color: t.colors.tint, flex: 1, fontFamily: t.fonts.semibold }]}>The free pantry holds {FREE_LIMITS.pantry} items. Pro has no limit.</Text>
        </PressableScale>
      )}

      {/* What can I cook */}
      {pantry.length > 0 && (
        <>
          <View style={[styles.cookBand, { backgroundColor: t.isDark ? t.colors.cell : t.colors.imagePlaceholder }]}>
          <SectionHeader title="What can I cook?" style={{ marginTop: 0 }} />
          <Text style={[t.type.subhead, { color: ready ? t.colors.successText : t.colors.secondaryLabel, marginBottom: 2, fontFamily: t.fonts.semibold }]} testID="ready-count">
            {ready ? `You can cook ${ready} ${ready === 1 ? 'recipe' : 'recipes'} right now` : 'You’re a few items away from these'}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>Sorted by how much you already have. Salt, pepper and water are assumed.</Text>

          {/* Smart suggestions */}
          {suggestions.length > 0 &&
            (isPro ? (
              <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card, marginBottom: 16 }]} testID="smart-suggestions">
                <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 6 }]}>Buy one thing, cook more</Text>
                {suggestions.map((s) => (
                  <Text key={s.name} style={[t.type.subhead, { color: t.colors.secondaryLabel, paddingVertical: 3 }]}>
                    <Text style={{ color: t.colors.label, fontFamily: t.fonts.bold }}>{s.name}</Text> → {s.completes.map((r) => r.title).join(', ')}
                  </Text>
                ))}
              </View>
            ) : (
              <PressableScale onPress={() => showPaywall('pantry')} accessibilityLabel="Smart suggestions, Pro" style={[styles.card, styles.locked, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
                <Icon name="lock" size={18} color={t.colors.tint} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.headline, { color: t.colors.label }]}>Buy one thing, cook more</Text>
                  <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                    With Pro, see which single item would let you cook {suggestions[0].completes.length === 1 ? 'another recipe' : `${suggestions[0].completes.length} more recipes`}.
                  </Text>
                </View>
              </PressableScale>
            ))}

          {matches.length === 0 ? (
            <EmptyState icon="pot" title="No matches yet" message="None of your recipes use these items. Add a few more, or import a recipe you love." />
          ) : (
            matches.map((m, i) => (
              <Animated.View key={m.recipe.id} entering={FadeInDown.duration(300).delay(Math.min(i, 6) * 50)}>
                <MatchCard match={m} onAddMissing={() => addMissing(m)} />
              </Animated.View>
            ))
          )}
          </View>
        </>
      )}
    </TabScreen>
  );
}

/** A recipe you could cook: its photo, how much you already have (a meter), and what's missing. */
function MatchCard({ match, onAddMissing }: { match: PantryMatch; onAddMissing: () => void }) {
  const t = useTheme();
  const { recipe, have, missing, needed } = match;
  const shown = missing.slice(0, 4).map((i) => i.name.toLowerCase());
  const more = missing.length - shown.length;
  const ready = missing.length === 0;
  return (
    <View style={[styles.card, styles.match, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${recipe.title}, you have ${have.length} of ${needed}`} style={styles.matchTop}>
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} iconSize={22} />
        </View>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <Text style={[t.type.title3, { color: t.colors.label }]}>{recipe.title}</Text>
          <View style={styles.meterRow}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={have.length / Math.max(1, needed)} height={6} color={ready ? t.colors.success : t.colors.reward} label={`You have ${have.length} of ${needed}`} />
            </View>
            <Text style={[t.type.footnote, { color: ready ? t.colors.successText : t.colors.secondaryLabel, fontFamily: t.fonts.bold }]}>
              {ready ? 'Ready' : `${have.length} of ${needed}`}
            </Text>
          </View>
          {missing.length > 0 && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="missing">
              Missing: {shown.join(', ')}
              {more > 0 ? ` +${more} more` : ''}
            </Text>
          )}
        </View>
      </PressableScale>
      {missing.length > 0 && (
        <Button label="Add missing to groceries" icon="cartAdd" size="medium" variant="tinted" onPress={onAddMissing} accessibilityLabel={`Add missing for ${recipe.title} to Groceries`} style={{ marginTop: 12, alignSelf: 'stretch' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 4, minHeight: 52, borderRadius: 999, borderCurve: 'continuous' },
  quick: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  emptyCard: { borderRadius: 24, marginTop: 4, borderCurve: 'continuous' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  cookBand: { marginTop: 36, marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 24 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: { flex: 1, minHeight: 48, outlineStyle: 'none' } as never,
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, marginTop: 8, borderCurve: 'continuous' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 16, paddingRight: 4, minHeight: 52 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 32, marginBottom: 4 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, marginTop: 12 },
  card: { borderRadius: 20, padding: 16, borderCurve: 'continuous' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  match: { marginBottom: 12 },
  matchTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 92, height: 92, borderRadius: 16, overflow: 'hidden', borderCurve: 'continuous' },
});
