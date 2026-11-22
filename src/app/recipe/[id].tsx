import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Reveal } from '../../components/Reveal';
import { Linking, Modal, PixelRatio, Pressable, ScrollView, Share, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { MAX_FONT_SCALE, Text } from '../../components/Text';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
} from 'react-native-reanimated';
import { enter, popoverIn } from '../../motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pantryHas } from '../../lib/pantry';
import { FoodIcon } from '../../components/FoodIcon';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RecipeCard, RecipePhoto } from '../../components/RecipeCard';
import { mainIngredient } from '../../lib/bonus';
import { pantryMatch } from '../../lib/moods';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, IconButton, Segmented } from '../../components/ui';
import { BottomBar } from '../../components/BottomBar';
import { Lift, PopButton, PopCard, PopChip, PopIconButton } from '../../components/pop';
import { type DietTag, type Recipe, type Units } from '../../data/mock';
import { haptics } from '../../lib/haptics';
import { pickPhoto } from '../../lib/photos';
import { convertStepText } from '../../lib/units';
import { amountFor, ingredientLabel } from '../../lib/scale';
import { useStore } from '../../state/store';
import { macroPercents } from '../../lib/percent';
import { fonts, pop, popCycle, useTheme } from '../../theme';
import { duration, keepTogether, nb } from '../../lib/text';

