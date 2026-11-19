import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { RecipePhoto, RecipeRow, openRecipe } from '../../../components/RecipeCard';
import { Chunky } from '../../../components/Chunky';
import { useToast } from '../../../components/Toast';
import { IconButton, Section, SectionHeader, Separator } from '../../../components/ui';
import { meals, type Meal, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { useTheme } from '../../../theme';
import { weekDays } from '../../../lib/week';


export default function PlanScreen() {
  const t = useTheme();
  const toast = useToast();
  const { plan, setMeal, addWeekToGroceries, getRecipe, goals, isPro, allRecipes } = useStore();
  const [day, setDay] = useState(weekDays.find((d) => d.isToday)?.index ?? 0);
  const dayPlan = useMemo(() => plan[day] ?? {}, [plan, day]);
  const plannedToday = meals.filter((m) => dayPlan[m]).length;
  const dayTotals = totalsFor(meals.map((m) => dayPlan[m]), getRecipe);

  const weekRecipes = useMemo(
    () => Object.values(plan).flatMap((p) => meals.map((m) => p[m])).filter((id): id is string => !!id),
    [plan],
  );

  // Safe to press again: meals already added this week are skipped, and the same ingredient
  // from different recipes is added up on the list (see lib/groceries.ts).
  const addWeek = () => {
    const { meals: added, items } = addWeekToGroceries();
    if (added === 0) {
      haptics.select();
      toast({ message: 'This week’s meals are already on your list', icon: 'check', tone: 'info', action: { label: 'View', onPress: () => router.navigate('/groceries') } });
      return;
    }
    haptics.success();
    toast({
      message: `Added ${items} ${items === 1 ? 'item' : 'items'} from ${added} ${added === 1 ? 'meal' : 'meals'}`,
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

  const plannedWeek = weekDays.filter((d) => meals.some((m) => plan[d.index]?.[m])).length;

  return (
    <TabScreen title="Meal plan" kicker={weekDays[day].isToday ? weekDays[day].full : `Today is ${weekDays.find((d) => d.isToday)?.long ?? ''}`}>
      {/* The week as date pills: today has a saffron dot, the chosen day is basil. */}
      <View style={styles.week} accessibilityRole="tablist">
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
              style={[styles.day, { backgroundColor: selected ? t.colors.tintFill : t.colors.cell, borderColor: selected ? t.colors.tintFill : t.colors.border }, !selected && t.chunky.lip]}
            >
              <Text style={[t.type.caption1, { color: selected ? 'rgba(255,255,255,0.85)' : t.colors.secondaryLabel }]}>{d.short}</Text>
              <Text style={[t.type.title3, { color: selected ? t.colors.onTint : t.colors.label, fontVariant: ['tabular-nums'] }]}>{d.date}</Text>
              {/* Dots: one per planned meal; today's are saffron. */}
              <View style={styles.dots}>
                {[0, 1, 2].map((n) => (
                  <View key={n} style={[styles.dot, { backgroundColor: n < count ? (selected ? '#FFFFFF' : d.isToday ? t.colors.reward : t.colors.success) : 'transparent' }]} />
                ))}
              </View>
            </PressableScale>
          );
        })}
      </View>

      <SectionHeader
        title={weekDays[day].isToday ? 'Today' : weekDays[day].long}
        subtitle={plannedToday > 0 ? `${plannedToday} of 3 planned · about ${dayTotals.calories} kcal` : 'Nothing planned yet. Pick a meal or two.'}
        style={{ marginTop: 24 }}
      />
      <Text style={styles.hidden} testID="plan-count">
        {plannedToday} of 3 planned
      </Text>

      {/* Breakfast, lunch and dinner: a photo card when planned, a dashed slot when not. */}
      <View style={{ gap: 12 }}>
        {meals.map((meal, i) => {
          const recipe = getRecipe(dayPlan[meal]);
          return recipe ? (
            <Animated.View key={`${meal}-${recipe.id}`} entering={FadeInDown.duration(300).delay(i * 60)} exiting={FadeOut.duration(150)}>
              <MealCard meal={meal} recipe={recipe} onChange={() => addMeal(meal)} onRemove={() => remove(meal, recipe.id)} />
            </Animated.View>
          ) : (
            <PressableScale
              key={meal}
              onPress={() => addMeal(meal)}
              accessibilityLabel={`Add ${meal.toLowerCase()} for ${weekDays[day].long}`}
              scaleTo={0.98}
              style={[styles.slot, { borderColor: t.colors.fillStrong }]}
            >
              <View style={[styles.slotIcon, { backgroundColor: t.colors.tintSoft }]}>
                <Icon name="plus" size={20} color={t.colors.tint} weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{meal}</Text>
                <Text style={[t.type.headline, { color: t.colors.tint }]}>Add {meal.toLowerCase()}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      {isPro && plannedToday > 0 && (
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 10 }]}>
          {dayTotals.protein >= goals.protein ? 'Protein goal covered.' : `${Math.round((dayTotals.protein / goals.protein) * 100)}% of your ${goals.protein} g protein goal.`}
        </Text>
      )}

      {/* The week's shopping, in one tap: a basil banner. */}
      {weekRecipes.length > 0 && (
        <View style={[styles.weekCard, { backgroundColor: t.colors.tintFill, ...t.shadow.card }]} testID="week-groceries">
          <View style={styles.weekTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.type.title2, { color: '#FFFFFF' }]}>This week</Text>
              <Text style={[t.type.subhead, { color: 'rgba(255,255,255,0.88)' }]}>
                {weekRecipes.length} {weekRecipes.length === 1 ? 'meal' : 'meals'} across {plannedWeek} {plannedWeek === 1 ? 'day' : 'days'}. Same ingredients are added up, and nothing is added twice.
              </Text>
            </View>
            <View style={styles.weekIcon}>
              <Icon name="cart" size={22} color="#FFFFFF" weight="bold" />
            </View>
          </View>
          <Chunky onPress={addWeek} face={t.colors.reward} accessibilityLabel="Add this week to groceries" faceStyle={styles.weekBtn}>
            <Icon name="cartAdd" size={17} color={t.colors.onReward} weight="bold" />
            <Text style={[t.type.button, { color: t.colors.onReward }]}>Add this week to groceries</Text>
          </Chunky>
        </View>
      )}

      {/* Ideas to fill the day: one tap plans them. */}
      {ideas.length > 0 && (
        <>
          <SectionHeader title={`Ideas for ${weekDays[day].isToday ? 'today' : weekDays[day].long}`} subtitle="One tap adds them to the plan" />
          <Section>
            {ideas.map(({ recipe, meal }, i) => (
              <View key={recipe.id}>
                {i > 0 && <Separator inset={88} />}
                <RecipeRow
                  recipe={recipe}
                  subtitle={`${meal} · ${recipe.minutes} min · ${recipe.calories} kcal`}
                  trailing={
                    <IconButton
                      icon="plus"
                      accessibilityLabel={`Plan ${recipe.title} for ${meal.toLowerCase()} on ${weekDays[day].long}`}
                      color={t.colors.onTint}
                      background={t.colors.tintFill}
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

/** A planned meal: a wide food photo with the meal and recipe over a soft fade, and change or remove. */
function MealCard({ meal, recipe, onChange, onRemove }: { meal: string; recipe: Recipe; onChange: () => void; onRemove: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.meal, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${meal}: ${recipe.title}, ${recipe.minutes} min, ${recipe.calories} kcal`} accessibilityHint="Opens the recipe" style={styles.mealMain}>
        <View style={[styles.mealPhoto, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} iconSize={24} />
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={[styles.mealTag, { backgroundColor: t.colors.rewardSoft }]}>
            <Text style={[t.type.caption1, { color: t.colors.rewardText, fontFamily: t.fonts.extrabold }]}>{meal}</Text>
          </View>
          <Text style={[t.type.title3, { color: t.colors.label }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
            {recipe.minutes} min · {recipe.calories} kcal
          </Text>
        </View>
      </PressableScale>
      <View style={styles.mealActions}>
        <IconButton icon="shuffle" accessibilityLabel={`Change ${meal.toLowerCase()}: ${recipe.title}`} color={t.colors.secondaryLabel} iconSize={15} onPress={onChange} />
        <IconButton icon="close" accessibilityLabel={`Remove ${recipe.title} from ${meal}`} color={t.colors.secondaryLabel} iconSize={14} onPress={onRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 1, paddingTop: 8, paddingBottom: 6, borderRadius: 18, borderWidth: 1, minHeight: 72, borderCurve: 'continuous' },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 84, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderCurve: 'continuous' },
  slotIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  meal: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 8, paddingRight: 0, borderCurve: 'continuous' },
  mealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealPhoto: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', borderCurve: 'continuous' },
  mealTag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 },
  mealActions: { alignItems: 'center' },
  weekCard: { padding: 18, gap: 16, marginTop: 24, borderRadius: 28, borderCurve: 'continuous' },
  weekTop: { flexDirection: 'row', gap: 12 },
  weekIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  weekBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 18 },
});
