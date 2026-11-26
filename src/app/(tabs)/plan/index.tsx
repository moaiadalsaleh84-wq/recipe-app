import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';
import { enter } from '../../../motion';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { openRecipe } from '../../../components/RecipeCard';
import { Lift, PopButton } from '../../../components/pop';
import { useToast } from '../../../components/Toast';
import { IconButton, SectionHeader, Separator } from '../../../components/ui';
import { goalsOn, meals, type Meal, type Recipe } from '../../../data/mock';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { fonts, pop, useTheme } from '../../../theme';
import { weekDays } from '../../../lib/week';
import { nb, duration } from '../../../lib/text';
import { PhotoFrame } from '../../../components/PhotoFrame';


export default function PlanScreen() {
  const reduceMotion = useReducedMotion();
  const t = useTheme();
  const toast = useToast();
  const { plan, setMeal, getRecipe, goals, isPro } = useStore();
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
    // You pick what to buy first ("Add to your list"); meals already added this week are left out.
    router.push({ pathname: '/add-to-list', params: { week: '1' } });
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


  // Adding and changing a meal both open the recipe picker for that slot.
  const addMeal = (meal: Meal) => router.push({ pathname: '/plan-picker', params: { day: String(day), meal } });

  // You pick every meal yourself: nothing is planned for you.
  const todayIndex = weekDays.find((d) => d.isToday)?.index ?? 0;



  return (
    <TabScreen title="Meal plan" kicker={weekDays[day].isToday ? weekDays[day].full : `Today is ${weekDays.find((d) => d.isToday)?.long ?? ''}`}>
      {/* A compact week strip: 7 day pills (44 wide, no borders). Today is sunshine; the day you're
          looking at gets a soft fill; a small dot means the day has meals. */}
      <Reveal index={0}>
        <View style={styles.weekInner} accessibilityRole="tablist">
          {weekDays.map((d) => {
            const selected = d.index === day;
            const count = meals.filter((m) => plan[d.index]?.[m]).length;
            const past = d.index < todayIndex;
            return (
              <PressableScale
                key={d.index}
                haptic="select"
                scaleTo={0.94}
                onPress={() => setDay(d.index)}
                accessibilityRole="tab"
                aria-selected={selected}
                accessibilityLabel={`${d.long}${d.isToday ? ', today' : ''}, ${count} ${count === 1 ? 'meal' : 'meals'} planned`}
                style={[styles.day, { backgroundColor: d.isToday ? t.pop.sunshine : selected ? t.colors.fill : 'transparent' }]}
              >
                <Text style={[styles.dayName, { color: past && !d.isToday ? t.colors.secondaryLabel : t.colors.label }]}>{d.short.slice(0, 2)}</Text>
                <Text style={[styles.dayNum, { color: past && !d.isToday ? t.colors.secondaryLabel : t.colors.label }]}>{d.date}</Text>
                <View style={[styles.dot, count > 0 && { backgroundColor: d.isToday ? t.pop.ink : t.pop.leaf }]} />
              </PressableScale>
            );
          })}
        </View>
      </Reveal>

      <SectionHeader
        title={weekDays[day].isToday ? 'Today' : weekDays[day].long}
        subtitle={plannedToday > 0 ? `${plannedToday} of 3 planned · about ${nb(dayTotals.calories, 'kcal')}` : 'Nothing planned yet.'}
        style={{ marginTop: 24 }}
      />
      <Text style={styles.hidden} testID="plan-count">
        {plannedToday} of 3 planned
      </Text>

      {/* Breakfast, lunch and dinner: three simple rows (64 high) in one card. A planned meal shows
          its photo, name and meta; an empty one is "+ Breakfast". */}
      <View style={[styles.mealList, { borderColor: t.colors.border }]}>
        {meals.map((meal, i) => {
          const recipe = getRecipe(dayPlan[meal]);
          return (
            <View key={meal}>
              {i > 0 && <Separator inset={recipe ? 72 : 64} />}
              {recipe ? (
                <Animated.View key={`${meal}-${recipe.id}`} entering={enter(i, reduceMotion)} exiting={FadeOut.duration(150)}>
                  <MealRow meal={meal} recipe={recipe} onChange={() => addMeal(meal)} onRemove={() => remove(meal, recipe.id)} />
                </Animated.View>
              ) : (
                <PressableScale key={meal} onPress={() => addMeal(meal)} accessibilityLabel={`Add ${meal.toLowerCase()} for ${weekDays[day].long}`} scaleTo={0.98} style={styles.mealRow} testID={`add-${meal.toLowerCase()}`}>
                  <View style={[styles.plus, { backgroundColor: MEAL_TINT[meal] ?? t.pop.sunshineTint }]}>
                    <Icon name="plus" size={18} color={t.pop.ink} weight="bold" />
                  </View>
                  <Text style={[t.type.headline, { color: t.colors.label, flex: 1 }]}>{meal}</Text>
                  <Icon name="chevronRight" size={14} color={t.colors.secondaryLabel} weight="bold" />
                </PressableScale>
              )}
            </View>
          );
        })}
      </View>
      {isPro && goalsOn(goals) && plannedToday > 0 && (
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 10 }]}>
          {dayTotals.protein >= goals.protein ? 'Protein goal covered.' : `${Math.round((dayTotals.protein / goals.protein) * 100)}% of your ${nb(goals.protein, 'g')} protein goal.`}
        </Text>
      )}

      {/* The week's shopping, in one tap: a basil banner. */}
      {weekRecipes.length > 0 && (
        <Reveal index={4}>
        <Lift radius={26} style={{ marginTop: 24 }}>
          <View style={[styles.weekCard, { backgroundColor: t.pop.sky, ...t.chunky.card }]} testID="week-groceries">
            <View style={{ gap: 2 }}>
              <Text style={[t.type.title2, { color: t.colors.onTint }]}>This week</Text>
              <Text style={[t.type.subhead, { color: t.colors.onTint }]}>
                {weekRecipes.length} {weekRecipes.length === 1 ? 'meal' : 'meals'} planned. You pick what to{'\u00A0'}buy.
              </Text>
            </View>
            <PopButton label="Add missing to List" icon="cartAdd" onPress={addWeek} accessibilityLabel="Pick what to buy for this week" />
          </View>
        </Lift>
        </Reveal>
      )}

    </TabScreen>
  );
}

