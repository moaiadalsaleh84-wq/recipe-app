import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon, type IconName } from '../../components/Icon';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, IconButton, Separator, Stepper } from '../../components/ui';
import { getRecipe, type DietTag } from '../../data/mock';
import { formatQty, roundQty, useStore } from '../../state/store';
import { useTheme } from '../../theme';

export default function RecipeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  const { isFavorite, toggleFavorite, addIngredients, showOnlyTag } = useStore();

  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [justAdded, setJustAdded] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

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
    return {
      transform: [
        { translateY: y < 0 ? y / 2 : y * 0.35 },
        { scale: y < 0 ? 1 + -y / heroHeight : 1 },
      ],
    };
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [barThreshold - 40, barThreshold], [0, 1], Extrapolation.CLAMP),
  }));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.colors.background }}>
        <EmptyState icon="fork" title="Recipe Not Found" message="It may have been removed." action={{ label: 'Back to Recipes', onPress: goBack }} />
      </View>
    );
  }

  const fav = isFavorite(recipe.id);
  const scale = servings / recipe.servings;

  const onFavorite = () => {
    const now = toggleFavorite(recipe.id);
    toast({
      message: now ? 'Saved to your recipes' : 'Removed from Saved',
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

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'clock', value: `${recipe.minutes} min`, label: 'Time' },
    { icon: 'flame', value: `${Math.round(recipe.calories)}`, label: 'kcal / serving' },
    { icon: 'chart', value: recipe.difficulty, label: 'Difficulty' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <StatusBar style={barVisible ? 'auto' : 'light'} animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* Hero */}
        <Animated.View style={[{ height: heroHeight, backgroundColor: t.colors.imagePlaceholder }, heroStyle]}>
          <Image source={recipe.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityLabel={`Photo of ${recipe.title}`} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} style={[styles.heroShade, { height: insets.top + 90 }]} pointerEvents="none" />
        </Animated.View>

        <View style={[styles.body, { backgroundColor: t.colors.background, borderRadius: t.radius.xl, marginTop: -t.radius.xl }]}>
          <Text style={[t.type.footnote, { color: t.colors.tint, fontWeight: '600', letterSpacing: 0.4 }]}>{recipe.category.toUpperCase()}</Text>
          <Text style={[t.type.largeTitle, { color: t.colors.label, marginTop: 4 }]} accessibilityRole="header">
            {recipe.title}
          </Text>
          <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 8 }]}>{recipe.description}</Text>

          <View style={[styles.stats, { backgroundColor: t.colors.fill, borderRadius: t.radius.lg }]}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.colors.separator }]} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
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
                  style={[styles.tag, { backgroundColor: t.colors.tintSoft }]}
                >
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '600' }]}>{tag}</Text>
                  <Icon name="chevronRight" size={11} color={t.colors.tint} weight="bold" />
                </PressableScale>
              ))}
            </View>
          )}

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
          <View style={[styles.card, { backgroundColor: t.colors.fill, borderRadius: t.radius.lg }]}>
            {recipe.ingredients.map((ing, i) => (
              <View key={ing.id}>
                {i > 0 && <Separator inset={16} />}
                <View style={styles.ingredient}>
                  <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{ing.name}</Text>
                  <Text style={[t.type.body, { color: t.colors.secondaryLabel, fontVariant: ['tabular-nums'] }]} testID={`qty-${ing.id}`}>
                    {formatQty(roundQty(ing.quantity * scale), ing.unit)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Method */}
          <Text style={[t.type.title2, { color: t.colors.label, marginTop: 32, marginBottom: 12 }]} accessibilityRole="header">
            Method
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${step}`}>
              <View style={[styles.stepNum, { backgroundColor: t.colors.tintSoft }]}>
                <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700' }]}>{i + 1}</Text>
              </View>
              <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>{step}</Text>
            </View>
          ))}
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
        <GlassButton icon={fav ? 'heartFill' : 'heart'} label={fav ? 'Remove from Saved' : 'Save recipe'} onPress={onFavorite} color={fav ? t.colors.accent : undefined} />
      </View>

      {/* Sticky action */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <BlurView tint="systemChromeMaterial" intensity={90} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator }]} />
        <Button
          label={justAdded ? 'Added to Grocery List' : 'Add to Grocery List'}
          icon={justAdded ? 'check' : 'cartAdd'}
          variant={justAdded ? 'tinted' : 'filled'}
          onPress={onAdd}
          accessibilityLabel={`Add ingredients for ${servings} servings to the grocery list`}
        />
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

const styles = StyleSheet.create({
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: { paddingHorizontal: 20, paddingTop: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderCurve: 'continuous' },
  stats: { flexDirection: 'row', marginTop: 20, paddingVertical: 14, borderCurve: 'continuous' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 14, borderRadius: 999 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 12 },
  card: { overflow: 'hidden', borderCurve: 'continuous' },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48, gap: 12 },
  step: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  topTitle: { position: 'absolute', left: 72, right: 72, textAlign: 'center' },
  controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  glass: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, overflow: 'hidden' },
});
