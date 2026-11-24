/**
 * THE frame for every photo in the app (cards, Tonight's pick, the recipe page, thumbnails).
 *
 * Why: a photo with rounded corners inside an ink border is drawn with soft (anti-aliased) edges.
 * Whatever sits behind those edges shows through as a hairline. When that was white, every photo
 * had a thin light line at the top and in the corners. Here the frame's background is ink, so
 * any sub-pixel gap shows ink and disappears into the border.
 *
 *   outer: radius R, 2.5pt ink border, overflow hidden, ink background
 *   photo: no border, margin or padding, fills the frame, radius R − 2.5 on the corners that
 *          touch the border
 *
 * Inside a card that already draws the outer ink border (`edge="bottom"`): only the line under
 * the photo is drawn here, the top corners follow the card's inner curve, and the card's face
 * behind the photo must be ink too (see RecipeCard).
 */
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Recipe, RecipeImage } from '../data/mock';
import { recipePhotos } from '../data/recipePhotos';
import { photoUri } from '../lib/photos';
import { pop, useTheme } from '../theme';
import { Icon } from './Icon';
import { Skeleton } from './ui';

export const PHOTO_BORDER = 2.5;

export type PhotoCorners = 'all' | 'top';

/** Border radii for the chosen corners only. */
type Radii = { borderRadius?: number; borderTopLeftRadius?: number; borderTopRightRadius?: number; borderBottomLeftRadius?: number; borderBottomRightRadius?: number };
export function cornerRadii(r: number, corners: PhotoCorners): Radii {
  return corners === 'all'
    ? { borderRadius: r }
    : { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
}

const TINTS = [pop.sunshineTint, pop.skyTint, pop.berryTint, pop.leafTint, pop.lilacTint, pop.tomatoTint];
const placeholderTint = (id: string) => TINTS[[...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];

/** The recipe's photo, or a cozy placeholder for recipes added without one. */
export function RecipePhoto({
  recipe,
  iconSize = 36,
  radius = 0,
  square = false,
  corners = 'all',
}: {
  recipe: Recipe;
  iconSize?: number;
  /** Corner radius of the photo itself: the frame's radius minus its border (2.5). */
  radius?: number;
  /** A square spot (thumbnails, circles): uses the 1:1 crop when the recipe has one. */
  square?: boolean;
  /** Which corners `radius` rounds (photos at the top of a card: only the top ones). */
  corners?: PhotoCorners;
}) {
  const round = cornerRadii(radius, corners);
  const t = useTheme();
  // Remembers which image failed (an expired link), so a new photo gets a fresh try.
  const [failed, setFailed] = useState<RecipeImage>(null);
  const [loaded, setLoaded] = useState<RecipeImage>(null);
  const image = recipe.image;
  if (image && image !== failed) {
    // The app's own photos have a 1:1 crop and a blurhash; a photo you picked yourself doesn't.
    const set = recipePhotos[recipe.id];
    const own = set && image === set.card ? set : undefined;
    // An imported picture has its own card and thumbnail crops (and maybe a blurhash).
    const imp = recipe.importedImage && typeof image === 'object' && image.uri === recipe.importedImage.card ? recipe.importedImage : undefined;
    const source = own
      ? square
        ? own.square
        : own.card
      : typeof image === 'number'
        ? image
        : { uri: photoUri(imp && square ? imp.square : image.uri) };
    const blurhash = own ? (square ? own.squareBlurhash : own.blurhash) : imp?.blurhash;
    // A Discover photo with the owner's crop (4:3 spots): the chosen part fills the frame.
    const crop = !square && !own && recipe.photoCrop ? recipe.photoCrop : null;
    if (crop) {
      return (
        <View style={[StyleSheet.absoluteFill, round, { overflow: 'hidden' }]}>
          <Image
            source={source}
            style={{ position: 'absolute', width: `${100 / crop.w}%`, height: `${100 / crop.h}%`, left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%` }}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
            onError={() => setFailed(image)}
            accessibilityIgnoresInvertColors
          />
        </View>
      );
    }
    // While it loads: the blurred photo (or a shimmer for your own photos); then the photo fades in
    // (250ms). Cached on disk and in memory.
    return (
      <>
        {!blurhash && loaded !== image && <Skeleton style={[StyleSheet.absoluteFill, round]} />}
        <Image
          source={source}
          placeholder={blurhash ? { blurhash } : undefined}
          placeholderContentFit="cover"
          style={[StyleSheet.absoluteFill, round]}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(image)}
          onError={() => setFailed(image)}
          accessibilityIgnoresInvertColors
        />
      </>
    );
  }
  // No photo yet: a soft tinted card (one of the palette's tints, the same for the same recipe every time).
  return (
    <View style={[StyleSheet.absoluteFill, styles.noPhoto, { backgroundColor: placeholderTint(recipe.id), ...round }]} testID="photo-placeholder">
      <Icon name="pot" size={iconSize} color={t.pop.inkMuted} />
    </View>
  );
}

type Props = {
  /** The frame's outer corner radius. */
  radius: number;
  /** Which corners are rounded (cards: only the top ones). */
  corners?: PhotoCorners;
  /** "all": a 2.5pt ink border all round. "bottom": only the line under the photo (inside a card). */
  edge?: 'all' | 'bottom';
  /** A recipe's photo (or its tinted placeholder)… */
  recipe?: Recipe;
  /** …or any picture by link. */
  uri?: string | null;
  /** Thumbnails: the recipe's 1:1 crop. */
  square?: boolean;
  /** Size of the pot on the placeholder. */
  iconSize?: number;
  /** Behind a picture that has no recipe (while loading or missing). Never white. */
  placeholderColor?: string;
  onError?: () => void;
  accessibilityLabel?: string;
  /** Size and layout of the frame. */
  style?: StyleProp<ViewStyle>;
  /** On top of the photo: stickers, buttons, a placeholder icon. */
  children?: ReactNode;
  testID?: string;
};

export function PhotoFrame({ radius, corners = 'all', edge = 'all', recipe, uri, square, iconSize, placeholderColor, onError, accessibilityLabel, style, children, testID }: Props) {
  // The photo's own corners: inside the border on the corners that touch it.
  const inner = Math.max(0, edge === 'all' ? radius - PHOTO_BORDER : radius);
  const border: ViewStyle = edge === 'all' ? { borderWidth: PHOTO_BORDER } : { borderBottomWidth: PHOTO_BORDER };
  return (
    <View style={[styles.frame, cornerRadii(radius, corners), border, style]} testID={testID}>
      {recipe ? (
        <RecipePhoto recipe={recipe} square={square} iconSize={iconSize} radius={inner} corners={corners} />
      ) : (
        <View style={[StyleSheet.absoluteFill, cornerRadii(inner, corners), placeholderColor ? { backgroundColor: placeholderColor } : null]}>
          {uri ? (
            <Image
              source={{ uri: photoUri(uri) }}
              style={[StyleSheet.absoluteFill, cornerRadii(inner, corners)]}
              contentFit="cover"
              transition={250}
              onError={onError}
              accessibilityLabel={accessibilityLabel}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  frame: { overflow: 'hidden', borderColor: pop.ink, backgroundColor: pop.ink, borderCurve: 'continuous' },
});