/** Each meal has its own tint, like a sticker on the card. */
const MEAL_TINT: Record<string, string> = { Breakfast: pop.sunshineTint, Lunch: pop.skyTint, Dinner: pop.berryTint };

/** A planned meal: photo, name (one line) and "Dinner · 45 min · 520 kcal"; swap and remove on the right. */
function MealRow({ meal, recipe, onChange, onRemove }: { meal: string; recipe: Recipe; onChange: () => void; onRemove: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.mealRow}>
      <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.98} accessibilityLabel={`${meal}: ${recipe.title}, ${recipe.minutes} min, ${recipe.calories} kcal`} accessibilityHint="Opens the recipe" style={styles.mealMain}>
        <PhotoFrame recipe={recipe} iconSize={20} radius={12} square style={styles.mealPhoto} />
        <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
            {meal} · {duration(recipe.minutes)} · {nb(recipe.calories, 'kcal')}
          </Text>
        </View>
      </PressableScale>
      <IconButton icon="shuffle" accessibilityLabel={`Change ${meal.toLowerCase()}: ${recipe.title}`} color={t.colors.secondaryLabel} iconSize={15} size={40} onPress={onChange} />
      <IconButton icon="close" accessibilityLabel={`Remove ${recipe.title} from ${meal}`} color={t.colors.secondaryLabel} iconSize={14} size={40} onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  week: {},
  // Seven equal pills that always fit between the 16pt margins (about 45pt each at 375pt).
  weekInner: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 6, borderRadius: 14, borderCurve: 'continuous' },
  dayName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  dayNum: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3, alignSelf: 'center' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  // Breakfast, lunch and dinner: one flat card of 64-high rows.
  mealList: { marginTop: 20, borderWidth: 2, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingLeft: 12, paddingRight: 6, paddingVertical: 8 },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  mealPhoto: { width: 48, height: 48 },
  weekCard: { padding: 18, gap: 16, borderRadius: 26, borderCurve: 'continuous' },
});
