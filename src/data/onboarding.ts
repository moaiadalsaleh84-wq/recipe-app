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
export type Achieve = 'lose' | 'muscle' | 'energy' | 'nutrition' | 'takeaway' | 'basics' | 'variety' | 'budget' | 'family';
export type Why = 'health' | 'family' | 'confidence' | 'money' | 'fun' | 'planet';
export type Skill = 'beginner' | 'comfortable' | 'confident';

export type Profile = {
  /** What the cats call you. */
  name: string;
  goals: Goal[];
  /** The one outcome they care most about in the next 4 weeks. */
  achieve: Achieve | null;
  why: Why[];
  /** Home-cooked meals per week they're aiming for. */
  weeklyTarget: number;
  skill: Skill | null;
  /** Longest they usually want to spend on a weekday meal. null = any time; undefined = not answered yet. */
  maxMinutes?: number | null;
  frequency: Frequency | null;
  struggles: Struggle[];
  diets: DietTag[];
  /** People you usually cook for; recipes open scaled to this. null = use the recipe's own servings. */
  household: number | null;
};

export const emptyProfile: Profile = {
  name: '',
  goals: [],
  achieve: null,
  why: [],
  weeklyTarget: 3,
  skill: null,
  frequency: null,
  struggles: [],
  diets: [],
  household: null,
};

/** Outcomes, shown for the goals the user picked (most relevant first). */
export const achieveOptions: { id: Achieve; label: string; hint: string; icon: IconName; goals: Goal[] }[] = [
  { id: 'muscle', label: 'Build muscle', hint: 'More protein, stronger every week', icon: 'dumbbell', goals: ['muscle'] },
  { id: 'lose', label: 'Lose some weight', hint: 'Filling meals, sensible portions', icon: 'chart', goals: ['muscle', 'healthier'] },
  { id: 'energy', label: 'Have more energy', hint: 'Fewer slumps, better fuel', icon: 'flame', goals: ['healthier', 'muscle'] },
  { id: 'nutrition', label: 'Hit my nutrition targets', hint: 'Protein and calories that add up', icon: 'chart', goals: ['healthier', 'muscle'] },
  { id: 'takeaway', label: 'Stop ordering takeaway', hint: 'Cook at home most nights', icon: 'pot', goals: ['home', 'save'] },
  { id: 'basics', label: 'Master the basics', hint: 'Confident with everyday dishes', icon: 'book', goals: ['learn', 'home'] },
  { id: 'variety', label: 'Try new recipes', hint: 'Break out of the same five meals', icon: 'shuffle', goals: ['learn', 'home'] },
  { id: 'budget', label: 'Spend less on food', hint: 'Plan, shop once, use it all', icon: 'cart', goals: ['save', 'waste'] },
  { id: 'family', label: 'Feed my family well', hint: 'Meals everyone actually eats', icon: 'people', goals: ['home', 'healthier'] },
];

export const whyOptions: { id: Why; label: string; icon: IconName }[] = [
  { id: 'health', label: 'For my health', icon: 'heart' },
  { id: 'family', label: 'For my family', icon: 'people' },
  { id: 'confidence', label: 'To feel confident', icon: 'crown' },
  { id: 'money', label: 'To save money', icon: 'cart' },
  { id: 'fun', label: 'Because cooking is fun', icon: 'pot' },
  { id: 'planet', label: 'To waste less', icon: 'trash' },
];

export const skillOptions: { id: Skill; label: string; hint: string }[] = [
  { id: 'beginner', label: 'Just starting out', hint: 'Toast counts, right?' },
  { id: 'comfortable', label: 'Comfortable', hint: 'I can follow most recipes' },
  { id: 'confident', label: 'Confident', hint: 'Bring on the challenge' },
];

export const timeOptions: { minutes: number | null; label: string; hint: string }[] = [
  { minutes: 20, label: '20 minutes or less', hint: 'Quick and done' },
  { minutes: 30, label: 'About 30 minutes', hint: 'A relaxed weeknight' },
  { minutes: 45, label: 'Up to 45 minutes', hint: 'I enjoy the process' },
  { minutes: null, label: 'Time isn’t an issue', hint: 'Slow-cooked, why not' },
];

/** Achieve options relevant to the chosen goals; everything if none match. */
export function achieveFor(goals: Goal[]) {
  const relevant = achieveOptions.filter((a) => a.goals.some((g) => goals.includes(g)));
  return relevant.length ? relevant : achieveOptions;
}

/** A sensible starting target: a bit more than they cook now. */
export function suggestedTarget(f: Frequency | null) {
  return f === 'rarely' ? 2 : f === 'some' ? 3 : f === 'often' ? 5 : f === 'daily' ? 6 : 3;
}

/** How many home-cooked meals a week they cook today, for the 4-week path. */
export const currentPerWeek = (f: Frequency | null) => (f === 'rarely' ? 0.5 : f === 'some' ? 1.5 : f === 'often' ? 4 : f === 'daily' ? 6 : 1);

export const achieveLabel = (a: Achieve | null) => achieveOptions.find((o) => o.id === a)?.label ?? null;
export const whyLabel = (w: Why[]) => whyOptions.filter((o) => w.includes(o.id)).map((o) => o.label.toLowerCase());
/** Name for the cats to use, or a friendly fallback. */
export const displayName = (p: Profile, fallback: string) => (p.name.trim() ? p.name.trim().split(/\s+/)[0] : fallback);

export const goalOptions: { id: Goal; label: string; icon: IconName }[] = [
  { id: 'healthier', label: 'Eat healthier', icon: 'heart' },
  { id: 'muscle', label: 'Get in shape', icon: 'dumbbell' },
  { id: 'home', label: 'Cook more at home', icon: 'pot' },
  { id: 'save', label: 'Save money on food', icon: 'cart' },
  { id: 'waste', label: 'Waste less food', icon: 'trash' },
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
      if (p.skill === 'beginner' && r.difficulty === 'Easy') score += 2;
      if (p.skill === 'beginner' && r.difficulty === 'Hard') score -= 3;
      if (p.skill === 'confident' && r.difficulty !== 'Easy') score += 1;
      if (p.maxMinutes && r.minutes <= p.maxMinutes) score += 3;
      if (p.maxMinutes && r.minutes > p.maxMinutes + 15) score -= 3;
      if (p.achieve === 'muscle' && r.nutrition.protein >= 35) score += 2;
      if (p.achieve === 'lose' && r.calories <= 550) score += 2;
      if (p.achieve === 'family' && r.tags.includes('Kid friendly')) score += 2;
      if (p.achieve === 'budget' && r.tags.includes('One pan')) score += 1;
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

/** A short phrase echoing their main goal back, e.g. "build muscle". */
export function goalPhrase(p: Profile): string {
  const a = achieveLabel(p.achieve);
  if (a) return a.charAt(0).toLowerCase() + a.slice(1);
  const first = goalOptions.find((g) => g.id === p.goals[0]);
  return first ? first.label.charAt(0).toLowerCase() + first.label.slice(1) : 'cook with less stress';
}
