import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { enter } from '../../../motion';
import { FoodIcon } from '../../../components/FoodIcon';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { RecipePhoto, openRecipe } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, Chip, EmptyState, IconButton, ProgressBar, Section, SectionHeader, Separator } from '../../../components/ui';
import { Lift, PopCard } from '../../../components/pop';
import { haptics } from '../../../lib/haptics';
import { noWidow } from '../../../lib/text';
import { COMMON_ITEMS, PANTRY_CATEGORIES, pantryCategory, pantryHas, smartSuggestions, suggestionsFor, whatCanICook, type PantryMatch } from '../../../lib/pantry';
import { showPaywall, useProGate } from '../../../lib/pro';
import { TabScreen } from '../../../components/TabScreen';
import { FREE_LIMITS, useStore } from '../../../state/store';
import { popCycle, useTheme } from '../../../theme';

/** What's in your kitchen, and what you can cook with it. */
export default function PantryScreen() {
  const reduceMotion = useReducedMotion();
  const t = useTheme();
  const toast = useToast();
  const { pantry, addPantry, removePantry, restorePantry, allRecipes, addIngredients } = useStore();
  const { isPro, canAddPantry } = useProGate();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => whatCanICook(allRecipes, pantry), [allRecipes, pantry]);
  const suggestions = useMemo(() => smartSuggestions(matches), [matches]);
  const typed = useMemo(() => suggestionsFor(query, allRecipes, pantry), [query, allRecipes, pantry]);
  // Skips what you already have, also by another name ("Onions" when "Onion" is in).
  const common = COMMON_ITEMS.filter((c) => !pantryHas(pantry, c)).slice(0, 8);
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
      <Reveal index={0}>
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
        <TextInput maxFontSizeMultiplier={1.3}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => add(query)}
          placeholder={pantry.length ? 'Add or find an item' : 'Add what you have, e.g. eggs'}
          placeholderTextColor={t.colors.tertiaryLabel}
          returnKeyType="done"
          accessibilityLabel="Add a pantry item"
          style={[t.type.input, styles.addInput, { color: t.colors.label }]}
        />
        {query.trim() ? (
          <PressableScale onPress={() => add(query)} accessibilityLabel={`Add ${query.trim()}`} style={[styles.addBtn, { backgroundColor: t.colors.tintFill, borderColor: t.pop.ink }]}>
            <Icon name="plus" size={18} color={t.colors.onTint} weight="bold" />
          </PressableScale>
        ) : null}
      </View>
      </Reveal>

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -t.layout.screen }} contentContainerStyle={[styles.quick, { paddingHorizontal: t.layout.screen }]} keyboardShouldPersistTaps="handled">
            {common.map((name) => (
              <Chip key={name} label={name} icon="plus" toggle={false} accessibilityLabel={`Add ${name}`} onPress={() => add(name)} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Your items */}
      <SectionHeader
        title="In your pantry"
        subtitle={pantry.length ? noWidow('Grouped by where it lives in the kitchen') : undefined}
        right={
          // The count only matters near the free limit.
          !isPro && pantry.length >= FREE_LIMITS.pantry - 3 ? (
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginBottom: 4 }]} testID="pantry-count">
              {`${pantry.length} of ${FREE_LIMITS.pantry}\u00A0free`}
            </Text>
          ) : undefined
        }
      />
      {pantry.length === 0 ? (
        // One calm card: no stacked photos, and its text never runs under the tab bar.
        <PopCard color={t.pop.lilacTint} contentStyle={styles.emptyCard}>
          <Text style={[t.type.title2, { color: t.colors.label }]} testID="pantry-empty">
            Your pantry is empty
          </Text>
          <Text style={[t.type.body, t.noWidows.style, { color: t.colors.label }]} {...t.noWidows.props}>
            Add a few things you have at home. You’ll see which recipes you can cook right now, and what’s missing.
          </Text>
        </PopCard>
      ) : groups.length === 0 ? (
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 8 }]}>Nothing in your pantry matches “{query.trim()}”.</Text>
      ) : (
        // One list with a small header per category, like the aisles on the grocery list.
        <Animated.View layout={LinearTransition.duration(200)} entering={FadeInDown.duration(420).delay(140)} style={{ marginTop: 8 }}>
          <Section>
            {groups.map(({ cat, items }, gi) => (
              <View key={cat}>
                <View style={[styles.groupLabel, { backgroundColor: popCycle[gi % popCycle.length].tint }, gi > 0 && { borderTopWidth: 2, borderTopColor: t.pop.ink }]}>
                  <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.black }]} accessibilityRole="header">
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
        <PressableScale onPress={() => showPaywall('pantry')} accessibilityLabel="Unlock an unlimited pantry" style={[styles.limit, { backgroundColor: t.colors.tintSoft, borderColor: t.pop.ink }]}>
          <Icon name="lock" size={16} color={t.colors.tint} />
          <Text style={[t.type.footnote, { color: t.colors.tint, flex: 1 }]}>The free pantry holds {FREE_LIMITS.pantry} items. Pro has no limit.</Text>
        </PressableScale>
      )}

      {/* What can I cook */}
      {pantry.length > 0 && (
        <>
          <View style={[styles.cookBand, { backgroundColor: t.pop.leafTint, borderColor: t.pop.ink, marginHorizontal: -t.layout.screen, paddingHorizontal: t.layout.screen }]}>
          <SectionHeader title="What can I cook?" style={{ marginTop: 0 }} />
          <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 2 }]} testID="ready-count">
            {ready ? `You can cook ${ready} ${ready === 1 ? 'recipe' : 'recipes'} right now` : 'You’re a few items away from these'}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.label, marginBottom: 14 }]}>Sorted by how much you already have. Salt, pepper and water are assumed.</Text>

          {/* Smart suggestions */}
          {suggestions.length > 0 &&
            (isPro ? (
              <Lift radius={20} style={{ marginBottom: 16 }}>
                <View style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: 20, ...t.chunky.card }]} testID="smart-suggestions">
                  <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 6 }]}>Buy one thing, cook more</Text>
                  {suggestions.map((s) => (
                    <Text key={s.name} style={[t.type.subhead, { color: t.colors.secondaryLabel, paddingVertical: 3 }]}>
                      <Text style={{ color: t.colors.label, fontFamily: t.fonts.bold }}>{s.name}</Text> → {s.completes.map((r) => r.title).join(', ')}
                    </Text>
                  ))}
                </View>
              </Lift>
            ) : (
              <Lift radius={20} style={{ marginBottom: 14 }}>
                <PressableScale onPress={() => showPaywall('pantry')} accessibilityLabel="Smart suggestions, Pro" style={[styles.card, styles.locked, { backgroundColor: t.colors.cell, borderRadius: 20, ...t.chunky.card }]}>
                  <Icon name="lock" size={18} color={t.colors.tint} />
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.headline, { color: t.colors.label }]}>Buy one thing, cook more</Text>
                    <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                      With Pro, see which single item would let you cook {suggestions[0].completes.length === 1 ? 'another recipe' : `${suggestions[0].completes.length} more recipes`}.
                    </Text>
                  </View>
                </PressableScale>
              </Lift>
            ))}

          {matches.length === 0 ? (
            <EmptyState icon="pot" title="No matches yet" message="None of your recipes use these items. Add a few more, or import a recipe you love." />
          ) : (
            matches.map((m, i) => (
              <Animated.View key={m.recipe.id} entering={enter(i, reduceMotion)}>
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
    <PopCard style={styles.match} contentStyle={styles.card}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${recipe.title}, you have ${have.length} of ${needed}`} style={styles.matchTop}>
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder, borderColor: t.pop.ink }]}>
          <RecipePhoto recipe={recipe} iconSize={22} radius={13.5} square />
        </View>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <Text style={[t.type.title3, { color: t.colors.label }]}>{recipe.title}</Text>
          <View style={styles.meterRow}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={have.length / Math.max(1, needed)} height={8} color={ready ? t.pop.leaf : t.pop.sunshine} label={`You have ${have.length} of ${needed}`} />
            </View>
            <Text style={[t.type.footnote, { color: t.colors.label, fontFamily: t.fonts.black }]}>
              {ready ? 'Ready' : `${have.length} of ${needed}`}
            </Text>
          </View>
          {missing.length > 0 && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="missing">
              {`Missing: ${shown.join(', ')}${more > 0 ? ` +${more}\u00A0more` : ''}`}
            </Text>
          )}
        </View>
      </PressableScale>
      {missing.length > 0 && (
        <Button label="Add missing to list" icon="cartAdd" size="medium" variant="tinted" onPress={onAddMissing} accessibilityLabel={`Add missing for ${recipe.title} to Groceries`} style={{ marginTop: 12, alignSelf: 'stretch' }} />
      )}
    </PopCard>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, minHeight: 54, borderRadius: 18, borderCurve: 'continuous' },
  quick: { gap: 8, paddingVertical: 4 },
  emptyCard: { padding: 18, gap: 10 },
  cookBand: { marginTop: 36, paddingVertical: 24, borderTopWidth: 2.5, borderBottomWidth: 2.5 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: { flex: 1, minHeight: 48, outlineStyle: 'none' } as never,
  addBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  groupLabel: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 16, paddingRight: 4, minHeight: 52 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, borderWidth: 2, marginTop: 12 },
  card: { padding: 14 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  match: { marginBottom: 12 },
  matchTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  thumb: { width: 84, height: 84, borderRadius: 16, borderWidth: 2.5, overflow: 'hidden', borderCurve: 'continuous' },
});
