import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Recipe } from '../data/mock';
import { useStore } from '../state/store';
import { haptics } from '../lib/haptics';
import { fonts, useTheme, pop } from '../theme';
import { nb, duration } from '../lib/text';
import { Icon } from './Icon';
import { PhotoFrame, RecipePhoto } from './PhotoFrame';
import { PressableScale } from './PressableScale';
import { PopButton } from './pop/PopButton';
import { PopIconButton } from './pop/PopIconButton';
import { PopCard } from './pop/PopCard';
import { Sticker } from './pop/Sticker';
import { useToast } from './Toast';
import { Skeleton, TextButton } from './ui';

export const openRecipe = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });

export { RecipePhoto };

/** Imported from a website: a tiny link mark in the picture's corner. (Videos have none: no play button on cards.) */
function SourceMark({ recipe }: { recipe: Recipe }) {
  const t = useTheme();
  if (recipe.source !== 'web') return null;
  return (
    <View style={[styles.sourceMark, { backgroundColor: t.pop.white, borderColor: t.pop.ink }]} accessible accessibilityLabel="Imported from a website" testID="source-mark">
      <Icon name="link" size={11} color={t.pop.ink} weight="bold" />
    </View>
  );
}

/** Heart button used on cards and rows. Pops when you save, and shows a toast with Undo. */
export function FavoriteButton({ recipe, onPhoto }: { recipe: Recipe; onPhoto?: boolean }) {
  const t = useTheme();
  const { isFavorite, toggleFavorite } = useStore();
  const toast = useToast();
  const fav = isFavorite(recipe.id);
  const onPress = () => {
    const now = toggleFavorite(recipe.id);
    // A light tap either way; the heart fills with a soft colour fade (no scaling).
    haptics.tap();
    toast({
      message: now ? 'Added to Favorites' : 'Removed from Favorites',
      icon: now ? 'heartFill' : 'heart',
      tone: now ? 'success' : 'info',
      action: { label: 'Undo', onPress: () => toggleFavorite(recipe.id) },
    });
  };
  const label = fav ? `Remove ${recipe.title} from Favorites` : `Add ${recipe.title} to Favorites`;
  if (onPhoto) {
    // On photos: a small solid white circle (34pt) inside a full 44pt tap area.
    return (
      <PressableScale onPress={onPress} haptic={null} scaleTo={0.96} accessibilityLabel={label} style={styles.favTap}>
        <View style={styles.favDot}>
          <HeartIcon on={fav} size={17} offColor={pop.ink} />
        </View>
      </PressableScale>
    );
  }
  return (
    <PressableScale onPress={onPress} haptic={null} accessibilityLabel={label} style={styles.favTap}>
      <HeartIcon on={fav} size={20} offColor={t.colors.secondaryLabel} />
    </PressableScale>
  );
}

/** A heart that fills berry with a 200 ms fade (outline underneath, filled on top). No scaling. */
export function HeartIcon({ on, size, offColor }: { on: boolean; size: number; offColor: string }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    fill.set(reduceMotion ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) }));
  }, [on, reduceMotion, fill]);
  const filled = useAnimatedStyle(() => ({ opacity: fill.get() }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="heart" size={size} color={offColor} weight="bold" />
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, filled]}>
        <Icon name="heartFill" size={size} color={pop.berry} weight="bold" />
      </Animated.View>
    </View>
  );
}

const useMeta = () => (r: Recipe) => `${duration(r.minutes)} · ${nb(r.calories, 'kcal')}`;

/** The one meta line under a card's title: "75 min · Easy". */
export const cardMeta = (r: Pick<Recipe, 'minutes' | 'difficulty'>) => `${duration(r.minutes)}\u00A0· ${r.difficulty}`;

/**
 * Under a card's photo: "@creator" for imported and Discover recipes (1 line), the title (2 lines,
 * then "…"), then one meta line. Shared by recipe cards and Discover cards.
 */
