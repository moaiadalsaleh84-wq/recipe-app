import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { RecipeRow } from '../components/RecipeCard';
import { useToast } from '../components/Toast';
import { SearchField, Section, Separator } from '../components/ui';
import { meals, type Meal, type Recipe } from '../data/mock';
import { isIOS } from '../navigation/screenOptions';
import { useStore } from '../state/store';
import { useTheme } from '../theme';
import { weekDays } from '../lib/week';

/** Sheet for choosing a recipe for one meal slot. */
export default function PlanPicker() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { setMeal, allRecipes } = useStore();
  const params = useLocalSearchParams<{ day: string; meal: string }>();
  const day = Math.min(6, Math.max(0, Number(params.day) || 0));
  const meal: Meal = meals.includes(params.meal as Meal) ? (params.meal as Meal) : 'Dinner';
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = allRecipes.filter((r) => !q || r.title.toLowerCase().includes(q));
  const suggested = matches.filter((r) => r.category === meal);
  const others = matches.filter((r) => r.category !== meal);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

  const choose = (r: Recipe) => {
    setMeal(day, meal, r.id);
    close();
    toast({ message: `${r.title} added to ${weekDays[day].long}`, icon: 'calendar' });
  };

  const list = (items: Recipe[]) =>
    items.map((r, i) => (
      <View key={r.id}>
        {i > 0 && <Separator inset={84} />}
        <RecipeRow recipe={r} onPress={() => choose(r)} accessibilityHint={`Adds it to ${meal.toLowerCase()} on ${weekDays[day].long}`} />
      </View>
    ));

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <View style={[styles.header, { paddingTop: isIOS ? 14 : insets.top + 8, borderBottomColor: t.colors.separator }]}>
        <PressableScale onPress={close} style={styles.cancel} accessibilityLabel="Cancel">
          <Text style={[t.type.body, { color: t.colors.tint }]}>Cancel</Text>
        </PressableScale>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={[t.type.headline, { color: t.colors.label }]} accessibilityRole="header">
            Add {meal}
          </Text>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{weekDays[day].full}</Text>
        </View>
        <View style={styles.cancel} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search recipes" style={{ marginBottom: 20 }} />
        {matches.length === 0 && (
          <Text style={[t.type.body, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 24 }]}>No recipes match “{query.trim()}”.</Text>
        )}
        {suggested.length > 0 && <Section title={`Suggested for ${meal.toLowerCase()}`}>{list(suggested)}</Section>}
        {others.length > 0 && <Section title={suggested.length ? 'More recipes' : 'All recipes'}>{list(others)}</Section>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cancel: { minWidth: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  titleWrap: { flex: 1, alignItems: 'center' },
  content: { padding: 16 },
});
