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
import { Platform } from 'react-native';

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
