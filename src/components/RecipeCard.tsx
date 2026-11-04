import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recipe } from '../data/mock';
import { colors, fonts, fontSizes, onRecipeColor, radius, recipeColors, shadow, spacing } from '../theme';
import { Confetti } from './Confetti';

type Props = { recipe: Recipe; variant?: 'large' | 'compact' };

export function RecipeCard({ recipe, variant = 'large' }: Props) {
  const bg = recipeColors[recipe.color];
  const fg = onRecipeColor[recipe.color];
  const compact = variant === 'compact';

  return (
    <Link href={{ pathname: '/recipe/[id]', params: { id: recipe.id } }} asChild>
      <Pressable
        accessibilityLabel={`${recipe.title}, ${recipe.minutes} minutes`}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={[styles.art, compact && styles.artCompact, { backgroundColor: bg }]}>
          {!compact && <Confetti seed={recipe.id.length} />}
          <View style={[styles.halo, compact && styles.haloCompact]}>
            <Text style={[styles.emoji, compact && styles.emojiCompact]}>{recipe.emoji}</Text>
          </View>
          {!compact && (
            <View style={styles.artTop}>
              <View style={styles.glassPill}>
                <Text style={[styles.glassText, { color: fg }]}>{recipe.category}</Text>
              </View>
              <View style={styles.heart}>
                <Ionicons name="heart-outline" size={18} color={colors.ink} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.meta}>
            <Meta icon="time-outline" label={`${recipe.minutes} min`} />
            {!compact && <Meta icon="flame-outline" label={`${recipe.calories} kcal`} />}
            {!compact && <Meta icon="people-outline" label={`${recipe.servings}`} />}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function Meta({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.inkMuted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xs,
    ...shadow.card,
  },
  cardCompact: { width: 168 },
  art: {
    height: 180,
    borderRadius: radius.lg - 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artCompact: { height: 120 },
  halo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloCompact: { width: 84, height: 84, borderRadius: 42 },
  emoji: { fontSize: 64 },
  emojiCompact: { fontSize: 44 },
  artTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassPill: {
    backgroundColor: colors.overlayLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
  },
  glassText: { fontFamily: fonts.bold, fontSize: fontSizes.xs },
  heart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs },
  title: { fontFamily: fonts.extrabold, fontSize: fontSizes.xl, color: colors.ink, letterSpacing: -0.4 },
  titleCompact: { fontSize: fontSizes.md, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  metaText: { fontFamily: fonts.medium, fontSize: fontSizes.sm, color: colors.inkMuted },
});