export default function RecipeScreen() {
  const reduceMotion = useReducedMotion();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getRecipe, isFavorite, toggleFavorite, addIngredients, units, setUnits, notes, setNote,
    cookbooks, favorites, deleteRecipe, setRecipeImage, goals, profile, isPro, pantry, allRecipes,
  } = useStore();
  const recipe = getRecipe(id);

  // Opens sized for your household (from onboarding), or the recipe's own servings.
  const [servings, setServings] = useState(profile.household ?? recipe?.servings ?? 2);
  const [justAdded, setJustAdded] = useState<'all' | 'missing' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Where the big title ends, so the small one appears only once it has scrolled away.
  const [titleBottom, setTitleBottom] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState(recipe ? notes[recipe.id] ?? '' : '');
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const deleteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(addedTimer.current);
      clearTimeout(deleteTimer.current);
    },
    [],
  );

  // Height of the tomato header band (measured), so the small bar knows when the title has gone.
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  // The top bar (back, heart, more) is a solid row above the page: tomato tint like the photo band,
  // turning white with an ink line once the title has scrolled under it. Nothing shows through.
  const barThreshold = Math.max(80, titleBottom - 40);
  const barStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollY.get(), [barThreshold - 40, barThreshold], [0, 1], Extrapolation.CLAMP);
    return { backgroundColor: interpolateColor(p, [0, 1], [pop.tomatoTint, pop.white]), borderBottomColor: interpolateColor(p, [0, 1], [pop.tomatoTint, pop.ink]) };
  });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" title="Recipe not found" message="It may have been removed." action={{ label: 'Back to recipes', onPress: goBack }} />
      </View>
    );
  }

  const fav = isFavorite(recipe.id);
  const inCookbooks = cookbooks.filter((c) => c.recipeIds.includes(recipe.id)).length + (favorites.includes(recipe.id) ? 1 : 0);
  const scale = servings / recipe.servings;
  // What you already have at home (from the Pantry tab), so you only buy the rest.
  const have = new Set(pantry.length ? recipe.ingredients.filter((i) => pantryHas(pantry, i.name)).map((i) => i.id) : []);
  const missing = recipe.ingredients.filter((i) => !have.has(i.id));
  // Checked recipe text already gives °C and °F ("200°C (400°F)"): shown exactly as written.
  const stepFor = (step: string) => (recipe.source === 'pantry-pop' ? step : convertStepText(step, units));
  const main = mainIngredient(recipe);
  const alsoLike = allRecipes
    .filter((r) => r.id !== recipe.id)
    .map((r) => ({ r, score: (main !== 'any' && mainIngredient(r) === main ? 2 : 0) + (r.category === recipe.category ? 1 : 0) + pantryMatch(r, pantry).have / Math.max(1, r.ingredients.length) }))
    .sort((a, b) => b.score - a.score || a.r.title.localeCompare(b.r.title))
    .slice(0, 3)
    .map((x) => x.r);

  const onFavorite = () => {
    const now = toggleFavorite(recipe.id);
    if (now) haptics.success();
    toast({
      message: now ? 'Added to Favorites' : 'Removed from Favorites',
      icon: now ? 'heartFill' : 'heart',
      tone: now ? 'success' : 'info',
      action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
    });
  };

  const onAdd = (which: 'all' | 'missing') => {
    const n = addIngredients(recipe.id, which === 'all' ? recipe.ingredients : missing, scale);
    haptics.success();
    setJustAdded(which);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(null), 1800);
    toast({
      message: `Added ${n} ${which === 'missing' ? 'missing ' : ''}${n === 1 ? 'ingredient' : 'ingredients'} for ${servings} ${servings === 1 ? 'serving' : 'servings'}`,
      icon: 'cart',
      action: { label: 'View', onPress: () => router.navigate('/groceries') },
    });
  };

  const onShare = async () => {
    try {
      await Share.share({ title: recipe.title, message: shareText(recipe, servings, units) });
    } catch {
      toast({ message: 'Sharing isn’t available on this device', tone: 'warning' });
    }
  };

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      clearTimeout(deleteTimer.current);
      deleteTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteRecipe(recipe.id);
    router.dismissTo('/');
    toast({ message: `Deleted ${recipe.title}`, icon: 'trash', tone: 'info' });
  };

  const level = recipe.difficulty === 'Easy' ? 1 : recipe.difficulty === 'Medium' ? 2 : 3;
  // Full content width (20pt margins), 4:3.
  const photoWidth = Math.min(width - 40, 560);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <StatusBar style="dark" animated />
      {/* Back, heart and more: their own row above the photo (12pt gap), never over it. */}
      <Animated.View style={[styles.controls, { paddingTop: insets.top + 8 }, barStyle]} testID="detail-controls">
        <PopIconButton icon="back" accessibilityLabel="Back" onPress={goBack} />
        <View style={styles.controlsRight}>
          <PopIconButton icon={fav ? 'heartFill' : 'heart'} accessibilityLabel={fav ? 'Remove from Favorites' : 'Add to Favorites'} onPress={onFavorite} iconColor={fav ? t.pop.tomato : t.pop.ink} haptic={null} />
          <PopIconButton icon="more" accessibilityLabel="More: share or save to a cookbook" onPress={() => setMenuOpen(true)} />
        </View>
      </Animated.View>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header: a tomato-tint band with the photo as a tilted card */}
        {/* Header: the buttons sit above the photo (12pt gap); the photo is straight, framed in ink. */}
        <View style={[styles.header, { backgroundColor: t.pop.tomatoTint, paddingTop: 0, borderBottomColor: t.pop.ink }]} testID="hero" onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Lift radius={24}>
            <View style={[styles.photoFrame, { width: photoWidth, height: Math.round(photoWidth * 0.75), backgroundColor: t.colors.imagePlaceholder }]}>
              <RecipePhoto recipe={recipe} iconSize={64} radius={21.5} />
            </View>
          </Lift>
          {recipe.custom && (
            <PopButton
              label={recipe.image ? 'Change photo' : 'Add a photo'}
              icon="camera"
              size="small"
              color={t.pop.white}
              onPress={async () => {
                try {
                  const uri = await pickPhoto();
                  if (uri) {
                    setRecipeImage(recipe.id, { uri });
                    haptics.success();
                    toast({ message: 'Photo saved', icon: 'camera' });
                  }
                } catch {
                  toast({ message: 'Couldn’t open your photos', tone: 'warning' });
                }
              }}
              style={{ alignSelf: 'center', marginTop: 14 }}
            />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.kicker}>
            <PopChip label={recipe.category} color={t.pop.sunshineTint} small />
            {recipe.custom && <PopChip label={recipe.origin === 'import' ? 'Imported' : 'My recipe'} color={t.pop.lilacTint} small />}
          </View>
          <Text
            style={[t.type.largeTitle, t.noWidows.style, { color: t.colors.label, marginTop: 10 }]}
            {...t.noWidows.props}
            accessibilityRole="header"
            onLayout={(e) => setTitleBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height + headerHeight)}
          >
            {recipe.title}
          </Text>
          {!!recipe.description && (
            <Text style={[t.type.body, t.noWidows.style, { color: t.colors.secondaryLabel, marginTop: 6 }]} {...t.noWidows.props}>
              {recipe.description}
            </Text>
          )}
          {!!recipe.sourceUrl && (
            <PressableScale
              onPress={() => Linking.openURL(recipe.sourceUrl!).catch(() => toast({ message: 'Couldn’t open that link', tone: 'warning' }))}
              accessibilityRole="link"
              accessibilityLabel={`Open original recipe at ${hostOf(recipe.sourceUrl)}`}
              style={styles.source}
            >
              <Icon name="link" size={15} color={t.colors.tint} weight="bold" />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black, textDecorationLine: 'underline' }]}>
                Original at {hostOf(recipe.sourceUrl)}
              </Text>
            </PressableScale>
          )}

          {/* Three colored stat tiles: time, difficulty + steps, kcal */}
          <Reveal index={1}>
            <View style={styles.stats}>
              <StatTile color={t.pop.sunshine} icon="clock" value={duration(recipe.minutes)} label="total" a11y={`${recipe.minutes} minutes total`} />
              <StatTile color={t.pop.leaf} hats={level} value={recipe.difficulty} label={nb(recipe.steps.length, recipe.steps.length === 1 ? 'step' : 'steps')} a11y={`${recipe.difficulty}, ${recipe.steps.length} steps`} />
              <StatTile color={t.pop.sky} icon="flame" value={`${recipe.calories}`} label={'kcal\u00A0each'} a11y={`${recipe.calories} calories per serving`} />
            </View>
          </Reveal>

          {/* Tags: plain labels, colored by kind */}
          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.map((tag) => (
                <PopChip key={tag} label={TAG_LOOK[tag as DietTag]?.label ?? tag} color={TAG_LOOK[tag as DietTag]?.color ?? t.pop.sunshineTint} small />
              ))}
            </View>
          )}

          {/* Nutrition: a one-line summary that opens into the details */}
          <Reveal index={2}>
            <Nutrition recipe={recipe} proteinGoal={isPro ? goals.protein : undefined} />
          </Reveal>

          {/* You'll need: servings in an outlined pill, units as a small switch */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            You’ll need
          </Text>
          {/* One row: servings on the left, units on the right. Both 44 tall. */}
          <View style={styles.needRow}>
            <PeopleStepper value={servings} onChange={setServings} />
            <View style={{ marginLeft: 'auto' }}>
              <Segmented small label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
            </View>
          </View>
          {/* Say why the number differs from the recipe, and offer the way back. */}
          {servings !== recipe.servings && (
            <PressableScale onPress={() => setServings(recipe.servings)} style={styles.resetServings} accessibilityLabel={`Use the recipe's ${recipe.servings} servings`} testID="servings-reset">
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>
                {servings === profile.household ? 'Sized for your household. ' : ''}The recipe makes {recipe.servings}.{' '}
                <Text style={{ color: t.colors.tint, fontFamily: t.fonts.black, textDecorationLine: 'underline' }}>{`Use\u00A0${recipe.servings}`}</Text>
              </Text>
            </PressableScale>
          )}
          <PopCard style={{ marginTop: 12 }} radius={22} depth={4}>
            {recipe.ingredients.map((ing, i) => {
              // The shared scaling rules (lib/scale.ts): full precision, rounded only here, for display.
              const shown = amountFor(ing, servings, recipe.servings, units);
              const amount = shown.text;
              const text = ingredientLabel(ing.name, shown, { lowercase: true });
              const got = have.has(ing.id);
              return (
                <Animated.View key={`${ing.id}-${i}`} entering={enter(i, reduceMotion)}>
                  <View
                    style={[styles.ingredient, i > 0 && { borderTopWidth: 1.5, borderTopColor: t.colors.separator }, got && { backgroundColor: t.pop.leafTint }]}
                    accessible
                    accessibilityLabel={`${amount} ${text}${got ? ', in pantry' : ''}`.trim()}
                    testID={`ing-row-${ing.id}`}
                  >
                    {got ? (
                      <View style={[styles.gotCheck, { backgroundColor: t.pop.leaf, borderColor: t.pop.ink }]}>
                        <Icon name="check" size={13} color={t.pop.ink} weight="bold" />
                      </View>
                    ) : (
                      <FoodIcon name={ing.name} aisle={ing.aisle} />
                    )}
                    {/* "3/4 red pepper": the amount in bold, then what it is */}
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.body, { color: t.colors.label }]}>
                        {amount ? (
                          <Text style={{ fontFamily: t.fonts.black, fontVariant: ['tabular-nums'] }} testID={`qty-${ing.id}`}>
                            {amount}{' '}
                          </Text>
                        ) : null}
                        {text}
                      </Text>
                      {ing.note ? <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{ing.note}</Text> : null}
                      {got && <Text style={[t.type.caption1, { color: t.colors.label }]}>in pantry</Text>}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </PopCard>
          {/* Method */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            How to make it
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${stepFor(step)}`}>
              <View style={[styles.stepNum, { backgroundColor: popCycle[i % popCycle.length].fill, borderColor: t.pop.ink }]}>
                <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.heading }]}>{i + 1}</Text>
              </View>
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{keepTogether(stepFor(step))}</Text>
            </View>
          ))}

          {/* Notes */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            My notes
          </Text>
          <TextInput maxFontSizeMultiplier={1.3}
            value={noteDraft}
            onChangeText={setNoteDraft}
            onBlur={() => {
              if ((notes[recipe.id] ?? '') !== noteDraft) {
                setNote(recipe.id, noteDraft);
                toast({ message: 'Note saved', icon: 'notes' });
              }
            }}
            placeholder="Swaps, tweaks, who loved it…"
            placeholderTextColor={t.colors.tertiaryLabel}
            multiline
            accessibilityLabel="My notes for this recipe"
            style={[t.type.body, styles.notes, { color: t.colors.label, backgroundColor: t.pop.sunshineTint, ...t.chunky.card }]}
          />

          {/* Never a dead end: three more to try (same main ingredient or meal first, then what you have). */}
          {alsoLike.length > 0 && (
            <>
              <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
                You might also like
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 6 }} testID="also-like">
                {alsoLike.map((r) => (
                  <RecipeCard key={r.id} recipe={r} width={160} />
                ))}
              </ScrollView>
            </>
          )}

          {recipe.custom && (
            <Button
              label={confirmDelete ? 'Tap again to delete' : 'Delete recipe'}
              icon="trash"
              variant="plain"
              onPress={onDelete}
              style={{ marginTop: 24 }}
              accessibilityLabel={confirmDelete ? 'Confirm delete recipe' : 'Delete recipe'}
            />
          )}
        </View>
      </Animated.ScrollView>

      <MoreMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        top={insets.top + 60}
        rows={[
          { label: 'Share recipe', icon: 'share', onPress: onShare },
          { label: inCookbooks > 0 ? 'Saved to a cookbook' : 'Save to a cookbook', icon: inCookbooks > 0 ? 'bookmarkFill' : 'bookmark', onPress: () => router.push({ pathname: '/save-to-cookbook', params: { id: recipe.id } }) },
        ]}
      />

      {/* Sticky actions: a basket for what's missing, and the big "Let's cook!" */}
      <BottomBar color={t.colors.background} border>
        <PopIconButton
          icon={justAdded === 'missing' ? 'check' : 'cartAdd'}
          size={56}
          iconSize={24}
          color={justAdded === 'missing' ? t.pop.leaf : t.pop.white}
          badge={justAdded ? undefined : missing.length || undefined}
          accessibilityLabel={missing.length && have.size ? `Add the ${missing.length} missing ingredients to the list` : 'Add the ingredients to the list'}
          onPress={() => (have.size ? onAdd('missing') : onAdd('all'))}
          testID="add-missing"
          haptic={null}
        />
        <PopButton
          label="Let’s cook!"
          icon="pot"
          onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, servings: String(servings) } })}
          accessibilityLabel={`Let’s cook ${recipe.title}`}
          style={{ flex: 1 }}
          testID="cook-now"
        />
      </BottomBar>
    </View>
  );
}

/** How each diet tag looks on the recipe page. */
const TAG_LOOK: Partial<Record<DietTag, { label: string; color: string }>> = {
  Vegetarian: { label: 'Veggie', color: pop.leafTint },
  Vegan: { label: 'Vegan', color: pop.leafTint },
  'Kid friendly': { label: 'Kids love it', color: pop.berryTint },
  'One pan': { label: 'One pan', color: pop.sunshineTint },
  'High protein': { label: 'High protein', color: pop.tomatoTint },
  'Gluten free': { label: 'Gluten free', color: pop.skyTint },
  'Comfort food': { label: 'Cozy', color: pop.lilacTint },
};

/** One colored stat tile: an icon (or chef hats), the value and a label. All three are the same height and size. */
function StatTile({ color, icon, hats, value, label, a11y }: { color: string; icon?: IconName; hats?: number; value: string; label: string; a11y?: string }) {
  const t = useTheme();
  // The value always shows in full on one line ("1 h 5 min"): the font shrinks to fit the tile
  // (Fredoka is about 0.56 em per letter, 0.28 per space) instead of cutting it off.
  const [width, setWidth] = useState(0);
  const scale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  const ems = [...value].reduce((n, c) => n + (/\s/.test(c) ? 0.28 : 0.56), 0);
  const fontSize = width ? Math.max(12, Math.min(22, Math.floor(width / (ems * scale)))) : 22;
  return (
    <Lift radius={20} style={styles.statLift}>
      <View style={[styles.stat, { backgroundColor: color, ...t.chunky.card }]} accessible accessibilityLabel={a11y ?? `${label}: ${value}`}>
        <View style={styles.statIcon}>{hats ? <ChefHats level={hats} color={t.pop.ink} empty={t.pop.ink} /> : icon ? <Icon name={icon} size={18} color={t.pop.ink} weight="bold" /> : null}</View>
        <Text
          style={[styles.statValue, { color: t.pop.ink, fontSize, lineHeight: 27, alignSelf: 'stretch' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {value}
        </Text>
        <Text style={[styles.statLabel, { color: t.pop.ink }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Lift>
  );
}

/** "− 4 people +" in an outlined pill. */
function PeopleStepper({ value, onChange, min = 1, max = 24 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const t = useTheme();
  return (
    <View
      style={[styles.people, { borderColor: t.pop.ink, backgroundColor: t.colors.cell }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Servings"
      accessibilityValue={{ min, max, now: value, text: `${value} ${value === 1 ? 'person' : 'people'}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
      }}
    >
      <IconButton icon="minus" haptic="select" accessibilityLabel="Fewer people" disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} color={t.pop.ink} size={39} />
      <Text style={[t.type.headline, styles.peopleText, { color: t.pop.ink }]} testID="servings-label">
        <Text testID="stepper-value">{value}</Text> {value === 1 ? 'person' : 'people'}
      </Text>
      <IconButton icon="plus" haptic="select" accessibilityLabel="More people" disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} color={t.pop.ink} size={39} />
    </View>
  );
}

