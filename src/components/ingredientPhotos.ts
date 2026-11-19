import type { FoodKind } from '../lib/foodKind';

/**
 * Real ingredient photos, one per kind of ingredient (lib/foodKind.ts). Add a line here for each
 * photo in assets/ingredients, for example:
 *
 *   tomato: require('../../assets/ingredients/tomato.jpg'),
 *
 * Every ingredient of that kind then shows the photo everywhere. See assets/ingredients/README.md
 * for the list of kinds and how the photos should look so they match each other.
 */
export const INGREDIENT_PHOTOS: Partial<Record<FoodKind, number>> = {};
