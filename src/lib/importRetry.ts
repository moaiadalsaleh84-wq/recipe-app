/**
 * Getting an imported recipe's picture and creator again, after the import: from the ⋯ menu
 * ("Retry photo") and once, automatically, for imports saved before the phone fallback existed.
 */
import type { Recipe } from '../data/mock';
import { importPreview, isTikTokLink, phoneOembed } from './importApi';
import { saveImportedPicture } from './photos';

/** Imported, has a link, and no picture of its own from the source: "Retry photo" is offered. */
export const needsPhotoRetry = (r: Recipe) =>
  !!r.custom && (r.origin === 'import' || r.source === 'tiktok' || r.source === 'youtube' || r.source === 'web') && !!r.sourceUrl && !r.importedImage;

/** Imported from TikTok without a creator name. */
const needsCreator = (r: Recipe) => r.source === 'tiktok' && !r.creatorHandle?.trim();

/**
 * Asks again for the picture (downloaded once and stored with the recipe) and, for TikTok, the
 * creator. The server first; for TikTok, then TikTok's oEmbed straight from the phone. Returns the
 * changes to save, or null when nothing new was found. Never replaces the user's own photo.
 */
export async function retryImportDetails(recipe: Recipe): Promise<Partial<Recipe> | null> {
  if (!recipe.sourceUrl || (!needsPhotoRetry(recipe) && !needsCreator(recipe))) return null;
  let imageUrl: string | null = null;
  let handle: string | null = null;
  let profileUrl: string | null = null;
  const server = await importPreview(recipe.sourceUrl);
  imageUrl = server?.imageUrl ?? null;
  handle = server?.credit?.handle ?? null;
  profileUrl = server?.credit?.profileUrl ?? null;
  if (isTikTokLink(recipe.sourceUrl) && (!imageUrl || !handle)) {
    const phone = await phoneOembed(recipe.sourceUrl);
    imageUrl = imageUrl ?? phone?.imageUrl ?? null;
    if (!handle && phone?.credit?.handle) {
      handle = phone.credit.handle;
      profileUrl = phone.credit.profileUrl;
    }
  }

  const patch: Partial<Recipe> = {};
  if (!recipe.importedImage && imageUrl) {
    const picture = await saveImportedPicture(imageUrl);
    if (picture) {
      patch.importedImage = picture;
      // The tinted placeholder is replaced; a photo the user chose stays.
      if (!recipe.image) patch.image = { uri: picture.card };
    }
  }
  if (needsCreator(recipe) && handle?.trim()) {
    patch.creatorHandle = handle.trim();
    if (profileUrl && !recipe.creatorUrl) patch.creatorUrl = profileUrl;
    patch.imageCreditText = `From ${handle.trim()} on TikTok`;
  }
  return Object.keys(patch).length ? patch : null;
}
