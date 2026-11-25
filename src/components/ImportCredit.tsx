/**
 * The credit on recipes this user imported from a link: the sticker and camera button on the
 * picture, the "Recipe by" row under the title, and the one-time hint pointing at it.
 *
 * Imported credits and pictures only ever appear on the importer's own recipes: never on built-in
 * recipes, marketing screens, notifications or the paywall. The credit is always shown.
 */
import { ActionSheetIOS, Linking, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import type { Recipe } from '../data/mock';
import { tikTokHandle } from '../lib/importApi';
import { pickPhoto, takePhoto } from '../lib/photos';
import { duration } from '../motion';
import { fonts, pop, stroke, useTheme } from '../theme';
import { Icon } from './Icon';
import { PopIconButton, Sticker } from './pop';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useToast } from './Toast';

/** True for a recipe this user imported from TikTok, YouTube or a website. */
export const isImported = (r: Recipe) => r.source === 'tiktok' || r.source === 'youtube' || r.source === 'instagram' || r.source === 'web';

/** Opens a link: TikTok and YouTube links open their app when it's installed, otherwise the browser. */
export function useOpenLink() {
  const toast = useToast();
  return (url: string | undefined) => {
    if (!url) return;
    Linking.openURL(url).catch(() => toast({ message: 'Oops, that link wouldn’t open', tone: 'warning' }));
  };
}

/** Asks for the user's own photo: camera or library on iPhone; the library elsewhere. */
export function chooseOwnPhoto(): Promise<string | null> {
  if (Platform.OS !== 'ios') return pickPhoto();
  return new Promise((resolve, reject) => {
    ActionSheetIOS.showActionSheetWithOptions({ options: ['Take a photo', 'Choose from library', 'Cancel'], cancelButtonIndex: 2, title: 'Use my own photo' }, (i) => {
      if (i === 0) takePhoto().then(resolve, reject);
      else if (i === 1) pickPhoto().then(resolve, reject);
      else resolve(null);
    });
  });
}

/**
 * On the imported picture: where it's from (bottom-left, the app's sticker, not tilted; not on
 * the user's own photo) and a
 * camera button to use your own photo instead (bottom-right, 44pt).
 */
export function ImportedPhotoOverlay({ recipe, onOwnPhoto, ownPhoto }: { recipe: Recipe; onOwnPhoto: () => void; /** The user's own photo is showing: it isn't from the source, so no sticker. */ ownPhoto: boolean }) {
  return (
    <>
      {!!recipe.imageCreditText && !ownPhoto && (
        <View style={styles.stickerSpot} pointerEvents="none" testID="source-sticker">
          <Sticker label={recipe.imageCreditText} rotate={0} caps={false} color={pop.white} style={{ maxWidth: '100%' }} />
        </View>
      )}
      <View style={styles.cameraSpot}>
        <PopIconButton icon="camera" accessibilityLabel="Use my own photo" accessibilityHint="Opens the camera or your photo library" onPress={onOwnPhoto} testID="own-photo" />
      </View>
    </>
  );
}

/**
 * "Recipe by @handle" with the creator's first letter in a circle (never a scraped profile
 * picture) and a "Watch" chip. Tapping anywhere opens the original video or page.
 */
export function RecipeByRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const t = useTheme();
  // Only a real creator name ("@crispykitchen", a site's name): never "From TikTok", never empty.
  // A TikTok link carries the handle itself (tiktok.com/@name/video/…).
  const name = recipe.creatorHandle?.trim() || (recipe.source === 'tiktok' ? tikTokHandle(recipe.sourceUrl) : null) || null;
  const video = recipe.source === 'tiktok' || recipe.source === 'youtube' || recipe.source === 'instagram';
  const watch = (
    <View style={[styles.watch, { borderColor: t.pop.ink, backgroundColor: t.pop.sunshine }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={video ? 'play' : 'link'} size={12} color={t.pop.ink} weight="bold" />
      <Text style={styles.watchText}>{video ? 'Watch' : 'Open'}</Text>
    </View>
  );
  // No name found: no "Recipe by", just the Watch button.
  if (!name) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="link" accessibilityLabel={video ? 'Watch the original video' : 'Open the original page'} style={styles.byRow} scaleTo={0.98} testID="recipe-by">
        {watch}
      </PressableScale>
    );
  }
  const letter = (name.replace(/^@/, '').match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Recipe by ${name}. ${video ? 'Watch the original video' : 'Open the original page'}`}
      style={styles.byRow}
      scaleTo={0.98}
      testID="recipe-by"
    >
      <View style={[styles.avatar, { backgroundColor: t.pop.berry, borderColor: t.pop.ink }]}>
        <Text style={styles.avatarText} maxFontSizeMultiplier={1.2}>
          {letter}
        </Text>
      </View>
      {/* "Recipe by" sits small above the name, so the whole handle fits on its own line (a very
          long one shrinks a little rather than being cut off). */}
      <View style={styles.byText}>
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel }]} numberOfLines={1}>
          Recipe by
        </Text>
        <Text style={[t.type.subhead, { color: t.colors.label, fontFamily: t.fonts.black }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} testID="creator-handle">
          {name}
        </Text>
      </View>
      {watch}
    </PressableScale>
  );
}

/** The one-time hint above the "Recipe by" row. */
export function ImportHint({ onClose, video }: { onClose: () => void; video: boolean }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={FadeIn.duration(reduceMotion ? duration.fast : duration.base)} exiting={FadeOut.duration(duration.fast)} style={styles.hintWrap} testID="import-hint" accessibilityLiveRegion="polite">
      <View style={[styles.hint, { backgroundColor: t.pop.ink }]}>
        <Text style={[t.type.subhead, { color: pop.white, flex: 1, fontFamily: t.fonts.semibold }]}>{video ? 'Tap to watch the original video' : 'Tap to open the original recipe'}</Text>
        <PressableScale onPress={onClose} hitSlop={8} accessibilityLabel="Close hint" style={styles.hintClose}>
          <Icon name="close" size={13} color={pop.white} weight="bold" />
        </PressableScale>
      </View>
      {/* The pointer, toward the row below. */}
      <View style={[styles.hintTip, { borderTopColor: t.pop.ink }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Up to the camera button (44 wide + 12 + a 12 gap), so "From @name on TikTok" fits.
  stickerSpot: { position: 'absolute', left: 12, bottom: 12, right: 68, alignItems: 'flex-start' },
  cameraSpot: { position: 'absolute', right: 12, bottom: 12 },
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: stroke.thick, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.black, fontSize: 16, lineHeight: 20, color: pop.ink },
  byText: { flex: 1, minWidth: 0 },
  watch: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: stroke.thick, borderRadius: 999, paddingHorizontal: 12, minHeight: 32 },
  watchText: { fontFamily: fonts.black, fontSize: 14, lineHeight: 18, color: pop.ink },
  hintWrap: { marginTop: 12, alignSelf: 'flex-start', maxWidth: 300 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, minHeight: 44 },
  hintClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  hintTip: { marginLeft: 22, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
});
