import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { RecipeCard } from '../../components/RecipeCard';
import { getRecipe, type Recipe } from '../../data/mock';
import { colors, fonts, fontSizes, radius, spacing } from '../../theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

// Mock week plan: day index -> meal -> recipe id
const PLAN: Record<number, Partial<Record<(typeof MEALS)[number], string>>> = {
  0: { Breakfast: 'pancakes', Dinner: 'green-curry' },
  1: { Lunch: 'salmon-bowl' },
  2: { Breakfast: 'shakshuka', Dinner: 'green-curry' },
  4: { Lunch: 'hummus-plate' },
  5: { Breakfast: 'pancakes', Dinner: 'brownies' },
};

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const plan = PLAN[day] ?? {};

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <Confetti seed={1} />
        <Text style={styles.kicker}>Meal plan</Text>
        <Text style={styles.title}>Your week,{'\n'}sorted.</Text>
        <View style={styles.days}>
          {DAYS.map((d, i) => {
            const active = i === day;
            const count = Object.keys(PLAN[i] ?? {}).length;
            return (
              <Pressable key={d} onPress={() => setDay(i)} style={[styles.day, active && styles.dayActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{d}</Text>
                <View style={styles.dots}>
                  {Array.from({ length: count }).map((_, k) => (
                    <View key={k} style={[styles.dot, { backgroundColor: active ? colors.primary : colors.accent }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.meals}>
        {MEALS.map((meal) => {
          const id = plan[meal];
          const recipe: Recipe | undefined = id ? getRecipe(id) : undefined;
          return (
            <View key={meal} style={{ gap: spacing.xs }}>
              <Text style={styles.mealLabel}>{meal}</Text>
              {recipe ? (
                <RecipeCard recipe={recipe} />
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptyText}>+ Plan a {meal.toLowerCase()}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  kicker: { fontFamily: fonts.semibold, fontSize: fontSizes.md, color: colors.textOnColorMuted },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.05,
    color: colors.white,
    letterSpacing: -1.2,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  day: {
    width: 44,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.overlayLighter,
  },
  dayActive: { backgroundColor: colors.white },
  dayText: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: colors.white },
  dayTextActive: { color: colors.ink },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  meals: { padding: spacing.lg, gap: spacing.lg },
  mealLabel: { fontFamily: fonts.extrabold, fontSize: fontSizes.xl, color: colors.ink, letterSpacing: -0.4 },
  emptySlot: {
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.inkMuted },
});
