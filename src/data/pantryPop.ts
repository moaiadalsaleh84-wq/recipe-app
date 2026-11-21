import file from '../../data/pantry-pop-recipes.json';
import { aisleFor } from '../lib/parseIngredient';
import { fromPantryPop, type PantryPopFile } from '../lib/pantryPopImport';

/** The 20 checked recipes from data/pantry-pop-recipes.json, in the app's recipe model. */
export const pantryPopRecipes = fromPantryPop(file as PantryPopFile, aisleFor);
