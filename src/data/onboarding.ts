/**
 * Onboarding answers and what's built from them. Every answer is used: your name on Home, the goal
 * shapes the first pick and the paywall, the diet filters picks, recipes open sized for your
 * household, and the dinner moment sets when the daily reminder comes (if you say yes).
 */
import type { IconName } from '../components/Icon';

export type Goal = 'healthier' | 'muscle' | 'save' | 'home' | 'waste' | 'learn';

export type Profile = {
  /** What the cats call you. */
  name: string;
  /** One goal from onboarding (a list so older saved profiles with several still work). */
  goals: Goal[];
  /** Diet choices from onboarding (see dietOptions). Empty = no preference. */
  diets: DietPref[];
  /** People you usually cook for; recipes open scaled to this. null = use the recipe's own servings. */
  household: number | null;
  /** When the "what's for dinner?" moment hits, "HH:MM" (16:00, 17:00, 18:00, 19:30). */
  dinnerTime: string | null;
  /** The daily dinner idea: on or off, and at what time ("HH:MM"). Off unless they said yes. */
  reminder: { enabled: boolean; time: string };
  /** Optional 8 pm nudge when a 3+ day streak hasn't had today's cook yet. Off unless turned on. */
  streakSaver?: boolean;
};

export const emptyProfile: Profile = { name: '', goals: [], diets: [], household: null, dinnerTime: null, reminder: { enabled: false, time: '18:00' } };

/** Diet choices. Recipes are checked against these by their tags and ingredients (lib/onboardingPicks). */
export const dietOptions = ['Vegetarian', 'Vegan', 'Pescatarian', 'High protein', 'Gluten free', 'Dairy free', 'No pork'] as const;
/** A diet choice (older saved profiles may hold other tag names, which are ignored safely). */
export type DietPref = (typeof dietOptions)[number] | (string & {});

/** The goals offered in onboarding ("waste" is kept only so older saved profiles still load). */
export const goalOptions: { id: Goal; label: string; icon: IconName; tint: 'berryTint' | 'skyTint' | 'leafTint' | 'tomatoTint' | 'lilacTint' }[] = [
  { id: 'healthier', label: 'Eat healthier', icon: 'heart', tint: 'berryTint' },
  { id: 'muscle', label: 'Get in shape', icon: 'dumbbell', tint: 'skyTint' },
  { id: 'save', label: 'Save money on food', icon: 'coin', tint: 'leafTint' },
  { id: 'home', label: 'Cook more at home', icon: 'pot', tint: 'tomatoTint' },
  { id: 'learn', label: 'Learn to cook', icon: 'book', tint: 'lilacTint' },
];

/** Who you cook for. `size` is the default number of servings recipes open with. */
export const householdOptions: { size: number; big: string; label: string }[] = [
  { size: 1, big: '1', label: 'Just me' },
  { size: 2, big: '2', label: 'Two of us' },
  { size: 4, big: '3–4', label: 'Family' },
  { size: 6, big: '5+', label: 'A crowd' },
];

/** When the dinner question hits; the reminder comes at this time. */
export const dinnerMoments: { time: string; title: string; detail: string }[] = [
  { time: '16:00', title: 'Around 4 pm', detail: 'Planning after lunch' },
  { time: '17:00', title: 'Around 5 pm', detail: 'On the way home' },
  { time: '18:00', title: 'Around 6 pm', detail: 'Standing at the fridge' },
  { time: '19:30', title: 'After 7 pm', detail: 'Late and hungry' },
];

/** "18:00" → "6 pm", "19:30" → "7:30 pm". */
export function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}\u00A0${h < 12 ? 'am' : 'pm'}`;
}

/** Name for the cats to use, or a friendly fallback. */
export const displayName = (p: Profile, fallback: string) => (p.name.trim() ? p.name.trim().split(/\s+/)[0] : fallback);


export type Benefit = { icon: IconName; title: string; detail: string; for: Goal[] };

/** What Pro adds. Listed in the order that matters most to this person. Limits match FREE_LIMITS in store.tsx. */
export const proBenefits: Benefit[] = [
  { icon: 'link', title: 'Unlimited imports', detail: 'Save recipes from TikTok, YouTube, Instagram and any website (free: 3)', for: ['home', 'learn', 'save'] },
  { icon: 'cart', title: 'Unlimited pantry + smart suggestions', detail: 'See the one item that unlocks the most recipes (free: 10 items)', for: ['waste', 'save'] },
  { icon: 'target', title: 'Nutrition goals', detail: 'Daily protein and calorie targets, tracked from the meals you cook', for: ['muscle', 'healthier'] },
  { icon: 'bookmark', title: 'Unlimited cookbooks and recipes', detail: 'Organize everything you love (free: 3 cookbooks, 5 handwritten recipes)', for: ['learn', 'home'] },
];

/** Unlimited imports always leads (the app's core); the rest follow your goals. */
export function benefitsFor(p: Profile): Benefit[] {
  const [imports, ...rest] = proBenefits;
  return [imports, ...rest.sort((a, b) => Number(b.for.some((x) => p.goals.includes(x))) - Number(a.for.some((x) => p.goals.includes(x))))];
}

/** A short phrase echoing their goal back, e.g. "get in shape". */
export function goalPhrase(p: Profile): string {
  const first = goalOptions.find((g) => g.id === p.goals[0]);
  return first ? first.label.charAt(0).toLowerCase() + first.label.slice(1) : 'cook with less stress';
}