export function CardText({ creator, title, meta, metaTestID }: { creator?: string; title: string; meta: string; metaTestID?: string }) {
  const t = useTheme();
  return (
    <View style={styles.cardBody}>
      <View style={{ gap: 2 }}>
        {creator ? (
          <Text style={[styles.cardCreator, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
            {creator}
          </Text>
        ) : null}
        <Text style={[styles.cardTitle, { color: t.colors.label }]} numberOfLines={3}>
          {title}
        </Text>
      </View>
      {/* Never cut a time short: with large text the meta may take a second line. */}
      <Text style={[styles.cardMetaText, { color: t.colors.secondaryLabel }]} numberOfLines={2} testID={metaTestID}>
        {meta}
      </Text>
    </View>
  );
}

/**
 * Grid and row card, photo first: a 4:5 photo across the whole card (the shared ink frame), then
 * the compact text. Cards in a row share the tallest card's height.
 */
export function RecipeCard({ recipe, width, color }: { recipe: Recipe; width: number; /** Card color (white by default). */ color?: string }) {
  return (
    // The heart sits on top of the card, beside its button (a button inside a button confuses
    // screen readers and the web).
    <View style={{ width }}>
      <PopCard
        onPress={() => openRecipe(recipe.id)}
        accessibilityLabel={`${recipe.title}, ${recipe.minutes} minutes, ${recipe.difficulty}`}
        accessibilityHint="Opens the recipe"
        // Ink behind the photo, so its soft edges never show a light hairline (see PhotoFrame).
        color={pop.ink}
        radius={24}
        depth={CARD_DEPTH}
        style={{ flexGrow: 1 }}
        contentStyle={{ flexGrow: 1 }}
      >
        <PhotoFrame recipe={recipe} radius={21.5} corners="top" edge="bottom" style={styles.imageWrap}>
          <SourceMark recipe={recipe} />
        </PhotoFrame>
        <View style={[styles.cardWhite, { backgroundColor: color ?? pop.white }]}>
          <CardText creator={recipe.creatorHandle && isImportedSource(recipe) ? recipe.creatorHandle : undefined} title={recipe.title} meta={cardMeta(recipe)} />
        </View>
      </PopCard>
      <View style={styles.favOnPhoto}>
        <FavoriteButton recipe={recipe} onPhoto />
      </View>
    </View>
  );
}

/** A lighter card shadow (3pt) for recipe and Discover cards. */
export const CARD_DEPTH = 3;
const isImportedSource = (r: Recipe) => r.source === 'tiktok' || r.source === 'youtube' || r.source === 'instagram' || r.source === 'web';

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
 * "Tonight's pick": a PopCard with the photo (ink line under it), a straight tomato sticker, the
 * name, "25 min · you have 3 of 6", and a big "Cook it!" button that opens Get ready.
 */
export function TonightCard({
  recipe,
  label,
  have,
  needed,
  onCook,
  onShuffle,
  note,
}: {
  recipe: Recipe;
  /** For screen readers: why it's featured. */
  label: string;
  have: number;
  needed: number;
  onCook: () => void;
  /** "Show me another": a shuffle button next to Cook it. */
  onShuffle?: () => void;
  /** A small line under the meta, e.g. why it was picked. */
  note?: string;
}) {
  const t = useTheme();
  return (
    <View>
      {/* Ink behind the photo, so its soft edges never show a light hairline (see PhotoFrame). */}
      <PopCard clip={false} color={pop.ink} contentStyle={{ overflow: 'hidden' }}>
        {/* The photo and name open the recipe; the button below is its own tap (no button inside a button). */}
        <PressableScale onPress={() => openRecipe(recipe.id)} scaleTo={0.99} accessibilityLabel={`${label}: ${recipe.title}, ${recipe.minutes} minutes`} accessibilityHint="Opens the recipe">
          <PhotoFrame recipe={recipe} iconSize={48} radius={21.5} corners="top" edge="bottom" style={styles.tonightPhoto}>
            <SourceMark recipe={recipe} />
          </PhotoFrame>
          <View style={[styles.tonightText, styles.tonightWhite]}>
            <Text style={[t.type.title1, { color: t.colors.label, fontSize: 20, lineHeight: 25 }]} numberOfLines={3}>
              {recipe.title}
            </Text>
            {/* Nothing at home yet: just how big the job is. From one item up: how close you are. */}
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]} testID="tonight-meta">
              {duration(recipe.minutes)} · {needed === 0 ? recipe.difficulty : have === 0 ? nb(needed, needed === 1 ? 'ingredient' : 'ingredients') : `you have ${have} of\u00A0${needed}`}
            </Text>
            {note ? (
              <Text style={[t.type.caption1, { color: t.colors.label }]} testID="tonight-note">
                {note}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <View style={styles.tonightBottom}>
        <View style={[styles.tonightBtn, { flexDirection: 'row', gap: 12 }]}>
          <PopButton label="Cook it!" iconRight="arrowRight" onPress={onCook} accessibilityLabel={`Cook ${recipe.title}`} style={{ flex: 1 }} />
          {onShuffle && <PopIconButton icon="shuffle" size={56} iconSize={22} onPress={onShuffle} accessibilityLabel="Show me another" testID="tonight-shuffle" />}
        </View>
        {/* "Cook it!" goes straight to Get ready; the full recipe is one small tap away. */}
        <TextButton label="See recipe" onPress={() => openRecipe(recipe.id)} accessibilityRole="link" accessibilityLabel={`See the recipe for ${recipe.title}`} style={styles.seeRecipe} />
        </View>
      </PopCard>
      {/* Slapped on where the photo meets the card. */}
      <Sticker label="Tonight's pick" rotate={0} style={styles.tonightSticker} />
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
  metaLines,
  label,
  thumb = 64,
}: {
  recipe: Recipe;
  onPress?: () => void;
  subtitle?: string;
  trailing?: React.ReactNode;
  accessibilityHint?: string;
  /** Meta on its own lines instead of `subtitle` (Nunito 700, 15, muted), e.g. ["Breakfast", "40 min · 410 kcal"]. */
  metaLines?: string[];
  /** A small label above the title ("Dinner"). */
  label?: string;
  /** Thumbnail size (64 by default). */
  thumb?: number;
}) {
  const t = useTheme();
  const meta = useMeta();
  return (
    <View style={styles.row}>
      <PressableScale onPress={onPress ?? (() => openRecipe(recipe.id))} scaleTo={0.98} accessibilityLabel={`${recipe.title}, ${metaLines ? metaLines.join(', ') : (subtitle ?? meta(recipe))}`} accessibilityHint={accessibilityHint} style={styles.rowMain}>
        <PhotoFrame recipe={recipe} iconSize={24} radius={16} square style={{ width: thumb, height: thumb }} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          {label ? <Text style={[styles.metaLine, { color: t.colors.secondaryLabel, fontSize: 13, lineHeight: 17 }]} numberOfLines={1}>{label}</Text> : null}
          <Text style={[t.type.title3, t.noWidows.balanced, { color: t.colors.label, fontSize: 18, lineHeight: 22 }]} numberOfLines={3} {...t.noWidows.props}>{recipe.title}</Text>
          {metaLines ? (
            metaLines.map((line) => (
              <Text key={line} style={[styles.metaLine, { color: t.colors.secondaryLabel }]}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} numberOfLines={1}>{subtitle ?? meta(recipe)}</Text>
          )}
        </View>
        {!trailing && <Icon name="chevronRight" size={14} color={t.colors.tertiaryLabel} weight="semibold" />}
      </PressableScale>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  // Photos (4:3) with a thick ink line underneath.
  // Flush with the card's top border (no gap): the photo's top corners follow the card's inner curve (24 − 2.5).
  sourceMark: { position: 'absolute', left: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // Photo first: 4:5 portrait, the whole card's width.
  imageWrap: { width: '100%', aspectRatio: 4 / 5 },
  cardWhite: { flexGrow: 1, borderBottomLeftRadius: 21.5, borderBottomRightRadius: 21.5 },
  // 14pt inside on every side; the meta sits at the bottom so cards in a row line up.
  cardBody: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 6, justifyContent: 'space-between' },
  // Fredoka 700, 17, up to 2 lines then "…".
  cardTitle: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 21 },
  // Nunito 700, 13, one line.
  cardCreator: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  // Nunito 700, 14: "75 min · Easy".
  cardMetaText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  favOnPhoto: { position: 'absolute', top: 2, right: 2 },
  favTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  tonightPhoto: { height: 150 },
  tonightText: { paddingHorizontal: 16, paddingTop: 22, gap: 4 },
  // The white part of the card below the photo (the card's face is ink behind the photo).
  tonightWhite: { backgroundColor: pop.white },
  tonightBottom: { backgroundColor: pop.white, borderBottomLeftRadius: 21.5, borderBottomRightRadius: 21.5 },
  tonightBtn: { marginHorizontal: 16, marginTop: 12 },
  seeRecipe: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginBottom: 4 },
  tonightSticker: { position: 'absolute', top: 134, left: 14 },
  featuredFav: { position: 'absolute', top: 4, right: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  metaLine: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingLeft: 12, paddingRight: 8, minHeight: 84 },
});
