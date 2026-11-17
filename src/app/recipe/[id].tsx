import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
import { MascotSays } from '../../components/mascot/MascotSays';
import { say, type Line } from '../../components/mascot/lines';
import { FoodIcon } from '../../components/FoodIcon';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { RecipePhoto } from '../../components/RecipeCard';
import { useToast } from '../../components/Toast';
import { Button, Chip, EmptyState, IconButton, Segmented, Separator, Stepper } from '../../components/ui';
import { recipeKind, type DietTag, type Recipe, type Units } from '../../data/mock';
import { haptics } from '../../lib/haptics';
import { pickPhoto } from '../../lib/photos';
import { convertQty, convertStepText } from '../../lib/units';
import { formatQty, roundQty, useStore } from '../../state/store';
import { ingredientText } from '../../lib/qty';
import { useTheme } from '../../theme';

export default function RecipeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
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
  const [menuOpen, setMenuOpen] = useState(false);
  // Where the big title ends, so the small one appears only once it has scrolled away.
  const [titleBottom, setTitleBottom] = useState(0);
  const [lineN, setLineN] = useState(0);
  const [reaction, setReaction] = useState<Line | null>(null);
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

  // The compact bar (and its small title) appears once the big title has scrolled under it.
  const barThreshold = Math.max(heroHeight - insets.top - 70, titleBottom - insets.top - 56);
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
        <EmptyState icon="fork" cat="oops" title="Recipe not found" message="It may have been removed." action={{ label: 'Back to recipes', onPress: goBack }} />
      </View>
    );
  }

  const fav = isFavorite(recipe.id);
  const inCookbooks = cookbooks.filter((c) => c.recipeIds.includes(recipe.id)).length + (favorites.includes(recipe.id) ? 1 : 0);
  const scale = servings / recipe.servings;
  // Biscuit reacts to what you just did here (saved it, added it to the list), or to the recipe.
  const line = reaction ?? say(recipeKind(recipe), { protein: recipe.nutrition.protein }, lineN);

  const onFavorite = () => {
    const now = toggleFavorite(recipe.id);
    setReaction(now ? say('favorite') : null);
    toast({
      message: now ? 'Added to Favorites' : 'Removed from Favorites',
      icon: now ? 'heartFill' : 'heart',
      tone: now ? 'success' : 'info',
      action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
    });
  };

  const onAdd = () => {
    const n = addIngredients(recipe.id, recipe.ingredients, scale);
    setReaction(say('addedToList'));
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

  const level = recipe.difficulty === 'Easy' ? 1 : recipe.difficulty === 'Medium' ? 2 : 3;
  const stats: { icon: IconName | 'hats'; value: string; label: string }[] = [
    { icon: 'clock', value: `${recipe.minutes} min`, label: 'Time' },
    { icon: 'people', value: `${recipe.servings}`, label: 'Serves' },
    { icon: 'hats', value: recipe.difficulty, label: 'Difficulty' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <StatusBar style={barVisible ? (t.isDark ? 'light' : 'dark') : 'light'} animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* Hero */}
        <Animated.View testID="hero" style={[{ height: heroHeight, backgroundColor: t.colors.imagePlaceholder }, heroStyle]}>
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
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>
            {recipe.category}
            {recipe.custom ? (recipe.origin === 'import' ? ', imported' : ', my recipe') : ''}
          </Text>
          <Text
            style={[t.type.largeTitle, t.noWidows.style, { color: t.colors.label, marginTop: 4 }]}
            {...t.noWidows.props}
            accessibilityRole="header"
            onLayout={(e) => setTitleBottom(heroHeight - t.radius.xl + 24 + e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
          >
            {recipe.title}
          </Text>
          {!!recipe.description && (
            <Text style={[t.type.body, t.noWidows.style, { color: t.colors.secondaryLabel, marginTop: 8 }]} {...t.noWidows.props}>
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
              <Icon name="link" size={15} color={t.colors.tint} />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]} numberOfLines={1}>
                Original at {hostOf(recipe.sourceUrl)}
              </Text>
            </PressableScale>
          )}

          <View style={[styles.stats, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: 2, borderLeftColor: t.colors.separator }]} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
                {s.icon === 'hats' ? <ChefHats level={level} /> : <Icon name={s.icon} size={18} color={t.colors.tint} />}
                <Text style={[t.type.headline, { color: t.colors.label }]}>{s.value}</Text>
                <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {recipe.tags.length > 0 && (
            <View style={styles.tags}>
              {recipe.tags.map((tag) => (
                <Chip key={tag} label={tag} trailing="chevronRight" toggle={false} accessibilityLabel={`${tag}. Show all ${tag.toLowerCase()} recipes`} onPress={() => onTag(tag)} />
              ))}
            </View>
          )}

          {/* Biscuit reacts to this recipe */}
          <MascotSays line={line} size={80} onNext={() => {
              setReaction(null);
              setLineN((n) => n + 1);
            }} style={{ marginTop: 24 }} />

          {/* Nutrition */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            Nutrition
          </Text>
          <Nutrition recipe={recipe} proteinGoal={isPro ? goals.protein : undefined} />

          {/* Ingredients */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            Ingredients
          </Text>
          {/* Servings on their own row; units as a small switch underneath */}
          <View style={styles.servings}>
            <Stepper value={servings} onChange={setServings} label="servings" />
            <Text style={[t.type.headline, { color: t.colors.label }]} testID="servings-label">
              {servings} {servings === 1 ? 'serving' : 'servings'}
            </Text>
          </View>
          {/* Say why the number differs from the recipe, and offer the way back. */}
          {servings !== recipe.servings && (
            <PressableScale onPress={() => setServings(recipe.servings)} style={styles.resetServings} accessibilityLabel={`Use the recipe's ${recipe.servings} servings`} testID="servings-reset">
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>
                {servings === profile.household ? 'Sized for your household. ' : ''}The recipe makes {recipe.servings}.{' '}
                <Text style={{ color: t.colors.tint, fontFamily: t.fonts.display }}>{`Use\u00A0${recipe.servings}`}</Text>
              </Text>
            </PressableScale>
          )}
          <View style={styles.units}>
            <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Units</Text>
            <Segmented label="Units" value={units} onChange={(u: Units) => setUnits(u)} options={[{ label: 'Metric', value: 'metric' }, { label: 'US', value: 'us' }]} />
          </View>
          <View style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}>
            {recipe.ingredients.map((ing, i) => {
              const c = convertQty(roundQty(ing.quantity * scale), ing.unit, units);
              const { amount, text } = ingredientText(c.quantity, c.unit, ing.name);
              return (
                <View key={`${ing.id}-${i}`}>
                  {i > 0 && <Separator inset={60} />}
                  <View style={styles.ingredient} accessible accessibilityLabel={`${amount} ${text}`.trim()}>
                    <FoodIcon name={ing.name} aisle={ing.aisle} />
                    {/* "3/4 red pepper": the amount in bold, then what it is */}
                    <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>
                      {amount ? (
                        <Text style={{ fontFamily: t.fonts.display, fontVariant: ['tabular-nums'] }} testID={`qty-${ing.id}`}>
                          {amount}{' '}
                        </Text>
                      ) : null}
                      {text}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          {/* Right under the list, where you decide what to buy */}
          <Button
            label={justAdded ? 'Added' : 'Add to groceries'}
            icon={justAdded ? 'check' : 'cartAdd'}
            variant={justAdded ? 'success' : 'tinted'}
            onPress={onAdd}
            style={{ marginTop: 16 }}
            accessibilityLabel={justAdded ? 'Added to the grocery list' : `Add ingredients for ${servings} servings to the grocery list`}
          />

          {/* Method */}
          <Text style={[t.type.title2, styles.h2, { color: t.colors.label }]} accessibilityRole="header">
            Method
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${convertStepText(step, units)}`}>
              <View style={[styles.stepNum, { backgroundColor: t.colors.tintSoft }]}>
                <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>{i + 1}</Text>
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
            style={[t.type.body, styles.notes, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
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

      {/* Compact bar that fades in once the photo scrolls away */}
      {/* It is solid behind the clock, and catches touches so nothing under it can be tapped by accident. */}
      <Animated.View style={[styles.topBar, { height: insets.top + 56 }, barStyle]} testID="detail-bar">
        <BlurView tint={t.isDark ? 'dark' : 'light'} intensity={40} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bar }]} />
        <View style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.separator }]} />
        <View style={[styles.topTitle, { top: insets.top, height: 56 }]}>
          {/* Long titles take two smaller lines instead of being cut off. */}
          <Text style={[recipe.title.length > 22 ? styles.topTitleSmall : t.type.headline, { color: t.colors.label, textAlign: 'center', fontFamily: t.fonts.display }]}>
            {recipe.title}
          </Text>
        </View>
      </Animated.View>

      {/* Floating controls */}
      <View style={[styles.controls, { top: insets.top + 6 }]} pointerEvents="box-none">
        <GlassButton icon="back" label="Back" onPress={goBack} />
        <View style={styles.controlsRight}>
          <GlassButton icon={fav ? 'heartFill' : 'heart'} label={fav ? 'Remove from Favorites' : 'Add to Favorites'} onPress={onFavorite} color={fav ? t.colors.accent : undefined} />
          <GlassButton icon="more" label="More: share or save to a cookbook" onPress={() => setMenuOpen(true)} />
        </View>
      </View>

      <MoreMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        top={insets.top + 56}
        rows={[
          { label: 'Share recipe', icon: 'share', onPress: onShare },
          { label: inCookbooks > 0 ? 'Saved to a cookbook' : 'Save to a cookbook', icon: inCookbooks > 0 ? 'bookmarkFill' : 'bookmark', onPress: () => router.push({ pathname: '/save-to-cookbook', params: { id: recipe.id } }) },
        ]}
      />

      {/* Sticky actions */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <BlurView tint={t.isDark ? 'dark' : 'light'} intensity={40} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.bar }]} />
        <View style={[StyleSheet.absoluteFill, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator }]} />
        <View style={styles.bottomRow}>
          <Button
            label="Cook now"
            icon="pot"
            onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, servings: String(servings) } })}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Per-serving nutrition: the calories, then one bar split by where those calories come from,
 * then each macro with its grams and share. With a protein goal, shows its share too.
 */
function Nutrition({ recipe, proteinGoal }: { recipe: Recipe; proteinGoal?: number }) {
  const t = useTheme();
  const { protein, carbs, fat } = recipe.nutrition;
  const kcalFrom = { protein: protein * 4, carbs: carbs * 4, fat: fat * 9 };
  const total = kcalFrom.protein + kcalFrom.carbs + kcalFrom.fat;
  const rows = [
    { key: 'protein', label: 'Protein', grams: protein, color: t.colors.protein },
    { key: 'carbs', label: 'Carbs', grams: carbs, color: t.colors.carbs },
    { key: 'fat', label: 'Fat', grams: fat, color: t.colors.fat },
  ] as const;
  return (
    <View style={[styles.card, styles.nutrition, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]} accessible accessibilityLabel={`${recipe.calories} calories, ${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat per serving`}>
      <View style={styles.kcal}>
        <Text style={[t.type.title1, { color: t.colors.label }]}>{recipe.calories}</Text>
        <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>kcal per serving, estimated</Text>
      </View>
      {total > 0 && (
        <>
          <View style={styles.split}>
            {rows.map((r) => (
              <Animated.View key={r.key} entering={FadeIn.duration(400)} style={{ flex: Math.max(kcalFrom[r.key], total * 0.03), backgroundColor: r.color, borderRadius: 6 }} />
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
        </>
      )}
      {proteinGoal ? (
        <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
          {Math.round((protein / proteinGoal) * 100)}% of your {proteinGoal} g daily protein goal
        </Text>
      ) : null}
    </View>
  );
}

/** Difficulty as one to three little chef hats. */
function ChefHats({ level }: { level: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: 18, alignItems: 'center' }} accessibilityElementsHidden>
      {[1, 2, 3].map((i) => (
        <Svg key={i} width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M6 15 C 2 14 2 8 6 8 C 6 4 11 2 13 5 C 16 2 22 5 19 9 C 22 11 20 15 18 15 Z M6 16 L 18 16 L 18 20 C 18 21 17 21.5 16 21.5 L 8 21.5 C 7 21.5 6 21 6 20 Z"
            fill={i <= level ? t.colors.tint : 'none'}
            stroke={i <= level ? t.colors.tint : t.colors.tertiaryLabel}
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

/** A round white button that reads clearly over any photo. */
function GlassButton({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.glass, { backgroundColor: t.colors.cell }]}>
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
  body: { paddingHorizontal: 16, paddingTop: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderCurve: 'continuous' },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  stats: { flexDirection: 'row', marginTop: 16, paddingVertical: 14, borderCurve: 'continuous' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  h2: { marginTop: 32, marginBottom: 12 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  units: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  card: { overflow: 'hidden', borderCurve: 'continuous' },
  nutrition: { gap: 16, padding: 16, overflow: 'visible' },
  kcal: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  split: { flexDirection: 'row', gap: 3, height: 16 },
  macros: { flexDirection: 'row' },
  macro: { flex: 1, gap: 2 },
  macroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, gap: 12 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  notes: { minHeight: 96, borderRadius: 20, padding: 16, textAlignVertical: 'top', borderCurve: 'continuous', outlineStyle: 'none' } as never,
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  // Left-aligned between Back and the three buttons on the right; long titles end in "…".
  topTitle: { position: 'absolute', left: 64, right: 116, justifyContent: 'center', alignItems: 'center' },
  topTitleSmall: { fontSize: 15, lineHeight: 18 },
  resetServings: { minHeight: 44, justifyContent: 'center', marginTop: -4 },
  controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  controlsRight: { flexDirection: 'row', gap: 8 },
  glass: { width: 44, height: 44, borderRadius: 22, shadowColor: '#3D2314', shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, overflow: 'hidden' },
  bottomRow: { flexDirection: 'row', gap: 12 },
  menu: { position: 'absolute', right: 16, width: 260, maxWidth: '90%', borderRadius: 20, overflow: 'hidden', borderCurve: 'continuous' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
});

