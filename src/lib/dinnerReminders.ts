/**
 * The daily dinner idea ("Tonight: Creamy Mushroom Spaghetti"), at the time picked in onboarding.
 *
 * A notification's text is fixed when it's scheduled, so the app schedules the next 7 days, one
 * notification per day, each with that day's real pick (recipe, minutes, how much you have), and
 * reschedules whenever it opens or something changes. So:
 * - never more than one a day (one id per date),
 * - none on a day you already cooked (today's is cancelled when you finish a meal),
 * - none at all unless you said yes; permission is only asked after that yes.
 * Native modules load lazily inside try/catch, so this can never crash the app.
 */
import { Platform } from 'react-native';
import type { Recipe } from '../data/mock';
import type { Goal } from '../data/onboarding';
import { pickForDay, rankPicks } from './onboardingPicks';

const PREFIX = 'pantry-pop-dinner-';
const DAYS = 7;

type Notifications = typeof import('expo-notifications');
async function load(): Promise<Notifications | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/** Asks iOS for permission (only call after the person said yes). True if allowed. */
export async function askReminderPermission(): Promise<boolean> {
  const N = await load();
  if (!N) return false;
  try {
    let perm = await N.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await N.requestPermissionsAsync();
    return perm.granted;
  } catch {
    return false;
  }
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNumberOf = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

/** The notification text for one day's pick: "Tonight: Chicken Fried Rice" / "20 min · you have 4 of 6". */
export function reminderText(recipe: Recipe, have: number, needed: number) {
  const time = `${recipe.minutes}\u00A0min`;
  return {
    title: `Tonight: ${recipe.title}`,
    body: have > 0 ? `${time} · you have ${have} of\u00A0${needed}. Tap to start.` : `${time} · ${needed}\u00A0ingredients. Tap to start.`,
  };
}

/**
 * The optional streak saver (off unless you turn it on in Settings): at 8 pm, only when your streak
 * is 3+ days and you haven't cooked today. Warm, never a loss warning.
 */
export function streakSaverText(streak: number, recipe: Recipe) {
  return { title: `Your ${streak}-day streak is sizzling`, body: `A ${recipe.minutes}-minute idea: ${recipe.title}. Tap to start.` };
}
const SAVER_ID = `${PREFIX}saver`;
const SAVER_HOUR = 20;

export type ReminderInput = {
  enabled: boolean;
  /** "HH:MM" */
  time: string;
  recipes: Recipe[];
  pantry: string[];
  diets: readonly string[];
  goal?: Goal;
  /** ISO dates of cooked meals. */
  cookedDates: string[];
  /** The 8 pm streak saver (Settings). */
  streakSaver?: boolean;
  /** Current streak in days. */
  streak?: number;
};

/** Cancels the scheduled dinner ideas and, if on, schedules the next 7 days afresh. */
export async function syncDinnerReminders(input: ReminderInput) {
  const N = await load();
  if (!N) return;
  try {
    // Start clean every time: the dinner ideas and the streak saver are rebuilt from current data.
    const scheduled = await N.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => N.cancelScheduledNotificationAsync(n.identifier)));
    const perm = await N.getPermissionsAsync();
    if (!perm.granted) return;
    const now = new Date();
    const cookedToday = input.cookedDates.some((iso) => dayKey(new Date(iso)) === dayKey(now));
    // Streak saver: today only (tomorrow's streak depends on today), and only if it still applies.
    if (input.streakSaver && (input.streak ?? 0) >= 3 && !cookedToday) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), SAVER_HOUR, 0, 0, 0);
      const quick = rankPicks({ recipes: input.recipes, pantry: input.pantry, diets: input.diets, goal: input.goal, maxMinutes: 20 }).sort((a, b) => a.recipe.minutes - b.recipe.minutes)[0];
      if (quick && at.getTime() > now.getTime()) {
        await N.scheduleNotificationAsync({
          identifier: SAVER_ID,
          content: { ...streakSaverText(input.streak ?? 0, quick.recipe), data: { recipeId: quick.recipe.id, kind: 'dinner' } },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
        });
      }
    }
    if (!input.enabled) return;
    const [h, m] = input.time.split(':').map(Number);
    const cookedDays = new Set(input.cookedDates.map((iso) => dayKey(new Date(iso))));
    const picks = rankPicks({ recipes: input.recipes, pantry: input.pantry, diets: input.diets, goal: input.goal });
    for (let i = 0; i < DAYS; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0, 0);
      if (at.getTime() <= now.getTime()) continue; // today's time has passed
      if (cookedDays.has(dayKey(at))) continue; // already cooked that day: stay quiet
      const pick = pickForDay(picks, dayNumberOf(at));
      if (!pick) continue;
      await N.scheduleNotificationAsync({
        identifier: `${PREFIX}${dayKey(at)}`,
        content: { ...reminderText(pick.recipe, pick.have, pick.needed), data: { recipeId: pick.recipe.id, kind: 'dinner' } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // Reminders are a nice-to-have; never break the app over them.
  }
}
