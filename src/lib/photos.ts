/**
 * Recipe photos that last.
 *
 * - Photos picked from the library arrive in a temporary cache iOS may clear, so they're
 *   copied into the app's Documents/photos folder.
 * - Imported covers are links (TikTok's expire within hours), so they're downloaded on save.
 * - iOS can move the app's folder between updates, so saved paths are re-pointed at the
 *   current Documents folder whenever they're shown (photoUri).
 * On web nothing is copied; the original URI is used.
 */
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import type { ImportedPicture } from '../data/mock';
import { MAX_PICTURE_BYTES, WEBP_QUALITIES, centerCrop, type Rect } from './crop';

const FOLDER = 'photos';
const native = Platform.OS !== 'web';

function photosDir() {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

const newName = (ext: string) => `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
const extOf = (uri: string) => {
  const m = uri.split('?')[0].match(/\.(jpe?g|png|heic|webp)$/i);
  return m ? m[1].toLowerCase() : 'jpg';
};

/** Copies a local photo into the app's own folder. Returns the new URI, or the original if copying fails. */
export async function keepPhoto(uri: string): Promise<string> {
  if (!native || !uri.startsWith('file://')) return uri;
  try {
    const dest = new File(photosDir(), newName(extOf(uri)));
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/** Downloads a photo from the web into the app's folder. Returns null if it can't be downloaded. */
export async function downloadPhoto(url: string): Promise<string | null> {
  if (!native || !/^https?:\/\//i.test(url)) return null;
  try {
    const file = await File.downloadFileAsync(url, new File(photosDir(), newName(extOf(url))));
    return file.uri;
  } catch {
    return null;
  }
}

/** The URI to show for a saved photo, re-pointed at the current Documents folder if needed. */
export function photoUri(uri: string): string {
  if (!native) return uri;
  const m = uri.match(new RegExp(`/${FOLDER}/(photo-[^/]+)$`));
  if (!m || !uri.startsWith('file://')) return uri;
  try {
    return new File(Paths.document, FOLDER, m[1]).uri;
  } catch {
    return uri;
  }
}

/** Opens the photo library and returns a lasting URI, null if cancelled. Throws if the library can't open. */
export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  return keepPhoto(res.assets[0].uri);
}

/**
 * Takes a photo with the camera and returns a lasting URI, null if cancelled. Falls back to the
 * photo library where there is no camera (simulator, web) or camera access was refused.
 */
export async function takePhoto(): Promise<string | null> {
  if (native) {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.granted) {
        const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (res.canceled || !res.assets[0]) return null;
        return keepPhoto(res.assets[0].uri);
      }
    } catch {
      // No camera here: use the library instead.
    }
  }
  return pickPhoto();
}

/* ---------------- imported pictures ---------------- */

/**
 * Saves an imported recipe's picture once (TikTok's links expire within hours): the original, a
 * 4:3 crop for cards and a 1:1 crop for thumbnails, both centered and WebP under 300 KB, plus a
 * blurhash shown while they load. Returns null when there is no picture to keep (no link,
 * offline, a broken image): the recipe is imported anyway, with the tinted placeholder.
 * Never throws. On web nothing is stored: the link itself is used (for testing only).
 */
export async function saveImportedPicture(url: string | null | undefined): Promise<ImportedPicture | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (!native) return { original: url, card: url, square: url };
  const original = await downloadPhoto(url);
  if (!original) return null;
  const picture: ImportedPicture = { original, card: original, square: original };
  try {
    const source = await ImageManipulator.manipulate(original).renderAsync();
    const { width, height } = source;
    picture.card = (await cropToWebp(original, centerCrop(width, height, 4 / 3), 1600)) ?? original;
    picture.square = (await cropToWebp(original, centerCrop(width, height, 1), 800)) ?? original;
  } catch {
    // Not an image we can read: keep the original as it is.
  }
  try {
    picture.blurhash = (await Image.generateBlurhashAsync(picture.card, [4, 3])) ?? undefined;
  } catch {
    // No blurhash: a shimmer shows while it loads instead.
  }
  return picture;
}

/** One centered crop, at most `maxWidth` wide, saved as WebP in the photos folder and under 300 KB. */
async function cropToWebp(uri: string, rect: Rect, maxWidth: number): Promise<string | null> {
  try {
    let ctx = ImageManipulator.manipulate(uri).crop(rect);
    if (rect.width > maxWidth) ctx = ctx.resize({ width: maxWidth });
    const image = await ctx.renderAsync();
    for (const compress of WEBP_QUALITIES) {
      const saved = await image.saveAsync({ format: SaveFormat.WEBP, compress });
      const file = new File(saved.uri);
      if (file.size <= MAX_PICTURE_BYTES || compress === WEBP_QUALITIES[WEBP_QUALITIES.length - 1]) {
        const dest = new File(photosDir(), newName('webp'));
        await file.move(dest);
        return dest.uri;
      }
      file.delete();
    }
  } catch {
    // fall through
  }
  return null;
}
