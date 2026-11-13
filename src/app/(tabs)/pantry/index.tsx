import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { CatSays } from '../../../components/cats/CatSays';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipePhoto, openRecipe } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, EmptyState } from '../../../components/ui';
import { haptics } from '../../../lib/haptics';
import { COMMON_ITEMS, smartSuggestions, suggestionsFor, whatCanICook, type PantryMatch } from '../../../lib/pantry';
import { showPaywall, useProGate } from '../../../lib/pro';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { FREE_LIMITS, useBuddy, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

/** What's in your kitchen, and what you can cook with it. */
export default function PantryScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { pantry, addPantry, removePantry, restorePantry, allRecipes, addIngredients } = useStore();
  const { isPro, canAddPantry } = useProGate();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => whatCanICook(allRecipes, pantry), [allRecipes, pantry]);
  const suggestions = useMemo(() => smartSuggestions(matches), [matches]);
  const typed = useMemo(() => suggestionsFor(query, allRecipes, pantry), [query, allRecipes, pantry]);
  const common = COMMON_ITEMS.filter((c) => !pantry.some((p) => p.toLowerCase() === c.toLowerCase())).slice(0, 12);
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

  const line = !pantry.length
    ? { text: buddy === 'tank' ? 'What’s in the fridge, champ? Let’s use it before it goes off.' : 'Ooh, what’s in the cupboards? Tell me and I’ll find a recipe!', mood: 'think' as const }
    : ready
      ? { text: buddy === 'tank' ? `You can cook ${ready} ${ready === 1 ? 'recipe' : 'recipes'} right now. No excuses.` : `Yay! ${ready} ${ready === 1 ? 'recipe is' : 'recipes are'} ready to cook right now!`, mood: 'happy' as const }
      : { text: buddy === 'tank' ? 'Close on a few. One quick shop and you’re cooking.' : 'So close! A couple of things and we’re cooking.', mood: 'nod' as const };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.colors.groupedBackground }}
      contentContainerStyle={styles.content}
    >
      <ScreenTitle title="Pantry" />
      <CatSays buddy={buddy} line={line} size={86} style={{ marginBottom: 14 }} />

      {/* Add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="search" size={18} color={t.colors.secondaryLabel} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => add(query)}
          placeholder="Add what you have, e.g. eggs"
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
            <QuickChip key={name} label={name} onPress={() => add(name)} />
          ))}
        </View>
      )}

      {!query && common.length > 0 && (
        <>
          <Text style={[t.type.footnote, styles.label, { color: t.colors.secondaryLabel }]}>COMMON ITEMS</Text>
          <View style={styles.chips}>
            {common.map((name) => (
              <QuickChip key={name} label={name} onPress={() => add(name)} />
            ))}
          </View>
        </>
      )}

      {/* Your items */}
      <View style={styles.headerRow}>
        <Text style={[t.type.title3, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
          In your pantry
        </Text>
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="pantry-count">
          {isPro ? `${pantry.length} items` : `${pantry.length} of ${FREE_LIMITS.pantry}`}
        </Text>
      </View>
      {pantry.length === 0 ? (
        <EmptyState cat={{ buddy, mood: 'think' }} icon="cart" title="Your pantry is empty" message="Add a few things you have at home, and we’ll show what you can cook with them." />
      ) : (
        <Animated.View layout={LinearTransition.duration(200)} style={styles.chips}>
          {pantry.map((name) => (
            <Animated.View key={name} entering={FadeIn.duration(180)}>
              <PressableScale onPress={() => remove(name)} accessibilityLabel={`Remove ${name}`} style={[styles.item, { backgroundColor: t.colors.cell, borderColor: t.colors.border }]}>
                <Text style={[t.type.subhead, { color: t.colors.label, fontWeight: '600' }]}>{name}</Text>
                <Icon name="close" size={13} color={t.colors.secondaryLabel} weight="bold" />
              </PressableScale>
            </Animated.View>
          ))}
        </Animated.View>
      )}
      {!isPro && pantry.length >= FREE_LIMITS.pantry && (
        <PressableScale onPress={() => showPaywall('pantry')} accessibilityLabel="Unlock an unlimited pantry" style={[styles.limit, { backgroundColor: t.colors.tintSoft }]}>
          <Icon name="lock" size={16} color={t.colors.tint} />
          <Text style={[t.type.footnote, { color: t.colors.tint, flex: 1, fontWeight: '600' }]}>The free pantry holds {FREE_LIMITS.pantry} items. Pro has no limit.</Text>
        </PressableScale>
      )}

      {/* What can I cook */}
      {pantry.length > 0 && (
        <>
          <Text style={[t.type.title2, { color: t.colors.label, marginTop: 28, marginBottom: 4 }]} accessibilityRole="header">
            What can I cook?
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>Sorted by how much you already have. Salt, pepper and water are assumed.</Text>

          {/* Smart suggestions */}
          {suggestions.length > 0 &&
            (isPro ? (
              <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card, marginBottom: 14 }]} testID="smart-suggestions">
                <Text style={[t.type.headline, { color: t.colors.label, marginBottom: 6 }]}>Buy one thing, cook more</Text>
                {suggestions.map((s) => (
                  <Text key={s.name} style={[t.type.subhead, { color: t.colors.secondaryLabel, paddingVertical: 3 }]}>
                    <Text style={{ color: t.colors.label, fontWeight: '700' }}>{s.name}</Text> → {s.completes.map((r) => r.title).join(', ')}
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
            matches.map((m) => <MatchCard key={m.recipe.id} match={m} onAddMissing={() => addMissing(m)} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`Add ${label}`} style={[styles.quick, { backgroundColor: t.colors.tintSoft }]}>
      <Icon name="plus" size={12} color={t.colors.tint} weight="bold" />
      <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]}>{label}</Text>
    </PressableScale>
  );
}

function MatchCard({ match, onAddMissing }: { match: PantryMatch; onAddMissing: () => void }) {
  const t = useTheme();
  const { recipe, have, missing, needed } = match;
  const shown = missing.slice(0, 4).map((i) => i.name.toLowerCase());
  const more = missing.length - shown.length;
  return (
    <View style={[styles.card, styles.match, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${recipe.title}, you have ${have.length} of ${needed}`} style={styles.matchTop}>
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} iconSize={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: missing.length ? t.colors.secondaryLabel : t.colors.success, fontWeight: '600' }]}>
            {missing.length ? `You have ${have.length} of ${needed}` : 'You have everything'}
          </Text>
          {missing.length > 0 && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} numberOfLines={2} testID="missing">
              Missing: {shown.join(', ')}
              {more > 0 ? ` +${more} more` : ''}
            </Text>
          )}
        </View>
      </PressableScale>
      {missing.length > 0 && (
        <Button label="Add missing to Groceries" icon="cartAdd" size="medium" variant="tinted" onPress={onAddMissing} accessibilityLabel={`Add missing for ${recipe.title} to Groceries`} style={{ marginTop: 10 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, width: '100%', maxWidth: 900, alignSelf: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6, minHeight: 52, borderRadius: 16, borderCurve: 'continuous' },
  addInput: { flex: 1, minHeight: 48, outlineStyle: 'none' } as never,
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', marginTop: 16, marginBottom: 6, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, minHeight: 44, borderRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 24 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: 22, borderWidth: 1.5 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginTop: 12 },
  card: { borderRadius: 18, padding: 14, borderCurve: 'continuous' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  match: { marginBottom: 12 },
  matchTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
});
