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

/** The notification text for one day's pick. */
export function reminderText(recipe: Recipe, have: number, needed: number) {
  const time = `${recipe.minutes} min`;
  return {
    title: `Tonight: ${recipe.title}`,
    body: have > 0 ? `${time}, and you already have ${have} of the ${needed} ingredients. Tap to start.` : `${time} and ${needed} ingredients. Tap to start.`,
  };
}

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
};

/** Cancels the scheduled dinner ideas and, if on, schedules the next 7 days afresh. */
export async function syncDinnerReminders(input: ReminderInput) {
  const N = await load();
  if (!N) return;
  try {
    const scheduled = await N.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => N.cancelScheduledNotificationAsync(n.identifier)));
    if (!input.enabled) return;
    const perm = await N.getPermissionsAsync();
    if (!perm.granted) return;
    const [h, m] = input.time.split(':').map(Number);
    const cookedDays = new Set(input.cookedDates.map((iso) => dayKey(new Date(iso))));
    const picks = rankPicks({ recipes: input.recipes, pantry: input.pantry, diets: input.diets, goal: input.goal });
    const now = new Date();
    for (let i = 0; i < DAYS; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0, 0);
      if (at.getTime() <= now.getTime()) continue; // today's time has passed
      if (cookedDays.has(dayKey(at))) continue; // already cooked that day: stay quiet
      const pick = pickForDay(picks, dayNumberOf(at));
      if (!pick) continue;
      await N.scheduleNotificationAsync({
        identifier: `${PREFIX}${dayKey(at)}`,
        content: { ...reminderText(pick.recipe, pick.have, pick.needed), data: { recipeId: pick.recipe.id } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // Reminders are a nice-to-have; never break the app over them.
  }
}
