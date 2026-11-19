import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipeRow } from '../../../components/RecipeCard';
import { useToast } from '../../../components/Toast';
import { Button, IconButton, Section, Separator } from '../../../components/ui';
import { meals, type Meal } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';
import { weekDays } from '../../../lib/week';


export default function PlanScreen() {
  const t = useTheme();
  const toast = useToast();
  const { plan, setMeal, addIngredients, getRecipe, goals, isPro, allRecipes } = useStore();
  const [day, setDay] = useState(weekDays.find((d) => d.isToday)?.index ?? 0);
  const dayPlan = useMemo(() => plan[day] ?? {}, [plan, day]);
  const plannedToday = meals.filter((m) => dayPlan[m]).length;
  const dayTotals = totalsFor(meals.map((m) => dayPlan[m]), getRecipe);

  const weekRecipes = useMemo(
    () => Object.values(plan).flatMap((p) => meals.map((m) => p[m])).filter((id): id is string => !!id),
    [plan],
  );

  // Same ingredients from different recipes are combined on the list (the store adds them up).
  const addWeek = () => {
    let count = 0;
    for (const id of weekRecipes) {
      const r = getRecipe(id);
      if (r) count += addIngredients(r.id, r.ingredients);
    }
    haptics.success();
    toast({
      message: `Added ${count} items from ${weekRecipes.length} meals`,
      icon: 'cart',
      action: { label: 'View', onPress: () => router.navigate('/groceries') },
    });
  };

  const remove = (meal: Meal, recipeId: string) => {
    setMeal(day, meal, null);
    toast({
      message: `Removed from ${weekDays[day].long}`,
      tone: 'info',
      icon: 'calendar',
      action: { label: 'Undo', onPress: () => setMeal(day, meal, recipeId) },
    });
  };

  // Up to three ideas, one for each empty meal, matching the meal when a recipe is made for it.
  const ideas = useMemo(() => {
    const used = new Set(meals.map((m) => dayPlan[m]).filter(Boolean));
    const out: { recipe: (typeof allRecipes)[number]; meal: Meal }[] = [];
    for (const meal of meals.filter((m) => !dayPlan[m])) {
      const pool = allRecipes.filter((r) => !used.has(r.id) && r.category !== 'Dessert');
      const fits = pool.filter((r) => r.category === meal);
      const list = fits.length ? fits : pool;
      const pick = list[(day * 3 + out.length) % Math.max(1, list.length)];
      if (pick) {
        used.add(pick.id);
        out.push({ recipe: pick, meal });
      }
    }
    return out;
  }, [allRecipes, dayPlan, day]);

  // Adding and changing a meal both open the recipe picker for that slot.
  const addMeal = (meal: Meal) => router.push({ pathname: '/plan-picker', params: { day: String(day), meal } });

  return (
    <TabScreen title="Plan">

      {/* The week, kept compact */}
      <View style={[styles.week, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]} accessibilityRole="tablist">
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
              <Text style={[t.type.caption1, { color: d.isToday ? t.colors.tint : t.colors.secondaryLabel }]}>{d.short}</Text>
              <View style={[styles.dateCircle, selected && { backgroundColor: t.colors.tintFill }]}>
                <Text style={[t.type.headline, { color: selected ? t.colors.onTint : t.colors.label, fontVariant: ['tabular-nums'] }]}>{d.date}</Text>
              </View>
              {/* a green dot when something is planned */}
              <View style={[styles.dot, { backgroundColor: count > 0 ? t.colors.success : 'transparent' }]} />
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.dayHeader}>
        <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
          {weekDays[day].isToday ? 'Today' : weekDays[day].long}
        </Text>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]} testID="plan-count">
          {plannedToday} of 3 planned{plannedToday > 0 ? ` · about ${dayTotals.calories} kcal` : ''}
        </Text>
      </View>

      {plannedToday === 0 ? (
        // An empty day: one compact card instead of three empty boxes.
        <View style={[styles.emptyCard, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
          <View style={styles.emptyTop}>
            <View style={[styles.emptyIcon, { backgroundColor: t.colors.tintSoft }]}>
              <Icon name="calendar" size={22} color={t.colors.tint} weight="semibold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.title3, { color: t.colors.label }]}>Nothing planned yet</Text>
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Pick a meal or two. Your grocery list can build itself from the plan.</Text>
            </View>
          </View>
          {/* Three slots, one per meal: the words always fit. */}
          <View style={[styles.slots, { borderColor: t.colors.separator }]}>
            {meals.map((meal, i) => (
              <PressableScale
                key={meal}
                onPress={() => addMeal(meal)}
                accessibilityLabel={`Add ${meal.toLowerCase()} for ${weekDays[day].long}`}
                scaleTo={0.98}
                style={[styles.slot, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.colors.separator }]}
              >
                <View style={[styles.slotIcon, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name="plus" size={16} color={t.colors.tint} weight="bold" />
                </View>
                <Text style={[t.type.headline, { color: t.colors.tint }]}>Add {meal.toLowerCase()}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : (
        <>
          <Section>
            {meals.map((meal, i) => {
              const recipe = getRecipe(dayPlan[meal]);
              return (
                <View key={meal}>
                  {i > 0 && <Separator inset={16} />}
                  {recipe ? (
                    <Animated.View key={recipe.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                      <RecipeRow
                        recipe={recipe}
                        subtitle={`${meal} · ${recipe.minutes} min · ${recipe.calories} kcal`}
                        trailing={
                          <View style={styles.rowActions}>
                            <IconButton icon="shuffle" accessibilityLabel={`Change ${meal.toLowerCase()}: ${recipe.title}`} color={t.colors.secondaryLabel} iconSize={15} onPress={() => addMeal(meal)} />
                            <IconButton icon="close" accessibilityLabel={`Remove ${recipe.title} from ${meal}`} color={t.colors.secondaryLabel} iconSize={14} onPress={() => remove(meal, recipe.id)} />
                          </View>
                        }
                      />
                    </Animated.View>
                  ) : (
                    <PressableScale onPress={() => addMeal(meal)} accessibilityLabel={`Add ${meal.toLowerCase()} for ${weekDays[day].long}`} scaleTo={0.98} style={styles.addSlot}>
                      <View style={[styles.addIcon, { backgroundColor: t.colors.tintSoft }]}>
                        <Icon name="plus" size={18} color={t.colors.tint} weight="bold" />
                      </View>
                      <Text style={[t.type.headline, { color: t.colors.tint }]}>Add {meal.toLowerCase()}</Text>
                    </PressableScale>
                  )}
                </View>
              );
            })}
          </Section>
          {isPro && (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: -8 }]}>
              {dayTotals.protein >= goals.protein ? 'Protein goal covered.' : `${Math.round((dayTotals.protein / goals.protein) * 100)}% of your ${goals.protein} g protein goal.`}
            </Text>
          )}
        </>
      )}

      {/* The week's shopping, in one tap. */}
      {weekRecipes.length > 0 && (
        <View style={[styles.weekCard, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]} testID="week-groceries">
          <View style={{ flex: 1 }}>
            <Text style={[t.type.headline, { color: t.colors.label }]}>This week</Text>
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>
              {weekRecipes.length} {weekRecipes.length === 1 ? 'meal' : 'meals'} planned. Same ingredients are added up on the list.
            </Text>
          </View>
          <Button label="Add this week to groceries" icon="cartAdd" variant="tinted" size="medium" onPress={addWeek} style={{ alignSelf: 'stretch' }} />
        </View>
      )}

      {/* Ideas to fill the day: one tap plans them. */}
      {ideas.length > 0 && (
        <>
          <Text style={[t.type.title3, styles.ideasTitle, { color: t.colors.label }]} accessibilityRole="header">
            Ideas for {weekDays[day].isToday ? 'today' : weekDays[day].long}
          </Text>
          <Section>
            {ideas.map(({ recipe, meal }, i) => (
              <View key={recipe.id}>
                {i > 0 && <Separator inset={84} />}
                <RecipeRow
                  recipe={recipe}
                  subtitle={`${meal} · ${recipe.minutes} min · ${recipe.calories} kcal`}
                  trailing={
                    <IconButton
                      icon="plus"
                      accessibilityLabel={`Plan ${recipe.title} for ${meal.toLowerCase()} on ${weekDays[day].long}`}
                      color={t.colors.tint}
                      background={t.colors.tintSoft}
                      iconSize={16}
                      onPress={() => {
                        setMeal(day, meal, recipe.id);
                        haptics.success();
                        toast({ message: `${recipe.title} planned for ${meal.toLowerCase()}`, icon: 'calendar', action: { label: 'Undo', onPress: () => setMeal(day, meal, null) } });
                      }}
                    />
                  }
                />
              </View>
            ))}
          </Section>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 8, paddingBottom: 6, borderCurve: 'continuous' },
  day: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44 },
  slots: { borderTopWidth: StyleSheet.hairlineWidth * 2, marginHorizontal: -16, marginBottom: -16 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
  slotIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ideasTitle: { marginTop: 24, marginBottom: 12 },
  dateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', marginTop: 24, marginBottom: 12 },
  emptyCard: { padding: 16, gap: 16, borderCurve: 'continuous' },
  emptyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  weekCard: { padding: 16, gap: 12, marginTop: 8, borderCurve: 'continuous' },
  addSlot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 72 },
  addIcon: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
