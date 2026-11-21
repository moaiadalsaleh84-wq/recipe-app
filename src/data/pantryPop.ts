import file from '../../data/pantry-pop-recipes.json';
import { aisleFor } from '../lib/parseIngredient';
import { fromPantryPop, type PantryPopFile } from '../lib/pantryPopImport';
import { recipePhotos } from './recipePhotos';

/** The 20 checked recipes from data/pantry-pop-recipes.json, in the app's recipe model, with their photos. */
export const pantryPopRecipes = fromPantryPop(file as PantryPopFile, aisleFor).map((r) => ({ ...r, image: recipePhotos[r.id]?.card ?? null }));