/**
 * Per-serving nutrition: the calories, then one bar split by where those calories come from,
 * then each macro with its grams and share. With a protein goal, shows its share too.
 */
const NUTRITION_KEY = 'pantry-pop-nutrition-open';

/**
 * Per-serving nutrition. Closed, it's one line with the calories; open, it shows where those
 * calories come from (one split bar) and each macro. Your choice to open or close it is remembered.
 */
function Nutrition({ recipe, proteinGoal }: { recipe: Recipe; proteinGoal?: number }) {
  const t = useTheme();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(NUTRITION_KEY)
      .then((v) => v === '0' && setOpen(false))
      .catch(() => {});
  }, []);
  const toggle = () => {
    setOpen((o) => {
      AsyncStorage.setItem(NUTRITION_KEY, o ? '0' : '1').catch(() => {});
      return !o;
    });
  };
  const { protein, carbs, fat } = recipe.nutrition;
  // Share of calories from each (4, 4 and 9 kcal per gram), rounded so they add up to exactly 100.
  const [pP, pC, pF] = macroPercents(protein, carbs, fat);
  const pct = { protein: pP, carbs: pC, fat: pF };
  const total = pP + pC + pF;
  const rows = [
    { key: 'protein', label: 'Protein', grams: protein, color: t.colors.protein },
    { key: 'carbs', label: 'Carbs', grams: carbs, color: t.colors.carbs },
    { key: 'fat', label: 'Fat', grams: fat, color: t.colors.fat },
  ] as const;
  return (
    <Lift radius={t.layout.cardRadius} style={{ marginTop: 18 }}>
      <View style={[styles.card, styles.nutrition, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
        <PressableScale
          onPress={toggle}
          haptic="select"
          scaleTo={0.99}
          accessibilityRole="button"
          aria-expanded={open}
          accessibilityLabel={`Nutrition: ${recipe.calories} calories per serving, estimated. ${open ? 'Hide details' : 'Show details'}`}
          style={styles.kcal}
        >
          <View style={{ flex: 1 }}>
            <Text style={[t.type.title2, { color: t.colors.label }]} numberOfLines={1}>
              {nb(recipe.calories, 'kcal')}
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>per serving · estimated</Text>
          </View>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={t.colors.tertiaryLabel} weight="semibold" />
        </PressableScale>
        {open && total > 0 && (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }} accessible accessibilityLabel={`${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat per serving`}>
            <View style={styles.split}>
              {/* The bar uses the same rounded numbers as the labels. */}
              {rows.map((r) => (pct[r.key] > 0 ? <View key={r.key} style={{ flex: pct[r.key], backgroundColor: r.color, borderRadius: 6, borderWidth: 2, borderColor: t.pop.ink }} /> : null))}
            </View>
            <View style={styles.macros}>
              {rows.map((r) => (
                <View key={r.key} style={styles.macro}>
                  <View style={styles.macroLabel}>
                    <View style={[styles.dot, { backgroundColor: r.color }]} />
                    <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.label}</Text>
                  </View>
                  <Text style={[t.type.headline, { color: t.colors.label }]}>{nb(r.grams, 'g')}</Text>
                  <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{pct[r.key]}% of kcal</Text>
                </View>
              ))}
            </View>
            {proteinGoal ? (
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
                {Math.round((protein / proteinGoal) * 100)}% of your {nb(proteinGoal, 'g')} daily protein goal
              </Text>
            ) : null}
            <Text style={[t.type.caption1, { color: t.colors.tertiaryLabel }]}>{'Estimated from the ingredients. Not medical\u00A0advice.'}</Text>
          </Animated.View>
        )}
      </View>
    </Lift>
  );
}

