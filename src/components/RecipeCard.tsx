import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { Recipe, RecipeImage } from '../data/mock';
import { photoUri } from '../lib/photos';
import { useBuddy, useStore } from '../state/store';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { useToast } from './Toast';
import { IconButton, Skeleton } from './ui';

export const openRecipe = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

/** The recipe's photo, or a cozy placeholder for recipes added without one. */
export function RecipePhoto({ recipe, iconSize = 36 }: { recipe: Recipe; iconSize?: number }) {
  const t = useTheme();
  // Remembers which image failed (an expired link), so a new photo gets a fresh try.
  const [failed, setFailed] = useState<RecipeImage>(null);
  const image = recipe.image;
  if (image && image !== failed) {
    const source = typeof image === 'number' ? image : { uri: photoUri(image.uri) };
    return <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={() => setFailed(image)} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.noPhoto, { backgroundColor: t.colors.imagePlaceholder }]}>
      <Icon name="pot" size={iconSize} color={t.colors.tertiaryLabel} />
    </View>
  );
}

/** Heart button used on cards and rows. Shows a toast with Undo. */
export function FavoriteButton({ recipe, onPhoto }: { recipe: Recipe; onPhoto?: boolean }) {
  const t = useTheme();
  const { isFavorite, toggleFavorite } = useStore();
  const toast = useToast();
  const fav = isFavorite(recipe.id);
  return (
    <IconButton
      icon={fav ? 'heartFill' : 'heart'}
      accessibilityLabel={fav ? `Remove ${recipe.title} from Favorites` : `Add ${recipe.title} to Favorites`}
      color={fav ? t.colors.accent : onPhoto ? '#FFFFFF' : t.colors.secondaryLabel}
      background={onPhoto ? t.colors.scrim : undefined}
      size={onPhoto ? 34 : 44}
      iconSize={onPhoto ? 16 : 20}
      onPress={() => {
        const now = toggleFavorite(recipe.id);
        toast({
          message: now ? 'Added to Favorites' : 'Removed from Favorites',
          icon: now ? 'heartFill' : 'heart',
          tone: now ? 'success' : 'info',
          action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
        });
      }}
    />
  );
}

/** Tank cares about protein; Biscuit about calories-of-joy. */
const useMeta = () => {
  const buddy = useBuddy();
  return (r: Recipe) => (buddy === 'tank' ? `${r.minutes} min · ${r.nutrition.protein} g protein` : `${r.minutes} min · ${r.calories} kcal`);
};

/** Grid card: photo with title and meta below, App Store style. */
export function RecipeCard({ recipe, width }: { recipe: Recipe; width: number }) {
  const t = useTheme();
  const meta = useMeta();
  return (
    <PressableScale
      onPress={() => openRecipe(recipe.id)}
      accessibilityLabel={`${recipe.title}, ${recipe.minutes} minutes, ${recipe.calories} calories`}
      accessibilityHint="Opens the recipe"
      style={{ width }}
    >
      <View style={[styles.imageWrap, { borderRadius: t.radius.lg, backgroundColor: t.colors.imagePlaceholder, borderColor: t.colors.border }]}>
        <RecipePhoto recipe={recipe} />
        <View style={styles.favOnPhoto}>
          <FavoriteButton recipe={recipe} onPhoto />
        </View>
      </View>
      <Text style={[t.type.headline, { color: t.colors.label, marginTop: 8 }]} numberOfLines={2}>
        {recipe.title}
      </Text>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 2 }]}>{meta(recipe)}</Text>
    </PressableScale>
  );
}

export function RecipeCardSkeleton({ width }: { width: number }) {
  const t = useTheme();
  return (
    <View style={{ width }} accessibilityLabel="Loading recipe">
      <Skeleton style={[styles.imageWrap, { borderRadius: t.radius.lg }]} />
      <Skeleton style={{ height: 16, marginTop: 10, width: '85%' }} />
      <Skeleton style={{ height: 12, marginTop: 8, width: '50%' }} />
    </View>
  );
}

/** Large featured card with the title over the photo. */
export function FeaturedCard({ recipe, eyebrow }: { recipe: Recipe; eyebrow: string }) {
  const t = useTheme();
  const meta = useMeta();
  return (
    <PressableScale
      onPress={() => openRecipe(recipe.id)}
      scaleTo={0.98}
      accessibilityLabel={`${eyebrow}: ${recipe.title}`}
      accessibilityHint="Opens the recipe"
      style={[styles.featured, { borderRadius: t.radius.xl, backgroundColor: t.colors.imagePlaceholder, ...t.shadow.card }]}
    >
      <RecipePhoto recipe={recipe} iconSize={56} />
      <View style={[StyleSheet.absoluteFill, styles.featuredShade]} />
      <View style={styles.featuredFav}>
        <FavoriteButton recipe={recipe} onPhoto />
      </View>
      <View style={styles.featuredText}>
        <Text style={[t.type.footnote, styles.eyebrow]}>{eyebrow.toUpperCase()}</Text>
        <Text style={[t.type.title1, { color: '#FFFFFF' }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={[t.type.subhead, { color: 'rgba(255,255,255,0.88)', marginTop: 2 }]}>{meta(recipe)}</Text>
      </View>
    </PressableScale>
  );
}

/** List row with thumbnail, used in Saved, Plan and the picker. */
export function RecipeRow({
  recipe,
  onPress,
  subtitle,
  trailing,
  accessibilityHint = 'Opens the recipe',
}: {
  recipe: Recipe;
  onPress?: () => void;
  subtitle?: string;
  trailing?: React.ReactNode;
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const meta = useMeta();
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={onPress ?? (() => openRecipe(recipe.id))}
        scaleTo={0.98}
        accessibilityLabel={`${recipe.title}, ${subtitle ?? meta(recipe)}`}
        accessibilityHint={accessibilityHint}
        style={styles.rowMain}
      >
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} iconSize={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.headline, { color: t.colors.label }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
            {subtitle ?? meta(recipe)}
          </Text>
        </View>
        {!trailing && <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />}
      </PressableScale>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderCurve: 'continuous', borderWidth: 2 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  favOnPhoto: { position: 'absolute', top: 6, right: 6 },
  featured: { height: 300, overflow: 'hidden', borderCurve: 'continuous', justifyContent: 'flex-end' },
  featuredShade: { backgroundColor: 'rgba(0,0,0,0.28)' },
  featuredFav: { position: 'absolute', top: 12, right: 12 },
  featuredText: { padding: 20 },
  eyebrow: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 8, minHeight: 72 },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', borderCurve: 'continuous' },
});
