import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Reveal } from '../../components/Reveal';
import { Linking, Modal, Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pantryHas } from '../../lib/pantry';
import { FoodIcon } from '../../components/FoodIcon';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RecipePhoto } from '../../components/RecipeCard';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, IconButton, Segmented } from '../../components/ui';
import { PopButton, PopCard, PopChip, PopIconButton } from '../../components/pop';
import { type DietTag, type Recipe, type Units } from '../../data/mock';
import { haptics } from '../../lib/haptics';
import { pickPhoto } from '../../lib/photos';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, roundQty, useStore } from '../../state/store';
import { ingredientText } from '../../lib/qty';
import { pop, popCycle, useTheme } from '../../theme';

export default function RecipeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getRecipe, isFavorite, toggleFavorite, addIngredients, units, setUnits, notes, setNote,
    cookbooks, favorites, deleteRecipe, setRecipeImage, goals, profile, isPro, pantry,
  } = useStore();
  const recipe = getRecipe(id);

  // Opens sized for your household (from onboarding), or the recipe's own servings.
  const [servings, setServings] = useState(profile.household ?? recipe?.servings ?? 2);
  const [justAdded, setJustAdded] = useState<'all' | 'missing' | null>(null);
  const [barVisible, setBarVisible] = useState(false);
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

  // The compact bar (and its small title) appears once the big title has scrolled under it.
  const barThreshold = Math.max(120, titleBottom - insets.top - 60);
  useAnimatedReaction(
    () => scrollY.get() > barThreshold,
    (visible, prev) => {
      if (visible !== prev) scheduleOnRN(setBarVisible, visible);
    },
    [barThreshold],
  );

  // The photo card sits tilted; it grows a little when you pull down. Numbers only in here.
  const heroStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    return { transform: [{ rotate: '-2deg' }, { scale: y < 0 ? 1 + -y / 700 : 1 }] };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [barThreshold - 40, barThreshold], [0, 1], Extrapolation.CLAMP),
  }));

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
  const photoWidth = Math.min(width - 56, 460);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <StatusBar style="dark" animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Header: a tomato-tint band with the photo as a tilted card */}
        <View style={[styles.header, { backgroundColor: t.pop.tomatoTint, paddingTop: insets.top + 64, borderBottomColor: t.pop.ink }]} testID="hero" onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Animated.View style={[styles.photoCard, { width: photoWidth, height: Math.round(photoWidth * 0.75), backgroundColor: t.colors.imagePlaceholder }, heroStyle]}>
            <View style={styles.photoClip}>
              <RecipePhoto recipe={recipe} iconSize={64} />
            </View>
          </Animated.View>
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
              <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.black, textDecorationLine: 'underline' }]} numberOfLines={1}>
                Original at {hostOf(recipe.sourceUrl)}
              </Text>
            </PressableScale>
          )}

          {/* Three colored stat tiles: time, difficulty + steps, kcal */}
          <Reveal index={1}>
            <View style={styles.stats}>
              <StatTile color={t.pop.sunshine} icon="clock" value={`${recipe.minutes} min`} label="Total time" />
              <StatTile color={t.pop.leaf} hats={level} value={recipe.difficulty} label={`${recipe.steps.length} ${recipe.steps.length === 1 ? 'step' : 'steps'}`} a11y={`${recipe.difficulty}, ${recipe.steps.length} steps`} />
              <StatTile color={t.pop.sky} icon="flame" value={`${recipe.calories}`} label="kcal / serving" a11y={`${recipe.calories} calories per serving`} />
            </View>
          </Reveal>

          {/* Tags: plain labels, colored by kind */}
          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.map((tag) => (
                <PopChip key={tag} label={TAG_LOOK[tag]?.label ?? tag} color={TAG_LOOK[tag]?.color ?? t.pop.sunshineTint} small />
              ))}
            </View>
          )}

          {/* Nutrition: a one-line summary that opens into the details */}
          <Reveal index={2}>
            <Nutrition recipe={recipe} proteinGoal={isPro ? goals.protein : undefined} />
          </Reveal>

          {/* You'll need: servings in an outlined pill, units as a small switch */}
          <View style={styles.needHead}>
            <Text style={[t.type.title2, { color: t.colors.label, flex: 1 }]} accessibilityRole="header">
              You’ll need
            </Text>
            <Segmented small label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
          </View>
          <PeopleStepper value={servings} onChange={setServings} />
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
              const c = convertQty(roundQty(ing.quantity * scale), ing.unit, units);
              const { amount, text } = ingredientText(c.quantity, c.unit, ing.name);
              const got = have.has(ing.id);
              return (
                <Animated.View key={`${ing.id}-${i}`} entering={FadeIn.duration(260).delay(120 + Math.min(i, 12) * 40)}>
                  <View
                    style={[styles.ingredient, i > 0 && { borderTopWidth: 1.5, borderTopColor: t.colors.separator }, got && { backgroundColor: t.pop.leafTint }]}
                    accessible
                    accessibilityLabel={`${amount} ${text}${got ? ', already in pantry' : ''}`.trim()}
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
                      {got && <Text style={[t.type.caption1, { color: t.colors.label }]}>already in pantry</Text>}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </PopCard>
          {/* Right under the list, where you decide what to buy */}
          <Button
            label={justAdded === 'all' ? 'Added' : have.size ? 'Add all to groceries' : 'Add to groceries'}
            icon={justAdded === 'all' ? 'check' : 'cartAdd'}
            variant={justAdded === 'all' ? 'success' : 'tinted'}
            size="medium"
            onPress={() => onAdd('all')}
            style={{ marginTop: 16, alignSelf: 'stretch' }}
            accessibilityLabel={justAdded === 'all' ? 'Added to the grocery list' : `Add ingredients for ${servings} servings to the grocery list`}
          />

          {/* Method */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            How to make it
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${convertStepText(step, units)}`}>
              <View style={[styles.stepNum, { backgroundColor: popCycle[i % popCycle.length].fill, borderColor: t.pop.ink }]}>
                <Text style={[t.type.headline, { color: t.pop.ink, fontFamily: t.fonts.heading }]}>{i + 1}</Text>
              </View>
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{convertStepText(step, units)}</Text>
            </View>
          ))}

          {/* Notes */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            My notes
          </Text>
          <TextInput
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

      {/* Compact bar that fades in once the title scrolls away. It catches touches, so nothing
          under it can be tapped by accident. */}
      <Animated.View style={[styles.topBar, { height: insets.top + 60, backgroundColor: t.colors.background, borderBottomColor: t.pop.ink }, barStyle]} testID="detail-bar" pointerEvents={barVisible ? 'auto' : 'none'}>
        <View style={[styles.topTitle, { top: insets.top, height: 60 }]}>
          <Text style={[recipe.title.length > 22 ? styles.topTitleSmall : t.type.title3, { color: t.colors.label, textAlign: 'center', fontFamily: t.fonts.heading }]} numberOfLines={2}>
            {recipe.title}
          </Text>
        </View>
      </Animated.View>

      {/* Back, heart and more */}
      <View style={[styles.controls, { top: insets.top + 8 }]} pointerEvents="box-none">
        <PopIconButton icon="back" accessibilityLabel="Back" onPress={goBack} />
        <View style={styles.controlsRight}>
          <PopIconButton icon={fav ? 'heartFill' : 'heart'} accessibilityLabel={fav ? 'Remove from Favorites' : 'Add to Favorites'} onPress={onFavorite} iconColor={fav ? t.pop.tomato : t.pop.ink} haptic={null} />
          <PopIconButton icon="more" accessibilityLabel="More: share or save to a cookbook" onPress={() => setMenuOpen(true)} />
        </View>
      </View>

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
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14), backgroundColor: t.colors.background, borderTopColor: t.pop.ink }]}>
        <PopIconButton
          icon={justAdded === 'missing' ? 'check' : 'cartAdd'}
          size={56}
          iconSize={24}
          color={justAdded === 'missing' ? t.pop.leaf : t.pop.white}
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
      </View>
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
};

/** One colored stat tile: an icon (or chef hats), a big value and a small label. */
function StatTile({ color, icon, hats, value, label, a11y }: { color: string; icon?: IconName; hats?: number; value: string; label: string; a11y?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: color, ...t.chunky.card }]} accessible accessibilityLabel={a11y ?? `${label}: ${value}`}>
      {hats ? <ChefHats level={hats} color={t.pop.ink} empty={t.pop.ink} /> : icon ? <Icon name={icon} size={18} color={t.pop.ink} weight="bold" /> : null}
      <Text style={[t.type.title3, { color: t.pop.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {value}
      </Text>
      <Text style={[t.type.caption1, { color: t.pop.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
    </View>
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
      <IconButton icon="minus" haptic="select" accessibilityLabel="Fewer people" disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} color={t.pop.ink} />
      <Text style={[t.type.headline, styles.peopleText, { color: t.pop.ink }]} testID="servings-label">
        <Text testID="stepper-value">{value}</Text> {value === 1 ? 'person' : 'people'}
      </Text>
      <IconButton icon="plus" haptic="select" accessibilityLabel="More people" disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} color={t.pop.ink} />
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
  const kcalFrom = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 };
  const total = kcalFrom.protein + kcalFrom.carbs + kcalFrom.fat;
  const rows = [
    { key: 'protein', label: 'Protein', grams: protein, color: t.colors.protein },
    { key: 'carbs', label: 'Carbs', grams: carbs, color: t.colors.carbs },
    { key: 'fat', label: 'Fat', grams: fat, color: t.colors.fat },
  ] as const;
  return (
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
        <Text style={[t.type.title2, { color: t.colors.label }]}>{recipe.calories}</Text>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, flex: 1 }]}>kcal per serving, estimated</Text>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={t.colors.tertiaryLabel} weight="semibold" />
      </PressableScale>
      {open && total > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }} accessible accessibilityLabel={`${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat per serving`}>
          <View style={styles.split}>
            {rows.map((r) => (
              <View key={r.key} style={{ flex: Math.max(kcalFrom[r.key], total * 0.03), backgroundColor: r.color, borderRadius: 6 }} />
            ))}
          </View>
          <View style={styles.macros}>
            {rows.map((r) => (
              <View key={r.key} style={styles.macro}>
                <View style={styles.macroLabel}>
                  <View style={[styles.dot, { backgroundColor: r.color }]} />
                  <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{r.label}</Text>
                </View>
                <Text style={[t.type.headline, { color: t.colors.label }]}>{r.grams} g</Text>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{Math.round((kcalFrom[r.key] / total) * 100)}% of kcal</Text>
              </View>
            ))}
          </View>
          {proteinGoal ? (
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
              {Math.round((protein / proteinGoal) * 100)}% of your {proteinGoal} g daily protein goal
            </Text>
          ) : null}
          <Text style={[t.type.caption1, { color: t.colors.tertiaryLabel }]}>Estimated from the ingredients. Not medical advice.</Text>
        </Animated.View>
      )}
    </View>
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={[styles.menu, { top, backgroundColor: t.colors.elevated, ...t.chunky.card }]} accessibilityRole="menu">
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
    </Modal>
  );
}

const hostOf = (url: string) => {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/]+)/i);
  return m ? m[1] : url;
};

function shareText(r: Recipe, servings: number, units: Units) {
  const scale = servings / r.servings;
  const ingredients = r.ingredients.map((i) => {
    const c = convertQty(roundQty(i.quantity * scale), i.unit, units);
    return `• ${formatQty(c.quantity, c.unit)} ${i.name}`.replace("•  ", "• ");
  });
  const steps = r.steps.map((s, i) => `${i + 1}. ${convertStepText(s, units)}`);
  return [`${r.title} (serves ${servings})`, '', 'Ingredients', ...ingredients, '', 'Method', ...steps].join('\n');
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingBottom: 28, borderBottomWidth: 2.5 },
  photoCard: { borderRadius: 24, borderWidth: 2.5, borderColor: pop.ink, shadowColor: pop.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 5 }, borderCurve: 'continuous' },
  photoClip: { flex: 1, borderRadius: 21, overflow: 'hidden' },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', marginTop: 18, gap: 10 },
  stat: { flex: 1, alignItems: 'flex-start', gap: 3, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 20, borderCurve: 'continuous' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  kicker: { flexDirection: 'row', gap: 8 },
  gotCheck: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  h2: { marginTop: 32, marginBottom: 14 },
  needHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 12 },
  people: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 2.5, borderRadius: 999, paddingHorizontal: 4 },
  peopleText: { minWidth: 92, textAlign: 'center', fontVariant: ['tabular-nums'] },
  card: { overflow: 'hidden', borderCurve: 'continuous' },
  nutrition: { gap: 16, padding: 16, overflow: 'visible', marginTop: 18 },
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
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: 2.5 },
  topTitle: { position: 'absolute', left: 72, right: 120, justifyContent: 'center', alignItems: 'center' },
  topTitleSmall: { fontSize: 15, lineHeight: 18 },
  resetServings: { minHeight: 44, justifyContent: 'center' },
  controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  controlsRight: { flexDirection: 'row', gap: 10 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 2.5 },
  menu: { position: 'absolute', right: 16, width: 260, maxWidth: '90%', borderRadius: 20, overflow: 'hidden', borderCurve: 'continuous' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
});
