import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Pop, Reveal } from '../../../components/Reveal';
import { RecipePhoto, RecipeRow, openRecipe } from '../../../components/RecipeCard';
import { PopButton, PopCard, PopChip, PopIconButton } from '../../../components/pop';
import { useToast } from '../../../components/Toast';
import { IconButton, Section, SectionHeader, Separator } from '../../../components/ui';
import { meals, type Meal, type Recipe } from '../../../data/mock';
import { haptics } from '../../../lib/haptics';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { pop, popCycle, useTheme } from '../../../theme';
import { weekDays } from '../../../lib/week';
import { fillDinners } from '../../../lib/planFill';


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

  // "Plan my dinners": one tap fills every empty dinner from today to Sunday (undo puts it back).
  const todayIndex = weekDays.find((d) => d.isToday)?.index ?? 0;
  const dinnerPicks = useMemo(() => fillDinners(plan, allRecipes, todayIndex), [plan, allRecipes, todayIndex]);
  const planDinners = () => {
    dinnerPicks.forEach((p) => setMeal(p.day, p.meal, p.recipeId));
    haptics.success();
    toast({
      message: `Planned ${dinnerPicks.length} dinners`,
      icon: 'calendar',
      action: { label: 'Undo', onPress: () => dinnerPicks.forEach((p) => setMeal(p.day, p.meal, null)) },
    });
  };

  const plannedWeek = weekDays.filter((d) => meals.some((m) => plan[d.index]?.[m])).length;

  return (
    <TabScreen title="Meal plan" kicker={weekDays[day].isToday ? weekDays[day].full : `Today is ${weekDays.find((d) => d.isToday)?.long ?? ''}`}>
      {/* The week as date pills: the chosen day is sunshine; dots show planned meals. */}
      <Reveal index={0} style={styles.week}>
      <View style={styles.weekInner} accessibilityRole="tablist">
        {weekDays.map((d) => {
          const selected = d.index === day;
          const count = meals.filter((m) => plan[d.index]?.[m]).length;
          return (
            <Pop key={d.index} active={selected} style={{ flex: 1 }}>
            <PressableScale
              haptic="select"
              scaleTo={0.92}
              onPress={() => setDay(d.index)}
              accessibilityRole="tab"
              aria-selected={selected}
              accessibilityLabel={`${d.long}${d.isToday ? ', today' : ''}, ${count} meals planned`}
              style={[styles.day, { backgroundColor: selected ? t.pop.sunshine : t.colors.cell, borderColor: t.pop.ink }, d.isToday && !selected && { borderStyle: 'dashed' }, t.chunky.lip]}
            >
              <Text style={[t.type.caption1, { color: selected ? t.pop.ink : t.colors.secondaryLabel, fontFamily: selected ? t.fonts.black : t.fonts.bold }]}>{d.short}</Text>
              <Text style={[t.type.title3, { color: t.colors.label, fontVariant: ['tabular-nums'] }]}>{d.date}</Text>
              {/* Dots: one per planned meal. */}
              <View style={styles.dots}>
                {[0, 1, 2].map((n) => (
                  <View key={n} style={[styles.dot, n < count && { backgroundColor: t.pop.leaf, borderColor: t.pop.ink, borderWidth: 1 }]} />
                ))}
              </View>
            </PressableScale>
            </Pop>
          );
        })}
      </View>
      </Reveal>

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
              style={[styles.slot, { borderColor: t.pop.ink, backgroundColor: popCycle[i % popCycle.length].tint }]}
            >
              <View style={[styles.slotIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
                <Icon name="plus" size={20} color={t.pop.ink} weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{meal}</Text>
                <Text style={[t.type.title3, { color: t.colors.label }]}>Add {meal.toLowerCase()}</Text>
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

      {/* Fill the week's empty dinners in one tap. Only shown when there are at least two to fill. */}
      {dinnerPicks.length >= 2 && (
        <Reveal index={3}>
          <PressableScale
            onPress={planDinners}
            scaleTo={0.98}
            accessibilityLabel={`Plan my dinners: fills ${dinnerPicks.length} empty dinners this week. You can undo.`}
            testID="plan-dinners"
            style={[styles.fillCard, { backgroundColor: t.pop.lilacTint, ...t.chunky.card }]}
          >
            <View style={[styles.fillIcon, { backgroundColor: t.pop.sunshine, borderColor: t.pop.ink }]}>
              <Icon name="sparkles" size={22} color={t.colors.onReward} weight="bold" />
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={[t.type.title3, { color: t.colors.label }]}>Plan my dinners</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                Fill {dinnerPicks.length} empty {dinnerPicks.length === 1 ? 'night' : 'nights'} with one tap. Your own picks stay.
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color={t.pop.ink} weight="bold" />
          </PressableScale>
        </Reveal>
      )}

      {/* The week's shopping, in one tap: a basil banner. */}
      {weekRecipes.length > 0 && (
        <Reveal index={4}>
        <View style={[styles.weekCard, { backgroundColor: t.pop.sky, ...t.chunky.card }]} testID="week-groceries">
          <View style={styles.weekTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.type.title2, { color: t.colors.onTint }]}>This week</Text>
              <Text style={[t.type.subhead, { color: t.colors.onTint }]}>
                {weekRecipes.length} {weekRecipes.length === 1 ? 'meal' : 'meals'} across {plannedWeek} {plannedWeek === 1 ? 'day' : 'days'}. Same ingredients are added up, and nothing is added twice.
              </Text>
            </View>
            <View style={[styles.weekIcon, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]}>
              <Icon name="cart" size={22} color={t.pop.ink} weight="bold" />
            </View>
          </View>
          <PopButton label="Add this week to the list" icon="cartAdd" onPress={addWeek} accessibilityLabel="Add this week to groceries" />
        </View>
        </Reveal>
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
                    <PopIconButton
                      icon="plus"
                      accessibilityLabel={`Plan ${recipe.title} for ${meal.toLowerCase()} on ${weekDays[day].long}`}
                      color={t.pop.sunshine}
                      iconSize={17}
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
/** Each meal has its own tint, like a sticker on the card. */
const MEAL_TINT: Record<string, string> = { Breakfast: pop.sunshineTint, Lunch: pop.skyTint, Dinner: pop.berryTint };

function MealCard({ meal, recipe, onChange, onRemove }: { meal: string; recipe: Recipe; onChange: () => void; onRemove: () => void }) {
  const t = useTheme();
  return (
    <PopCard radius={22} depth={4} contentStyle={styles.meal}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${meal}: ${recipe.title}, ${recipe.minutes} min, ${recipe.calories} kcal`} accessibilityHint="Opens the recipe" style={styles.mealMain}>
        <View style={[styles.mealPhoto, { backgroundColor: t.colors.imagePlaceholder, borderColor: t.pop.ink }]}>
          <RecipePhoto recipe={recipe} iconSize={24} />
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <PopChip label={meal} color={MEAL_TINT[meal] ?? t.pop.sunshineTint} small />
          <Text style={[t.type.title3, { color: t.colors.label }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
            {recipe.minutes} min · {recipe.calories} kcal
          </Text>
        </View>
      </PressableScale>
      <View style={styles.mealActions}>
        <IconButton icon="shuffle" accessibilityLabel={`Change ${meal.toLowerCase()}: ${recipe.title}`} color={t.pop.ink} iconSize={15} onPress={onChange} />
        <IconButton icon="close" accessibilityLabel={`Remove ${recipe.title} from ${meal}`} color={t.pop.ink} iconSize={14} onPress={onRemove} />
      </View>
    </PopCard>
  );
}

const styles = StyleSheet.create({
  week: {},
  weekInner: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: { alignItems: 'center', gap: 1, paddingTop: 8, paddingBottom: 7, borderRadius: 16, borderWidth: 2.5, minHeight: 74, borderCurve: 'continuous' },
  dots: { flexDirection: 'row', gap: 3, height: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 84, borderRadius: 22, borderWidth: 2.5, borderStyle: 'dashed', borderCurve: 'continuous' },
  slotIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  meal: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 0 },
  mealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealPhoto: { width: 92, height: 92, borderRadius: 16, borderWidth: 2, overflow: 'hidden', borderCurve: 'continuous' },
  mealActions: { alignItems: 'center' },
  fillCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginTop: 24, borderRadius: 24, borderCurve: 'continuous' },
  fillIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  weekCard: { padding: 18, gap: 16, marginTop: 24, borderRadius: 26, borderCurve: 'continuous' },
  weekTop: { flexDirection: 'row', gap: 12 },
  weekIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
});