/** Difficulty as one to three little chef hats. */
function ChefHats({ level, color, empty }: { level: number; color?: string; empty?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: 18, alignItems: 'center' }} accessibilityElementsHidden>
      {[1, 2, 3].map((i) => (
        <Svg key={i} width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M6 15 C 2 14 2 8 6 8 C 6 4 11 2 13 5 C 16 2 22 5 19 9 C 22 11 20 15 18 15 Z M6 16 L 18 16 L 18 20 C 18 21 17 21.5 16 21.5 L 8 21.5 C 7 21.5 6 21 6 20 Z"
            fill={i <= level ? (color ?? t.colors.tint) : 'none'}
            stroke={i <= level ? (color ?? t.colors.tint) : (empty ?? t.colors.tertiaryLabel)}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      ))}
    </View>
  );
}

/** The "…" menu in the header: Share and Save to a cookbook. */
function MoreMenu({ visible, onClose, top, rows }: { visible: boolean; onClose: () => void; top: number; rows: { label: string; icon: IconName; onPress: () => void }[] }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={onClose} accessibilityLabel="Close menu" />
      {/* Grows out of the ⋯ button's corner (top right). */}
      <Animated.View entering={popoverIn(reduceMotion)} style={[styles.menu, { top, transformOrigin: 'top right' }]}>
      <Lift radius={20}>
        <View style={[styles.menuFace, { backgroundColor: t.colors.elevated, ...t.chunky.card }]} accessibilityRole="menu">
          {rows.map((r, i) => (
            <PressableScale
              key={r.label}
              onPress={() => {
                onClose();
                r.onPress();
              }}
              accessibilityLabel={r.label}
              accessibilityRole="menuitem"
              scaleTo={0.98}
              style={[styles.menuRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator }]}
            >
              <Icon name={r.icon} size={18} color={t.colors.tint} />
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{r.label}</Text>
            </PressableScale>
          ))}
        </View>
      </Lift>
      </Animated.View>
    </Modal>
  );
}

