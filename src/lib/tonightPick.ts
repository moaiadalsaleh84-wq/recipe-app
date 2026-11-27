/**
 * Tonight's pick, the same everywhere (Home, the empty shopping list, the empty cooking history):
 * the dinner planned for tonight if there is one, else the day's pick from rankPicks (fits the diet
 * and goal, your ratings, 45 minutes or less unless nothing fits, best pantry match), rotating
 * among the top three.
 */
import { useMemo } from 'react';
import type { Recipe } from '../data/mock';
import type { Goal } from '../data/onboarding';
import { useStore } from '../state/store';
import { pantryMatch } from './moods';
import { pickForDay, rankPicks, type Pick, type Ratings } from './onboardingPicks';

/** Monday = 0. */
export const todayIndex = () => (new Date().getDay() + 6) % 7;
/** A number that goes up by one every local day. */
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

export type TonightPick = Pick & {
  /** True when it's the dinner planned for tonight. */
  fromPlan: boolean;
};

const NO_PANTRY: string[] = [];

export function useTonightPick() {
  const { plan, getRecipe, allRecipes, profile, cooked } = useStore();
  // The pantry feature was removed: picks no longer weigh what you have at home.
  const pantry = NO_PANTRY;
  // Your latest rating of each recipe (history is newest first).
  const ratings = useMemo(() => {
    const out: Ratings = {};
    for (const c of cooked) if (c.rating && !out[c.recipeId]) out[c.recipeId] = c.rating;
    return out;
  }, [cooked]);
  const planned = getRecipe(plan[todayIndex()]?.Dinner);
  const goal = profile.goals[0] as Goal | undefined;
  const picks = useMemo(() => rankPicks({ recipes: allRecipes, pantry, diets: profile.diets, goal, ratings }), [allRecipes, pantry, profile.diets, goal, ratings]);

  const tonight: TonightPick | undefined = useMemo(() => {
    if (planned) return { ...withMatch(planned, pantry), fromPlan: true };
    const p = pickForDay(picks, dayNumber());
    // No pick that fits: the first main dish (never a dessert, snack or breakfast), else nothing.
    const main = allRecipes.find((r) => r.category === 'Dinner' || r.category === 'Lunch');
    return p ? { ...p, fromPlan: false } : main ? { ...withMatch(main, pantry), fromPlan: false } : undefined;
  }, [planned, picks, pantry, allRecipes]);

  /** Tomorrow's pick (a different recipe than tonight when possible). */
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = pickForDay(picks, dayNumber(d));
    if (p && p.recipe.id !== tonight?.recipe.id) return p;
    return picks.find((x) => x.recipe.id !== tonight?.recipe.id);
  }, [picks, tonight]);

  return { tonight, tomorrow, picks };
}

function withMatch(recipe: Recipe, pantry: string[]): Pick {
  const m = pantryMatch(recipe, pantry);
  return { recipe, have: m.have, needed: m.needed };
}
