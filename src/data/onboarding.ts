/**
 * The short onboarding (name, goal, diet, household, buddy) and what's built from the answers.
 * Every answer is used: the cats use your name, the goal picks your buddy and orders the
 * paywall's benefits, the diet filters suggestions, and recipes open sized for your household.
 */
import type { BuddyId } from '../components/cats/types';
import type { IconName } from '../components/Icon';
import type { DietTag } from './mock';

export type Goal = 'healthier' | 'muscle' | 'save' | 'home' | 'waste' | 'learn';

export type Profile = {
  /** What the cats call you. */
  name: string;
  /** One goal from onboarding (a list so older saved profiles with several still work). */
  goals: Goal[];
  diets: DietTag[];
  /** People you usually cook for; recipes open scaled to this. null = use the recipe's own servings. */
  household: number | null;
};

export const emptyProfile: Profile = { name: '', goals: [], diets: [], household: null };

export const goalOptions: { id: Goal; label: string; icon: IconName }[] = [
  { id: 'healthier', label: 'Eat healthier', icon: 'heart' },
  { id: 'muscle', label: 'Get in shape', icon: 'dumbbell' },
  { id: 'home', label: 'Cook more at home', icon: 'pot' },
  { id: 'save', label: 'Save money on food', icon: 'cart' },
  { id: 'waste', label: 'Use up what I have', icon: 'trash' },
  { id: 'learn', label: 'Learn to cook', icon: 'book' },
];

export const householdOptions: { size: number; label: string }[] = [
  { size: 1, label: 'Just me' },
  { size: 2, label: 'Two of us' },
  { size: 4, label: '3–4 people' },
  { size: 6, label: '5 or more' },
];

/** Name for the cats to use, or a friendly fallback. */
export const displayName = (p: Profile, fallback: string) => (p.name.trim() ? p.name.trim().split(/\s+/)[0] : fallback);

/** Tank for fitness and nutrition goals, Biscuit for everything cozy. */
export function recommendBuddy(p: Profile): BuddyId {
  return p.goals.includes('muscle') || p.goals.includes('healthier') ? 'tank' : 'biscuit';
}

export type Benefit = { icon: IconName; title: string; detail: string; for: Goal[] };

/** What Pro adds. Listed in the order that matters most to this person. Limits match FREE_LIMITS in store.tsx. */
export const proBenefits: Benefit[] = [
  { icon: 'link', title: 'Unlimited imports', detail: 'Save recipes from TikTok, YouTube, Instagram and any website (free: 3)', for: ['home', 'learn', 'save'] },
  { icon: 'cart', title: 'Unlimited pantry + smart suggestions', detail: 'See the one item that unlocks the most recipes (free: 10 items)', for: ['waste', 'save'] },
  { icon: 'chart', title: 'Nutrition goals with Tank', detail: 'Daily protein and calorie targets, tracked from the meals you cook', for: ['muscle', 'healthier'] },
  { icon: 'bookmark', title: 'Unlimited cookbooks and recipes', detail: 'Organize everything you love (free: 3 cookbooks, 5 handwritten recipes)', for: ['learn', 'home'] },
];

export function benefitsFor(p: Profile): Benefit[] {
  return [...proBenefits].sort((a, b) => Number(b.for.some((x) => p.goals.includes(x))) - Number(a.for.some((x) => p.goals.includes(x))));
}

/** A short phrase echoing their goal back, e.g. "get in shape". */
export function goalPhrase(p: Profile): string {
  const first = goalOptions.find((g) => g.id === p.goals[0]);
  return first ? first.label.charAt(0).toLowerCase() + first.label.slice(1) : 'cook with less stress';
}
