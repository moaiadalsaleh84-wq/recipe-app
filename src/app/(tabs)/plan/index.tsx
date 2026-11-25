import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../components/Text';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';
import { enter } from '../../../motion';
import { Icon } from '../../../components/Icon';
import { PressableScale } from '../../../components/PressableScale';
import { Reveal } from '../../../components/Reveal';
import { openRecipe } from '../../../components/RecipeCard';
import { Lift, PopButton, PopCard, PopChip } from '../../../components/pop';
import { useToast } from '../../../components/Toast';
import { IconButton, SectionHeader } from '../../../components/ui';
import { meals, type Meal, type Recipe } from '../../../data/mock';
import { TabScreen } from '../../../components/TabScreen';
import { totalsFor, useStore } from '../../../state/store';
import { fonts, pop, popCycle, useTheme } from '../../../theme';
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

  // On narrow phones the weekday is two letters ("Mo"), so there's always room around it.
  const { width } = useWindowDimensions();
  const narrowDays = (Math.min(width, 700) - 40 - 36) / 7 - 5 < 40;


  return (
    <TabScreen title="Meal plan" kicker={weekDays[day].isToday ? weekDays[day].full : `Today is ${weekDays.find((d) => d.isToday)?.long ?? ''}`}>
      {/* The week as 7 equal date pills. Today: sunshine on a 3pt shadow. Days to come: white on a 3pt
          shadow. Past days: muted, no shadow. The chosen day (if not today) is lilac. A centered dot
          means the day has meals. */}
      <Reveal index={0} style={styles.week}>
      <View style={styles.weekInner} accessibilityRole="tablist">
        {weekDays.map((d) => {
          const selected = d.index === day;
          const count = meals.filter((m) => plan[d.index]?.[m]).length;
          const past = d.index < todayIndex;
          return (
            <Lift key={d.index} radius={14} offset={t.depth.small} pressed={past} style={{ flex: 1 }}>
              <PressableScale
                haptic="select"
                scaleTo={0.94}
                onPress={() => setDay(d.index)}
                accessibilityRole="tab"
                aria-selected={selected}
                accessibilityLabel={`${d.long}${d.isToday ? ', today' : ''}, ${count} ${count === 1 ? 'meal' : 'meals'} planned`}
                style={[
                  styles.day,
                  // Today sunshine; the day you're looking at lilac; every other day white. Past days sit flat (no shadow) with muted text.
                  { backgroundColor: d.isToday ? t.pop.sunshine : selected ? t.pop.lilacTint : t.pop.white, borderColor: t.pop.ink },
                  past && { transform: [{ translateY: t.depth.small }] },
                ]}
              >
                <Text style={[styles.dayName, { color: past ? t.pop.inkMuted : t.pop.ink }]}>{narrowDays ? d.short.slice(0, 2) : d.short}</Text>
                <Text style={[styles.dayNum, { color: past ? t.pop.inkMuted : t.pop.ink }]}>{d.date}</Text>
                <View style={[styles.dot, count > 0 && { backgroundColor: t.pop.leaf, borderColor: t.pop.ink, borderWidth: 1.5 }]} />
              </PressableScale>
            </Lift>
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

      {/* Breakfast, lunch and dinner: a photo card when planned, a dashed slot when not. */}
      <View style={{ gap: 12 }}>
        {meals.map((meal, i) => {
          const recipe = getRecipe(dayPlan[meal]);
          return recipe ? (
            <Animated.View key={`${meal}-${recipe.id}`} entering={enter(i, reduceMotion)} exiting={FadeOut.duration(150)}>
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
                {weekRecipes.length} {weekRecipes.length === 1 ? 'meal' : 'meals'} planned. Shared ingredients are{'\u00A0'}combined.
              </Text>
            </View>
            <PopButton label="Shop the week" icon="cartAdd" onPress={addWeek} accessibilityLabel="Pick what to buy for this week" />
          </View>
        </Lift>
        </Reveal>
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
        <PhotoFrame recipe={recipe} iconSize={24} radius={16} square style={styles.mealPhoto} />
        {/* The meal on top (left-aligned), the title (2 lines max), one meta line. */}
        <View style={{ flex: 1, gap: 3, minWidth: 0, alignItems: 'flex-start' }}>
          <PopChip label={meal} color={MEAL_TINT[meal] ?? t.pop.sunshineTint} small />
          <Text style={[t.type.title3, { color: t.colors.label, fontSize: 18, lineHeight: 22, alignSelf: 'stretch' }]} numberOfLines={3}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, alignSelf: 'stretch' }]} numberOfLines={1}>
            {duration(recipe.minutes)} · {nb(recipe.calories, 'kcal')}
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
  // A 4pt gap keeps each day at least 44pt wide on a 375pt phone.
  weekInner: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  // At least 6pt between the text and the border, even on a 375pt-wide phone.
  day: { alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 3, borderRadius: 14, borderWidth: 2.5, minHeight: 76, borderCurve: 'continuous' },
  dayName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  dayNum: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'center' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 84, borderRadius: 22, borderWidth: 2.5, borderStyle: 'dashed', borderCurve: 'continuous' },
  slotIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  meal: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 0 },
  mealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealPhoto: { width: 72, height: 72 },
  // Change and remove, centred against the whole card.
  mealActions: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  weekCard: { padding: 18, gap: 16, borderRadius: 26, borderCurve: 'continuous' },
});
