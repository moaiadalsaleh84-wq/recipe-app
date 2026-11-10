/**
 * Onboarding questions and the personalization built from the answers.
 *
 * Every answer is used for something real (buddy recommendation, plan picks,
 * default servings, paywall benefit order), so the questions never feel like a survey for its own sake.
 */
import type { BuddyId } from '../components/cats/types';
import type { IconName } from '../components/Icon';
import { matchesFilter, type DietTag, type Recipe } from './mock';

export type Goal = 'healthier' | 'muscle' | 'save' | 'home' | 'waste' | 'learn';
export type Frequency = 'rarely' | 'some' | 'often' | 'daily';
export type Struggle = 'time' | 'ideas' | 'shopping' | 'scattered' | 'tracking';

export type Profile = {
  goals: Goal[];
  frequency: Frequency | null;
  struggles: Struggle[];
  diets: DietTag[];
  /** People you usually cook for; recipes open scaled to this. null = use the recipe's own servings. */
  household: number | null;
};

export const emptyProfile: Profile = { goals: [], frequency: null, struggles: [], diets: [], household: null };

export const goalOptions: { id: Goal; label: string; icon: IconName }[] = [
  { id: 'healthier', label: 'Eat healthier', icon: 'heart' },
  { id: 'muscle', label: 'Get in shape', icon: 'dumbbell' },
  { id: 'home', label: 'Cook more at home', icon: 'pot' },
  { id: 'save', label: 'Save money on food', icon: 'cart' },
  { id: 'waste', label: 'Waste less food', icon: 'sparkles' },
  { id: 'learn', label: 'Learn to cook', icon: 'book' },
];

export const frequencyOptions: { id: Frequency; label: string; hint: string }[] = [
  { id: 'rarely', label: 'Rarely', hint: 'Mostly takeaway or ready meals' },
  { id: 'some', label: '1–2 times a week', hint: 'When I find the time' },
  { id: 'often', label: '3–5 times a week', hint: 'Most weeknights' },
  { id: 'daily', label: 'Almost every day', hint: 'The kitchen is my happy place' },
];

export const struggleOptions: { id: Struggle; label: string; icon: IconName }[] = [
  { id: 'time', label: 'Not enough time', icon: 'clock' },
  { id: 'ideas', label: 'Deciding what to cook', icon: 'shuffle' },
  { id: 'shopping', label: 'Messy grocery runs', icon: 'cart' },
  { id: 'scattered', label: 'Recipes saved everywhere', icon: 'bookmark' },
  { id: 'tracking', label: 'Staying on track with nutrition', icon: 'chart' },
];

export const householdOptions: { size: number; label: string }[] = [
  { size: 1, label: 'Just me' },
  { size: 2, label: 'Two of us' },
  { size: 4, label: '3–4 people' },
  { size: 6, label: '5 or more' },
];

/** Tank for fitness and nutrition goals, Biscuit for everything cozy. */
export function recommendBuddy(p: Profile): BuddyId {
  const tankScore = (p.goals.includes('muscle') ? 2 : 0) + (p.goals.includes('healthier') ? 1 : 0) + (p.struggles.includes('tracking') ? 1 : 0);
  const biscuitScore = (p.goals.includes('learn') ? 2 : 0) + (p.goals.includes('home') ? 1 : 0) + (p.frequency === 'rarely' ? 1 : 0);
  return tankScore > biscuitScore ? 'tank' : 'biscuit';
}

/** Three recipes that fit the answers, best match first. Used for the plan reveal. */
export function pickRecipes(p: Profile, all: Recipe[]): Recipe[] {
  const scored = all
    .filter((r) => r.category !== 'Dessert' && p.diets.every((d) => matchesFilter(r, d)))
    .map((r) => {
      let score = 0;
      if (p.goals.includes('muscle') && r.nutrition.protein >= 30) score += 3;
      if (p.goals.includes('healthier') && r.calories < 600) score += 2;
      if (p.struggles.includes('time') && r.minutes <= 30) score += 3;
      if ((p.goals.includes('learn') || p.frequency === 'rarely') && r.difficulty === 'Easy') score += 2;
      if (p.goals.includes('save') && r.tags.includes('One pan')) score += 1;
      if (r.category === 'Dinner') score += 1;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, 3).map((s) => s.r);
  // Strict diets can leave few matches; never show an empty plan.
  return picks.length ? picks : all.filter((r) => r.category !== 'Dessert').slice(0, 3);
}

export type Benefit = { icon: IconName; title: string; detail: string; for: (Goal | Struggle)[] };

/** What Pro adds. Listed in the order that matters most to this person. */
export const proBenefits: Benefit[] = [
  { icon: 'chart', title: 'Nutrition goals with Tank', detail: 'Daily protein and calorie targets, tracked from the meals you cook', for: ['muscle', 'healthier', 'tracking'] },
  { icon: 'book', title: 'Unlimited recipes', detail: 'Save every recipe you love, from anywhere (free: 5)', for: ['scattered', 'learn', 'home', 'ideas'] },
  { icon: 'bookmark', title: 'Unlimited cookbooks', detail: 'Organize meal prep, date nights, family favorites (free: 3)', for: ['scattered', 'save', 'waste', 'shopping', 'time'] },
  { icon: 'heartFill', title: 'Support a small, ad-free app', detail: 'No ads, ever. New recipes and buddy tricks keep coming', for: [] },
];

export function benefitsFor(p: Profile): Benefit[] {
  const mine = new Set<string>([...p.goals, ...p.struggles]);
  return [...proBenefits].sort((a, b) => Number(b.for.some((x) => mine.has(x))) - Number(a.for.some((x) => mine.has(x))));
}

/** A short phrase echoing their main goal back, e.g. "eat healthier". */
export function goalPhrase(p: Profile): string {
  const first = goalOptions.find((g) => g.id === p.goals[0]);
  return first ? first.label.charAt(0).toLowerCase() + first.label.slice(1) : 'cook with less stress';
}