const hostOf = (url: string) => {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/]+)/i);
  return m ? m[1] : url;
};

function shareText(r: Recipe, servings: number, units: Units) {
  const ingredients = r.ingredients.map((i) => {
    const shown = amountFor(i, servings, r.servings, units);
    return `• ${shown.text} ${ingredientLabel(i.name, shown)}`.replace('•  ', '• ');
  });
  // Checked recipe text already gives °C and °F: left exactly as written.
  const steps = r.steps.map((s, i) => `${i + 1}. ${r.source === 'pantry-pop' ? s : convertStepText(s, units)}`);
  return [`${r.title} (serves ${servings})`, '', 'Ingredients', ...ingredients, '', 'Method', ...steps].join('\n');
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingBottom: 24, borderBottomWidth: 2.5 },
  // The frame carries the ink border and clips; the photo inside has corners 2.5 smaller.
  photoFrame: { borderRadius: 24, borderWidth: 2.5, borderColor: pop.ink, overflow: 'hidden', borderCurve: 'continuous' },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', marginTop: 18, gap: 10 },
  statLift: { flex: 1 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 20, borderCurve: 'continuous' },
  statValue: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 27 },
  statIcon: { height: 20, justifyContent: 'center' },
  statLabel: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  kicker: { flexDirection: 'row', gap: 8 },
  gotCheck: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  h2: { marginTop: 32, marginBottom: 14 },
  // 39 + 2 × 2.5 border = 44 tall; only as wide as its content.
  people: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 2.5, borderRadius: 999, paddingHorizontal: 2 },
  needRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  peopleText: { minWidth: 84, textAlign: 'center', fontVariant: ['tabular-nums'] },
  card: { overflow: 'hidden', borderCurve: 'continuous' },
  nutrition: { gap: 16, padding: 16, overflow: 'visible' },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginVertical: -4 },
  split: { flexDirection: 'row', gap: 3, height: 16 },
  macros: { flexDirection: 'row' },
  macro: { flex: 1, gap: 2 },
  macroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: pop.ink },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, minHeight: 56, gap: 12 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNum: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  notes: { minHeight: 96, borderRadius: 20, padding: 16, textAlignVertical: 'top', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  resetServings: { minHeight: 44, justifyContent: 'center' },
  controls: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2 },
  controlsRight: { flexDirection: 'row', gap: 10 },
  menu: { position: 'absolute', right: 16, width: 260, maxWidth: '90%' },
  menuFace: { borderRadius: 20, overflow: 'hidden', borderCurve: 'continuous' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
});
