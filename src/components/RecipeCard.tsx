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
          <Icon name={fav ? 'heartFill' : 'heart'} size={17} color={fav ? brand.chili : brand.ink} weight="bold" />
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

/** Grid card: a tall food photo in a white card, then the name in serif and time · difficulty. */
export function RecipeCard({ recipe, width }: { recipe: Recipe; width: number }) {
  const t = useTheme();
  return (
    // The heart sits on top of the card, beside its button (a button inside a button confuses
    // screen readers and the web).
    <View style={{ width }}>
      <PressableScale
        onPress={() => openRecipe(recipe.id)}
        accessibilityLabel={`${recipe.title}, ${recipe.minutes} minutes, ${recipe.calories} calories`}
        accessibilityHint="Opens the recipe"
        style={[styles.card, { backgroundColor: t.colors.cell, borderRadius: t.layout.cardRadius, ...t.chunky.card }]}
      >
        <View style={[styles.imageWrap, { borderRadius: t.layout.cardRadius - 6, backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} />
        </View>
        {/* Room for two lines of title on every card, so a row of cards lines up; longer titles wrap instead of being cut. */}
        <View style={styles.cardTitle}>
          <Text style={[t.type.title3, { color: t.colors.label, fontSize: 17, lineHeight: 21 }]}>{recipe.title}</Text>
        </View>
        <View style={styles.meta}>
          <Icon name="clock" size={13} color={t.colors.secondaryLabel} weight="semibold" />
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontFamily: t.fonts.semibold }]}>
            {recipe.minutes} min · {recipe.difficulty}
          </Text>
        </View>
      </PressableScale>
      <View style={styles.favOnPhoto}>
        <FavoriteButton recipe={recipe} onPhoto />
      </View>
    </View>
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

/** Large featured card: a big photo, a saffron tag, and the name in serif over a dark fade. */
export function FeaturedCard({ recipe, label }: { recipe: Recipe; /** For screen readers, and the tag: why it's featured. */ label: string }) {
  const t = useTheme();
  const tag = /tonight/i.test(label) ? 'Tonight' : 'Today’s pick';
  return (
    <View>
      <PressableScale
        onPress={() => openRecipe(recipe.id)}
        scaleTo={0.98}
        accessibilityLabel={`${label}: ${recipe.title}`}
        accessibilityHint="Opens the recipe"
        style={[styles.featured, { borderRadius: t.radius.xl, backgroundColor: t.colors.imagePlaceholder, ...t.shadow.card }]}
      >
        <View style={[StyleSheet.absoluteFill, { borderRadius: t.radius.xl, overflow: 'hidden' }]}>
          <RecipePhoto recipe={recipe} iconSize={56} />
          <LinearGradient colors={['rgba(10,18,13,0)', 'rgba(10,18,13,0.12)', 'rgba(10,18,13,0.86)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        </View>
        <View style={styles.featuredText}>
          <View style={[styles.tag, { backgroundColor: t.colors.reward }]}>
            <Text style={[t.type.caption1, { color: t.colors.onReward, fontFamily: t.fonts.extrabold }]}>{tag}</Text>
          </View>
          <Text style={[t.type.title1, { color: '#FFFFFF' }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text style={[t.type.subhead, { color: 'rgba(255,255,255,0.92)', fontFamily: t.fonts.semibold }]}>{`${recipe.minutes} min · ${recipe.difficulty} · ${recipe.calories} kcal`}</Text>
        </View>
      </PressableScale>
      <View style={styles.featuredFav}>
        <FavoriteButton recipe={recipe} onPhoto />
      </View>
    </View>
  );
}

/** List row with a rounded photo, used in Saved, Plan and the picker. */
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
      <PressableScale onPress={onPress ?? (() => openRecipe(recipe.id))} scaleTo={0.98} accessibilityLabel={`${recipe.title}, ${subtitle ?? meta(recipe)}`} accessibilityHint={accessibilityHint} style={styles.rowMain}>
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} iconSize={24} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.type.title3, { color: t.colors.label, fontSize: 17, lineHeight: 21 }]}>{recipe.title}</Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>{subtitle ?? meta(recipe)}</Text>
        </View>
        {!trailing && <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />}
      </PressableScale>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 6, paddingBottom: 12, borderCurve: 'continuous' },
  // Tall photos (4:5): food is the star.
  imageWrap: { width: '100%', aspectRatio: 4 / 5, overflow: 'hidden', borderCurve: 'continuous' },
  cardTitle: { minHeight: 44, marginTop: 10, marginBottom: 4, paddingHorizontal: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  favOnPhoto: { position: 'absolute', top: 8, right: 8 },
  favTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  favDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#142019',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  featured: { height: 300, justifyContent: 'flex-end', borderCurve: 'continuous' },
  featuredFav: { position: 'absolute', top: 8, right: 8 },
  featuredText: { padding: 18, gap: 6 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingLeft: 12, paddingRight: 8, minHeight: 84 },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', borderCurve: 'continuous' },
});
