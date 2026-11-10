import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipeRow } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { IconButton, Section } from '../../../components/ui';
import { meals, type Meal } from '../../../data/mock';
import { CatSays } from '../../../components/cats/CatSays';
import { say } from '../../../components/cats/dialogue';
import { ScreenTitle } from '../../../navigation/screenOptions';
import { totalsFor, useBuddy, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';
import { weekDays } from '../../../lib/week';


export default function PlanScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { plan, setMeal, addIngredients, getRecipe, goals, isPro } = useStore();
  const [day, setDay] = useState(weekDays.find((d) => d.isToday)?.index ?? 0);
  const dayPlan = plan[day] ?? {};
  const plannedToday = meals.filter((m) => dayPlan[m]).length;
  const dayTotals = totalsFor(meals.map((m) => dayPlan[m]), getRecipe);

  const weekRecipes = useMemo(
    () => Object.values(plan).flatMap((p) => meals.map((m) => p[m])).filter((id): id is string => !!id),
    [plan],
  );

  const addWeek = useMemo(
    () => (
      <IconButton
        icon="cartAdd"
        accessibilityLabel="Add this week's meals to the grocery list"
        iconSize={20}
        onPress={() => {
          if (weekRecipes.length === 0) {
            toast({ message: 'Plan a meal first, then add its ingredients', tone: 'warning' });
            return;
          }
          let count = 0;
          for (const id of weekRecipes) {
            const r = getRecipe(id);
            if (r) count += addIngredients(r.id, r.ingredients);
          }
          toast({
            message: `Added ${count} items from ${weekRecipes.length} meals`,
            icon: 'cart',
            action: { label: 'View', onPress: () => router.navigate('/groceries') },
          });
        }}
      />
    ),
    [weekRecipes, addIngredients, toast, getRecipe],
  );

  const remove = (meal: Meal, recipeId: string) => {
    setMeal(day, meal, null);
    toast({
      message: `Removed from ${weekDays[day].long}`,
      tone: 'info',
      icon: 'calendar',
      action: { label: 'Undo', onPress: () => setMeal(day, meal, recipeId) },
    });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.colors.groupedBackground }}
      contentContainerStyle={[styles.content, { paddingHorizontal: t.spacing.md }]}
    >
      <ScreenTitle title="Meal Plan" right={addWeek} />

      <View style={[styles.week, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]} accessibilityRole="tablist">
        {weekDays.map((d) => {
          const selected = d.index === day;
          const count = meals.filter((m) => plan[d.index]?.[m]).length;
          return (
            <PressableScale
              key={d.index}
              haptic="select"
              scaleTo={0.92}
              onPress={() => setDay(d.index)}
              accessibilityRole="tab"
              aria-selected={selected}
              accessibilityLabel={`${d.long}${d.isToday ? ', today' : ''}, ${count} meals planned`}
              style={styles.day}
            >
              <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, fontWeight: '600' }]}>{d.short.toUpperCase()}</Text>
              <View style={[styles.dateCircle, selected && { backgroundColor: t.colors.tintFill }]}>
                <Text
                  style={[
                    t.type.headline,
                    { color: selected ? t.colors.onTint : d.isToday ? t.colors.tint : t.colors.label, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {d.date}
                </Text>
              </View>
              <View style={styles.dots}>
                {Array.from({ length: count }).map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: t.colors.tint }]} />
                ))}
              </View>
            </PressableScale>
          );
        })}
      </View>

      <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 12, marginBottom: 20, paddingHorizontal: 4 }]}>
        {weekDays[day].full} · {plannedToday} of 3 meals planned
      </Text>

      {/* The buddy sums up the day */}
      <CatSays
        buddy={buddy}
        size={96}
        style={{ marginBottom: 20 }}
        line={
          plannedToday === 0
            ? say(buddy, 'planEmptyDay')
            : say(buddy, 'planDay', {
                calories: dayTotals.calories,
                protein: dayTotals.protein,
                goalNote: !isPro
                  ? ''
                  : dayTotals.protein >= goals.protein
                    ? 'Protein goal covered!'
                    : `That’s ${Math.round((dayTotals.protein / goals.protein) * 100)}% of your ${goals.protein} g protein goal.`,
              })
        }
      />

      {meals.map((meal) => {
        const id = dayPlan[meal];
        const recipe = getRecipe(id);
        return (
          <Section key={meal} title={meal}>
            {recipe ? (
              <Animated.View key={recipe.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <RecipeRow
                  recipe={recipe}
                  trailing={
                    <IconButton
                      icon="close"
                      accessibilityLabel={`Remove ${recipe.title} from ${meal}`}
                      color={t.colors.secondaryLabel}
                      iconSize={15}
                      onPress={() => remove(meal, recipe.id)}
                    />
                  }
                />
              </Animated.View>
            ) : (
              <PressableScale
                onPress={() => router.push({ pathname: '/plan-picker', params: { day: String(day), meal } })}
                accessibilityLabel={`Add ${meal.toLowerCase()} for ${weekDays[day].long}`}
                scaleTo={0.98}
                style={styles.addSlot}
              >
                <View style={[styles.addIcon, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
                </View>
                <Text style={[t.type.body, { color: t.colors.tint, fontWeight: '500' }]}>Add {meal.toLowerCase()}</Text>
              </PressableScale>
            )}
          </Section>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 120, width: '100%', maxWidth: 700, alignSelf: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', padding: 6, borderCurve: 'continuous' },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minHeight: 44 },
  dateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  addSlot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 72 },
  addIcon: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
