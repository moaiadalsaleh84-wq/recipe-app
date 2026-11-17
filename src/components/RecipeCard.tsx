import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useState } from 'react';
import type { Recipe, RecipeImage } from '../data/mock';
import { photoUri } from '../lib/photos';
import { useStore } from '../state/store';
import { haptics } from '../lib/haptics';
import { brand, useTheme } from '../theme';
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

/** Heart button used on cards and rows. Pops when you save, and shows a toast with Undo. */
export function FavoriteButton({ recipe, onPhoto }: { recipe: Recipe; onPhoto?: boolean }) {
  const t = useTheme();
  const { isFavorite, toggleFavorite } = useStore();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const fav = isFavorite(recipe.id);
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const onPress = () => {
    const now = toggleFavorite(recipe.id);
    if (now) haptics.success();
    else haptics.select();
    if (now && !reduceMotion) pop.set(withSequence(withTiming(0.7, { duration: 80 }), withSpring(1, t.motion.pop)));
    toast({
      message: now ? 'Added to Favorites' : 'Removed from Favorites',
      icon: now ? 'heartFill' : 'heart',
      tone: now ? 'success' : 'info',
      action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
    });
  };
  const label = fav ? `Remove ${recipe.title} from Favorites` : `Add ${recipe.title} to Favorites`;
  if (onPhoto) {
    // On photos: a small solid white circle (32pt) inside a full 44pt tap area.
    return (
      <PressableScale onPress={onPress} haptic={null} scaleTo={0.9} accessibilityLabel={label} style={styles.favTap}>
        <Animated.View style={[styles.favDot, popStyle]}>
          <Icon name={fav ? 'heartFill' : 'heart'} size={16} color={fav ? t.colors.accent : brand.cocoa} weight="bold" />
        </Animated.View>
      </PressableScale>
    );
  }
  return (
    <Animated.View style={popStyle}>
      <IconButton icon={fav ? 'heartFill' : 'heart'} accessibilityLabel={label} color={fav ? t.colors.accent : t.colors.secondaryLabel} iconSize={20} haptic={null} onPress={onPress} />
    </Animated.View>
  );
}

/** The small print under a recipe's title. */
const useMeta = () => (r: Recipe) => `${r.minutes} min · ${r.calories} kcal`;

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
      <View style={[styles.imageWrap, { borderRadius: t.layout.cardRadius, backgroundColor: t.colors.imagePlaceholder }]}>
        <RecipePhoto recipe={recipe} />
        <View style={styles.favOnPhoto}>
          <FavoriteButton recipe={recipe} onPhoto />
        </View>
      </View>
      {/* Room for two lines of title on every card, so a row of cards lines up; longer titles wrap instead of being cut. */}
      <View style={styles.cardTitle}>
        <Text style={[t.type.headline, { color: t.colors.label, fontSize: 17, lineHeight: 22 }]}>
          {recipe.title}
        </Text>
      </View>
      <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{meta(recipe)}</Text>
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
export function FeaturedCard({ recipe, label }: { recipe: Recipe; /** For screen readers: why it's featured. */ label: string }) {
  const t = useTheme();
  const meta = useMeta();
  return (
    <PressableScale
      onPress={() => openRecipe(recipe.id)}
      scaleTo={0.98}
      accessibilityLabel={`${label}: ${recipe.title}`}
      accessibilityHint="Opens the recipe"
      style={[styles.featured, { borderRadius: t.layout.cardRadius, backgroundColor: t.colors.imagePlaceholder }]}
    >
      <RecipePhoto recipe={recipe} iconSize={56} />
      <LinearGradient colors={['rgba(30,14,6,0)', 'rgba(30,14,6,0.78)']} style={styles.featuredShade} pointerEvents="none" />
      <View style={styles.featuredFav}>
        <FavoriteButton recipe={recipe} onPhoto />
      </View>
      <View style={styles.featuredText}>
        <Text style={[t.type.title2, { color: '#FFFFFF' }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={[t.type.subhead, { color: 'rgba(255,255,255,0.92)', marginTop: 2 }]}>{meta(recipe)}</Text>
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
          <Text style={[t.type.headline, { color: t.colors.label }]}>
            {recipe.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 2 }]}>
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
  imageWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderCurve: 'continuous' },
  cardTitle: { minHeight: 44, marginTop: 8, marginBottom: 2 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  favOnPhoto: { position: 'absolute', top: 2, right: 2 },
  favTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  favDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#3D2314', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  featured: { height: 216, overflow: 'hidden', borderCurve: 'continuous', justifyContent: 'flex-end' },
  featuredShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 136 },
  featuredFav: { position: 'absolute', top: 2, right: 2 },
  featuredText: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 8, minHeight: 72 },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderCurve: 'continuous' },
});
