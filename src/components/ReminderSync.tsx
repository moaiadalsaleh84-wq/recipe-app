import { useEffect } from 'react';
import { syncDinnerReminders } from '../lib/dinnerReminders';
import { useStore } from '../state/store';

/**
 * Keeps the daily dinner idea up to date: reschedules on launch and whenever the reminder setting,
 * the pantry, the diet or the cooking history changes (cooking today cancels today's). Renders nothing.
 */
export function ReminderSync() {
  const { profile, pantry, cooked, allRecipes, hydrated } = useStore();
  const { enabled, time } = profile.reminder ?? { enabled: false, time: '18:00' };
  const key = [enabled, time, pantry.join('|'), profile.diets.join('|'), profile.goals[0] ?? '', cooked.length, allRecipes.length].join('#');
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      void syncDinnerReminders({ enabled, time, recipes: allRecipes, pantry, diets: profile.diets, goal: profile.goals[0], cookedDates: cooked.map((c) => c.date) });
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);
  return null;
}
