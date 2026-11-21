/**
 * Where every recipe photo came from. Rules: only Unsplash or Pexels (free for commercial use),
 * never TikTok, YouTube, Instagram, Google Images or recipe blogs. One entry per photo you pick
 * from docs/photo-picks.md; the Photo credits screen (Settings) lists them all.
 */
export type PhotoCredit = {
  recipeId: string;
  /** The photo's page on Unsplash or Pexels. */
  url: string;
  photographer: string;
  site: 'Unsplash' | 'Pexels';
  license: 'Unsplash License' | 'Pexels License';
};

export const photoCredits: PhotoCredit[] = [
  // Added as photos are picked, e.g.
  // { recipeId: 'crispy-beef-tacos', url: 'https://unsplash.com/photos/…', photographer: '…', site: 'Unsplash', license: 'Unsplash License' },
];

/** The older bundled photos in assets/recipes, credited as their source states. */
export const bundledPhotoNote = 'Photos of the first 12 recipes are placeholders from the Foodish project (MIT license) and will be replaced.';
