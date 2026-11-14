import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
import { CatSays } from '../../components/cats/CatSays';
import { say } from '../../components/cats/dialogue';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RecipePhoto } from '../../components/RecipeCard';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, IconButton, Segmented, Separator, Stepper } from '../../components/ui';
import { recipeKind, type DietTag, type Recipe, type Units } from '../../data/mock';
import { haptics } from '../../lib/haptics';
import { pickPhoto } from '../../lib/photos';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, roundQty, useBuddy, useStore } from '../../state/store';
import { useTheme } from '../../theme';

export default function RecipeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const buddy = useBuddy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getRecipe, isFavorite, toggleFavorite, addIngredients, showOnlyTag, units, setUnits, notes, setNote,
    cookbooks, favorites, deleteRecipe, setRecipeImage, goals, profile, isPro,
  } = useStore();
  const recipe = getRecipe(id);

  // Opens sized for your household (from onboarding), or the recipe's own servings.
  const [servings, setServings] = useState(profile.household ?? recipe?.servings ?? 2);
  const [justAdded, setJustAdded] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [lineN, setLineN] = useState(0);
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

  const heroHeight = Math.min(Math.round(width * 0.92), 520);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  // Swap the status bar style once the compact bar covers the photo.
  const barThreshold = heroHeight - insets.top - 70;
  useAnimatedReaction(
    () => scrollY.get() > barThreshold,
    (visible, prev) => {
      if (visible !== prev) scheduleOnRN(setBarVisible, visible);
    },
    [barThreshold],
  );

  // Stretch on pull-down, gentle parallax on scroll.
  const heroStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    return { transform: [{ translateY: y < 0 ? y / 2 : y * 0.35 }, { scale: y < 0 ? 1 + -y / heroHeight : 1 }] };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [barThreshold - 40, barThreshold], [0, 1], Extrapolation.CLAMP),
  }));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" cat={{ buddy, mood: 'worried' }} title="Recipe Not Found" message="It may have been removed." action={{ label: 'Back to Recipes', onPress: goBack }} />
      </View>
    );
  }

  const fav = isFavorite(recipe.id);
  const inCookbooks = cookbooks.filter((c) => c.recipeIds.includes(recipe.id)).length + (favorites.includes(recipe.id) ? 1 : 0);
  const scale = servings / recipe.servings;
  const line = say(buddy, recipeKind(recipe), { protein: recipe.nutrition.protein }, lineN);

  const onFavorite = () => {
    const now = toggleFavorite(recipe.id);
    toast({
      message: now ? 'Added to Favorites' : 'Removed from Favorites',
      icon: now ? 'heartFill' : 'heart',
      tone: now ? 'success' : 'info',
      action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
    });
  };

  const onAdd = () => {
    const n = addIngredients(recipe.id, recipe.ingredients, scale);
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 1800);
    toast({
      message: `Added ${n} ingredients for ${servings} ${servings === 1 ? 'serving' : 'servings'}`,
      icon: 'cart',
      action: { label: 'View', onPress: () => router.navigate('/groceries') },
    });
  };

  const onTag = (tag: DietTag) => {
    showOnlyTag(tag);
    router.dismissTo('/');
    toast({ message: `Showing ${tag.toLowerCase()} recipes`, tone: 'info', icon: 'search' });
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

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'clock', value: `${recipe.minutes} min`, label: 'Time' },
    { icon: 'people', value: `${recipe.servings}`, label: 'Serves' },
    { icon: 'chart', value: recipe.difficulty, label: 'Difficulty' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <StatusBar style={barVisible ? 'auto' : 'light'} animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* Hero */}
        <Animated.View style={[{ height: heroHeight, backgroundColor: t.colors.imagePlaceholder }, heroStyle]}>
          <RecipePhoto recipe={recipe} iconSize={72} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} style={[styles.heroShade, { height: insets.top + 90 }]} pointerEvents="none" />
          {recipe.custom && (
            <PressableScale
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
              accessibilityLabel={recipe.image ? 'Change photo' : 'Add a photo'}
              style={[styles.photoBtn, { bottom: t.radius.xl + 12, backgroundColor: t.colors.scrim }]}
            >
              <Icon name="camera" size={16} color="#FFFFFF" />
              <Text style={[t.type.subhead, { color: '#FFFFFF', fontWeight: '700' }]}>{recipe.image ? 'Change photo' : 'Add photo'}</Text>
            </PressableScale>
          )}
        </Animated.View>

        <View style={[styles.body, { backgroundColor: t.colors.background, borderRadius: t.radius.xl, marginTop: -t.radius.xl }]}>
          <Text style={[t.type.footnote, { color: t.colors.tint, fontWeight: 'normal', letterSpacing: 0.6, fontFamily: t.fonts.rounded }]}>
            {recipe.category.toUpperCase()}
            {recipe.custom ? (recipe.origin === 'import' ? ' · IMPORTED' : ' · MY RECIPE') : ''}
          </Text>
          <Text style={[t.type.largeTitle, { color: t.colors.label, marginTop: 4 }]} accessibilityRole="header">
            {recipe.title}
          </Text>
          {!!recipe.description && <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 8 }]}>{recipe.description}</Text>}
          {!!recipe.sourceUrl && (
            <PressableScale
              onPress={() => Linking.openURL(recipe.sourceUrl!).catch(() => toast({ message: 'Couldn’t open that link', tone: 'warning' }))}
              accessibilityRole="link"
              accessibilityLabel={`Open original recipe at ${hostOf(recipe.sourceUrl)}`}
              style={styles.source}
            >
              <Icon name="link" size={15} color={t.colors.tint} />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]} numberOfLines={1}>
                Original at {hostOf(recipe.sourceUrl)}
              </Text>
            </PressableScale>
          )}

          <View style={[styles.stats, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: 1.5, borderLeftColor: t.colors.separator }]} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
                <Icon name={s.icon} size={18} color={t.colors.tint} />
                <Text style={[t.type.headline, { color: t.colors.label }]}>{s.value}</Text>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.map((tag) => (
                <PressableScale
                  key={tag}
                  haptic="select"
                  onPress={() => onTag(tag)}
                  accessibilityRole="link"
                  hitSlop={{ top: 4, bottom: 4 }}
                  accessibilityLabel={`${tag}. Show all ${tag.toLowerCase()} recipes`}
                  style={[styles.tag, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}
                >
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>{tag}</Text>
                  <Icon name="chevronRight" size={11} color={t.colors.tint} weight="bold" />
                </PressableScale>
              ))}
            </View>
          )}

          {/* The buddy reacts to this recipe */}
          <CatSays buddy={buddy} line={line} size={96} onNext={() => setLineN((n) => n + 1)} hint="Tap for more" style={{ marginTop: 20 }} />

          {/* Nutrition */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            Nutrition
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: -8, marginBottom: 10 }]}>Estimated per serving, from the ingredients</Text>
          <Nutrition recipe={recipe} proteinGoal={buddy === 'tank' && isPro ? goals.protein : undefined} />

          {/* Ingredients */}
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[t.type.title2, { color: t.colors.label }]} accessibilityRole="header">
                Ingredients
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 2 }]}>
                {servings} {servings === 1 ? 'serving' : 'servings'}
              </Text>
            </View>
            <Stepper value={servings} onChange={setServings} label="servings" />
          </View>
          <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <Segmented label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
          </View>
          <View style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]}>
            {recipe.ingredients.map((ing, i) => {
              const c = convertQty(roundQty(ing.quantity * scale), ing.unit, units);
              return (
                <View key={`${ing.id}-${i}`}>
                  {i > 0 && <Separator inset={16} />}
                  <View style={styles.ingredient}>
                    <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{ing.name}</Text>
                    <Text style={[t.type.body, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]} testID={`qty-${ing.id}`}>
                      {formatQty(c.quantity, c.unit)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Method */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            Method
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${convertStepText(step, units)}`}>
              <View style={[styles.stepNum, { backgroundColor: t.colors.tintSoft, borderColor: t.colors.border }]}>
                <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>{i + 1}</Text>
              </View>
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{convertStepText(step, units)}</Text>
            </View>
          ))}

          {/* Notes */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            My Notes
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
            style={[t.type.body, styles.notes, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
          />

          {recipe.custom && (
            <Button
              label={confirmDelete ? 'Tap again to delete' : 'Delete Recipe'}
              icon="trash"
              variant="plain"
              onPress={onDelete}
              style={{ marginTop: 24 }}
              accessibilityLabel={confirmDelete ? 'Confirm delete recipe' : 'Delete recipe'}
            />
          )}
        </View>
      </Animated.ScrollView>

      {/* Compact bar that fades in once the photo scrolls away */}
      <Animated.View pointerEvents="none" style={[styles.topBar, { height: insets.top + 56 }, barStyle]}>
        <BlurView tint="systemChromeMaterial" intensity={90} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.separator }]} />
        <Text style={[t.type.headline, styles.topTitle, { color: t.colors.label, top: insets.top + 17 }]} numberOfLines={1}>
          {recipe.title}
        </Text>
      </Animated.View>

      {/* Floating controls */}
      <View style={[styles.controls, { top: insets.top + 6 }]} pointerEvents="box-none">
        <GlassButton icon="back" label="Back" onPress={goBack} />
        <View style={styles.controlsRight}>
          <GlassButton icon="share" label="Share recipe" onPress={onShare} />
          <GlassButton
            icon={inCookbooks > 0 ? 'bookmarkFill' : 'bookmark'}
            label="Save to cookbook"
            onPress={() => router.push({ pathname: '/save-to-cookbook', params: { id: recipe.id } })}
            color={inCookbooks > 0 ? t.colors.tint : undefined}
          />
          <GlassButton icon={fav ? 'heartFill' : 'heart'} label={fav ? 'Remove from Favorites' : 'Add to Favorites'} onPress={onFavorite} color={fav ? t.colors.accent : undefined} />
        </View>
      </View>

      {/* Sticky actions */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <BlurView tint="systemChromeMaterial" intensity={90} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator }]} />
        <View style={styles.bottomRow}>
          <Button
            label={justAdded ? 'Added' : 'Add to List'}
            icon={justAdded ? 'check' : 'cartAdd'}
            variant="success"
            onPress={onAdd}
            style={{ flex: 1 }}
            accessibilityLabel={`Add ingredients for ${servings} servings to the grocery list`}
          />
          <Button
            label="Cook Now"
            icon="pot"
            onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, servings: String(servings) } })}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

/** Per-serving nutrition with macro bars. With a protein goal, shows its share. */
function Nutrition({ recipe, proteinGoal }: { recipe: Recipe; proteinGoal?: number }) {
  const t = useTheme();
  const { protein, carbs, fat } = recipe.nutrition;
  const kcalFrom = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 };
  const total = kcalFrom.protein + kcalFrom.carbs + kcalFrom.fat || 1;
  const rows = [
    { key: 'protein', label: 'Protein', grams: protein, color: t.colors.protein },
    { key: 'carbs', label: 'Carbs', grams: carbs, color: t.colors.carbs },
    { key: 'fat', label: 'Fat', grams: fat, color: t.colors.fat },
  ] as const;
  return (
    <View style={[styles.card, styles.nutrition, { backgroundColor: t.colors.cell, borderRadius: t.radius.lg, ...t.chunky.card }]} accessible accessibilityLabel={`${recipe.calories} calories, ${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat per serving`}>
      <View style={styles.kcal}>
        <Text style={[t.type.title1, { color: t.colors.label }]}>{recipe.calories}</Text>
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>kcal</Text>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {rows.map((r) => (
          <View key={r.key}>
            <View style={styles.macroLabel}>
              <Text style={[t.type.footnote, { color: t.colors.label, fontWeight: '600' }]}>{r.label}</Text>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]}>{r.grams} g</Text>
            </View>
            <View style={[styles.track, { backgroundColor: t.colors.fill }]}>
              <Animated.View entering={FadeIn.duration(400)} style={[styles.bar, { backgroundColor: r.color, width: `${Math.max(4, (kcalFrom[r.key] / total) * 100)}%` }]} />
            </View>
          </View>
        ))}
        {proteinGoal ? (
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>
            {Math.round((protein / proteinGoal) * 100)}% of your {proteinGoal} g daily protein goal
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Circular blurred button that reads well over photos and the blurred bar. */
function GlassButton({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <View style={styles.glass}>
      <BlurView tint="systemChromeMaterial" intensity={80} style={StyleSheet.absoluteFill} />
      <IconButton icon={icon} accessibilityLabel={label} onPress={onPress} color={color ?? t.colors.label} iconSize={18} />
    </View>
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
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  photoBtn: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22 },
  body: { paddingHorizontal: 20, paddingTop: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderCurve: 'continuous' },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', marginTop: 16, paddingVertical: 14, borderCurve: 'continuous' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  h2: { marginTop: 32, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 12 },
  card: { overflow: 'hidden', borderCurve: 'continuous' },
  nutrition: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, overflow: 'visible' },
  kcal: { alignItems: 'center', minWidth: 72 },
  macroLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48, gap: 12 },
  step: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: -3, borderWidth: 1.5 },
  notes: { minHeight: 96, borderRadius: 16, padding: 14, textAlignVertical: 'top', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  topTitle: { position: 'absolute', left: 72, right: 150, textAlign: 'center' },
  controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  controlsRight: { flexDirection: 'row', gap: 8 },
  glass: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, overflow: 'hidden' },
  bottomRow: { flexDirection: 'row', gap: 10 },
});

