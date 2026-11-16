import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { MascotSays } from '../../../components/mascot/MascotSays';
import { FoodIcon } from '../../../components/FoodIcon';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipePhoto, openRecipe } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, Chip, EmptyState } from '../../../components/ui';
import { haptics } from '../../../lib/haptics';
import { COMMON_ITEMS, smartSuggestions, suggestionsFor, whatCanICook, type PantryMatch } from '../../../lib/pantry';
import { showPaywall, useProGate } from '../../../lib/pro';
import { ScreenTitle, useTabContent } from '../../../navigation/screenOptions';
import { FREE_LIMITS, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';

/** What's in your kitchen, and what you can cook with it. */
export default function PantryScreen() {
  const t = useTheme();
  const toast = useToast();
  const { pantry, addPantry, removePantry, restorePantry, allRecipes, addIngredients } = useStore();
  const { isPro, canAddPantry } = useProGate();
  const [query, setQuery] = useState('');
  const content = useTabContent();

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
    ? { text: 'What’s in your cupboards?', mood: 'thinking' as const }
    : ready
      ? { text: `Yay! You can cook ${ready} ${ready === 1 ? 'recipe' : 'recipes'} now!`, mood: 'happy' as const }
      : { text: 'So close! Just a few things missing.', mood: 'happy' as const };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.colors.background }}
      contentContainerStyle={content}
    >
      <ScreenTitle title="Pantry" />
      <MascotSays line={line} size={88} style={{ marginBottom: t.layout.gap }} />

      {/* Add */}
      <View style={[styles.addRow, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
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
            <Chip key={name} label={name} leading={<FoodIcon name={name} size={18} bare />} toggle={false} accessibilityLabel={`Add ${name}`} onPress={() => add(name)} />
          ))}
        </View>
      )}

      {!query && common.length > 0 && (
        <>
          <Text style={[t.type.subhead, styles.label, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Tap to add</Text>
          <View style={styles.chips}>
            {common.map((name) => (
              <Chip key={name} label={name} leading={<FoodIcon name={name} size={18} bare />} toggle={false} accessibilityLabel={`Add ${name}`} onPress={() => add(name)} />
            ))}
          </View>
        </>
      )}

      {/* Your items */}
      <View style={styles.headerRow}>
        <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
          In your pantry
        </Text>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="pantry-count">
          {isPro ? `${pantry.length} items` : `${pantry.length} of ${FREE_LIMITS.pantry}`}
        </Text>
      </View>
      {pantry.length === 0 ? (
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 8 }]}>Nothing yet. Add a few things you have at home to see what you can cook.</Text>
      ) : (
        <Animated.View layout={LinearTransition.duration(200)} style={styles.chips}>
          {pantry.map((name) => (
            <Animated.View key={name} entering={FadeIn.duration(180)}>
              <Chip label={name} leading={<FoodIcon name={name} size={18} bare />} trailing="close" toggle={false} accessibilityLabel={`Remove ${name}`} onPress={() => remove(name)} />
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
          <Text style={[t.type.title2, { color: t.colors.label, marginTop: 32, marginBottom: 4 }]} accessibilityRole="header">
            What can I cook?
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>Sorted by how much you already have. Salt, pepper and water are assumed.</Text>

          {/* Smart suggestions */}
          {suggestions.length > 0 &&
            (isPro ? (
              <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card, marginBottom: 16 }]} testID="smart-suggestions">
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
        <Button label="Add missing to groceries" icon="cartAdd" size="medium" variant="tinted" onPress={onAddMissing} accessibilityLabel={`Add missing for ${recipe.title} to Groceries`} style={{ marginTop: 12, alignSelf: 'stretch' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, minHeight: 50, borderRadius: 16, borderCurve: 'continuous' },
  addInput: { flex: 1, minHeight: 48, outlineStyle: 'none' } as never,
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 32, marginBottom: 4 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, marginTop: 12 },
  card: { borderRadius: 20, padding: 16, borderCurve: 'continuous' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  match: { marginBottom: 12 },
  matchTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
});
