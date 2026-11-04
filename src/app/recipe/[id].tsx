import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { Pill } from '../../components/Pill';
import { getRecipe } from '../../data/mock';
import { formatQty, roundQty, useGroceries } from '../../state/GroceryContext';
import { colors, fonts, fontSizes, onRecipeColor, radius, recipeColors, shadow, spacing } from '../../theme';

type Tab = 'ingredients' | 'steps';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  const insets = useSafeAreaInsets();
  const { addIngredients } = useGroceries();
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState(recipe?.servings ?? 1);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!recipe) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top }]}>
        <Text style={styles.sectionTitle}>Recipe not found</Text>
        <Pill label="Go back" variant="ink" onPress={() => router.back()} />
      </View>
    );
  }

  const bg = recipeColors[recipe.color];
  const fg = onRecipeColor[recipe.color];
  const fgMuted = fg === colors.white ? colors.textOnColorMuted : colors.inkMuted;
  const scale = servings / recipe.servings;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.topRow}>
            <Pressable onPress={goBack} style={styles.circleBtn} accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
            <View style={styles.glassPill}>
              <Text style={[styles.glassText, { color: fg }]}>{recipe.category}</Text>
            </View>
          </View>

          <View style={styles.art}>
            <Confetti seed={recipe.title.length} />
          </View>
          <View style={styles.halo}>
            <View style={styles.haloInner}>
              <Text style={styles.emoji}>{recipe.emoji}</Text>
            </View>
          </View>

          <Text style={[styles.kicker, { color: fgMuted }]}>Today you’re making</Text>
          <Text style={[styles.title, { color: fg }]}>{recipe.title}</Text>
          <Text style={[styles.tagline, { color: fgMuted }]}>{recipe.tagline}</Text>

          <View style={styles.metaRow}>
            <Pill label={`${recipe.minutes} min`} icon="time-outline" variant="white" />
            <Pill label={`${recipe.calories} kcal`} icon="flame-outline" variant={recipe.color === 'yellow' ? 'white' : 'accent'} />
            <Pill label={recipe.difficulty} variant="ink" />
            {recipe.tags.map((t) => (
              <Pill key={t} label={t} variant={fg === colors.ink ? 'glassDark' : 'glass'} />
            ))}
          </View>
        </View>

        {/* Content sheet */}
        <View style={[styles.sheet, { paddingBottom: 120 + insets.bottom }]}>
          <View style={styles.segment}>
            {(['ingredients', 'steps'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.segmentBtn, tab === t && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
                  {t === 'ingredients' ? `Ingredients (${recipe.ingredients.length})` : `Steps (${recipe.steps.length})`}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'ingredients' ? (
            <>
              <View style={styles.servingsRow}>
                <View>
                  <Text style={styles.sectionTitle}>Servings</Text>
                  <Text style={styles.muted}>Quantities update as you change this</Text>
                </View>
                <View style={styles.stepper}>
                  <StepperBtn icon="remove" onPress={() => setServings((s) => Math.max(1, s - 1))} />
                  <Text style={styles.stepperValue}>{servings}</Text>
                  <StepperBtn icon="add" onPress={() => setServings((s) => Math.min(24, s + 1))} />
                </View>
              </View>

              {recipe.ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientRow}>
                  <View style={[styles.dot, { backgroundColor: bg }]} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientQty}>{formatQty(roundQty(ing.quantity * scale), ing.unit)}</Text>
                </View>
              ))}
            </>
          ) : (
            recipe.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={() => {
            addIngredients(recipe.id, recipe.ingredients, scale);
            setAdded(true);
          }}
          style={({ pressed }) => [styles.primaryBtn, added && styles.primaryBtnDone, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name={added ? 'checkmark-circle' : 'basket-outline'} size={22} color={added ? colors.ink : colors.white} />
          <Text style={[styles.primaryBtnText, added && { color: colors.ink }]}>
            {added ? 'Added to groceries' : 'Add to grocery list'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSaved((s) => !s)}
          style={styles.circleBtnLarge}
          accessibilityLabel={saved ? 'Remove from favourites' : 'Save to favourites'}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? colors.coral : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function StepperBtn({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepperBtn} accessibilityLabel={icon === 'add' ? 'More servings' : 'Fewer servings'}>
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  glassPill: {
    backgroundColor: colors.overlayLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  glassText: { fontFamily: fonts.bold, fontSize: fontSizes.sm },
  art: { position: 'absolute', left: 0, right: 0, top: 80, height: 300 },
  halo: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.overlayLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  haloInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 96 },
  kicker: { fontFamily: fonts.semibold, fontSize: fontSizes.md },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.05,
    letterSpacing: -1.2,
    marginTop: spacing.xxs,
  },
  tagline: { fontFamily: fonts.regular, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.45, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.lg },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    minHeight: 420,
    gap: spacing.xs,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    marginBottom: spacing.md,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.ink },
  segmentText: { fontFamily: fonts.bold, fontSize: fontSizes.sm, color: colors.inkMuted },
  segmentTextActive: { color: colors.white },
  servingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: fontSizes.lg, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: fontSizes.xs, color: colors.inkMuted, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xs,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontFamily: fonts.extrabold, fontSize: fontSizes.lg, color: colors.ink, minWidth: 24, textAlign: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  ingredientName: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSizes.md, color: colors.ink },
  ingredientQty: { fontFamily: fonts.bold, fontSize: fontSizes.md, color: colors.inkMuted },
  stepRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.extrabold, fontSize: fontSizes.md, color: colors.ink },
  stepText: { flex: 1, fontFamily: fonts.regular, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.5, color: colors.ink },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    flex: 1,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadow.button,
  },
  primaryBtnDone: { backgroundColor: colors.accent },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: fontSizes.lg, color: colors.white },
  circleBtnLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
