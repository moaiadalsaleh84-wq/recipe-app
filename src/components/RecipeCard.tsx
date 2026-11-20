import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useState } from 'react';
import type { Recipe, RecipeImage } from '../data/mock';
import { photoUri } from '../lib/photos';
import { useStore } from '../state/store';
import { haptics } from '../lib/haptics';
import { useTheme, pop } from '../theme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { PopButton } from './pop/PopButton';
import { PopCard } from './pop/PopCard';
import { Sticker } from './pop/Sticker';
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
  const bounce = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));
  // The burst when you save: a ring and six little hearts flying out.
  const burst = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ opacity: burst.get() > 0 && burst.get() < 1 ? 1 - burst.get() : 0, transform: [{ scale: 0.6 + burst.get() * 1.2 }] }));
  const onPress = () => {
    const now = toggleFavorite(recipe.id);
    if (now) haptics.success();
    else haptics.select();
    if (now && !reduceMotion) {
      bounce.set(withSequence(withTiming(0.6, { duration: 80 }), withSpring(1.15, { damping: 6, stiffness: 300 }), withSpring(1, t.motion.pop)));
      burst.set(0);
      burst.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    }
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
        <Animated.View pointerEvents="none" style={[styles.burstRing, { borderColor: pop.tomato }, ringStyle]} />
        {SPARKS.map((sp, i) => (
          <Spark key={i} dx={sp[0]} dy={sp[1]} burst={burst} />
        ))}
        <Animated.View style={[styles.favDot, popStyle]}>
          <Icon name={fav ? 'heartFill' : 'heart'} size={17} color={fav ? pop.tomato : pop.ink} weight="bold" />
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
/** Where the six little hearts fly to (worked out once, outside the animation). */
const SPARKS = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 26, Math.sin(a) * 26] as const;
});

function Spark({ dx, dy, burst }: { dx: number; dy: number; burst: ReturnType<typeof useSharedValue<number>> }) {
  const style = useAnimatedStyle(() => {
    const b = burst.get();
    return { opacity: b > 0 && b < 1 ? 1 - b : 0, transform: [{ translateX: dx * b }, { translateY: dy * b }, { scale: 1 - b * 0.4 }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, { backgroundColor: pop.tomato }, style]} />;
}

const useMeta = () => (r: Recipe) => `${r.minutes} min · ${r.calories} kcal`;

/** Grid and row card: a PopCard with the food photo on top (ink line under it), the name and time. */
export function RecipeCard({ recipe, width, color }: { recipe: Recipe; width: number; /** Card color (white by default). */ color?: string }) {
  const t = useTheme();
  return (
    // The heart sits on top of the card, beside its button (a button inside a button confuses
    // screen readers and the web).
    <View style={{ width }}>
      <PopCard
        onPress={() => openRecipe(recipe.id)}
        accessibilityLabel={`${recipe.title}, ${recipe.minutes} minutes, ${recipe.calories} calories`}
        accessibilityHint="Opens the recipe"
        color={color}
        radius={22}
        depth={4}
      >
        <View style={[styles.imageWrap, { backgroundColor: t.colors.imagePlaceholder }]}>
          <RecipePhoto recipe={recipe} />
        </View>
        {/* Room for two lines of title on every card, so a row of cards lines up. */}
        <View style={styles.cardBody}>
          <Text style={[t.type.title3, styles.cardTitle, { color: t.colors.label }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.meta}>
            <Icon name="clock" size={13} color={t.colors.secondaryLabel} weight="bold" />
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>
              {recipe.minutes} min · {recipe.difficulty}
            </Text>
          </View>
        </View>
      </PopCard>
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

/**
 * "Tonight's pick": a PopCard with the photo (ink line under it), a tilted tomato sticker, the
 * name, "25 min · you have 3 of 6", and a big "Cook it!" button that opens Get ready.
 */
export function TonightCard({ recipe, label, have, needed, onCook }: { recipe: Recipe; /** For screen readers: why it's featured. */ label: string; have: number; needed: number; onCook: () => void }) {
  const t = useTheme();
  return (
    <View>
      <PopCard clip={false} contentStyle={{ overflow: 'hidden' }}>
        {/* The photo and name open the recipe; the button below is its own tap (no button inside a button). */}
        <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.99} accessibilityLabel={`${label}: ${recipe.title}, ${recipe.minutes} minutes`} accessibilityHint="Opens the recipe">
          <View style={[styles.tonightPhoto, { backgroundColor: t.colors.imagePlaceholder }]}>
            <RecipePhoto recipe={recipe} iconSize={48} />
          </View>
          <View style={styles.tonightText}>
            <Text style={[t.type.title1, { color: t.colors.label, fontSize: 24, lineHeight: 29 }]} numberOfLines={2}>
              {recipe.title}
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="tonight-meta">
              {recipe.minutes} min · {needed > 0 ? `you have ${have} of ${needed}` : recipe.difficulty}
            </Text>
          </View>
        </PressableScale>
        <PopButton label="Cook it!" iconRight="arrowRight" onPress={onCook} accessibilityLabel={`Cook ${recipe.title}`} style={styles.tonightBtn} />
      </PopCard>
      {/* Slapped on where the photo meets the card. */}
      <Sticker label="Tonight's pick" style={styles.tonightSticker} />
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
        <View style={[styles.thumb, { backgroundColor: t.colors.imagePlaceholder, borderColor: t.pop.ink }]}>
          <RecipePhoto recipe={recipe} iconSize={24} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.type.title3, { color: t.colors.label, fontSize: 18, lineHeight: 22 }]}>{recipe.title}</Text>
          <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]}>{subtitle ?? meta(recipe)}</Text>
        </View>
        {!trailing && <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />}
      </PressableScale>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  // Photos (4:3) with a thick ink line underneath.
  imageWrap: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', borderBottomWidth: 2.5, borderBottomColor: pop.ink },
  cardBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 6 },
  cardTitle: { fontSize: 18, lineHeight: 22, minHeight: 44 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  favOnPhoto: { position: 'absolute', top: 2, right: 2 },
  favTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  burstRing: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
  spark: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  favDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: pop.white,
    borderWidth: 2,
    borderColor: pop.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonightPhoto: { height: 150, overflow: 'hidden', borderBottomWidth: 2.5, borderBottomColor: pop.ink },
  tonightText: { paddingHorizontal: 16, paddingTop: 22, gap: 4 },
  tonightBtn: { marginHorizontal: 16, marginTop: 12, marginBottom: 16 },
  tonightSticker: { position: 'absolute', top: 134, left: 14 },
  featuredFav: { position: 'absolute', top: 4, right: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingLeft: 12, paddingRight: 8, minHeight: 84 },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderCurve: 'continuous' },
});
