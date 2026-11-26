import { useEffect, useRef } from 'react';
import { BADGES, levelFor, streakOf, xpFor } from '../lib/progress';
import { useStore } from '../state/store';
import { pop } from '../theme';
import { useCelebrate } from './Celebration';

/**
 * Watches what you do and hands out badges, list-completion XP and level-ups, and celebrates them
 * full screen: the streak growing, a new level, a new badge (one after another). Renders nothing.
 */
export function ProgressWatcher() {
  const store = useStore();
  const celebrate = useCelebrate();
  const lastStreak = useRef<number | null>(null);
  const { cooked, customRecipes, plan, favorites, fun, groceries, unlockBadges, addListDone, setLastLevel, onboarded } = store;
  const ready = useRef(false);
  const listWasDone = useRef<boolean | null>(null);

  // A finished grocery list (every item ticked) counts once each time it becomes complete.
  const total = groceries.length;
  const allDone = total > 0 && groceries.every((g) => g.checked);
  useEffect(() => {
    if (listWasDone.current === false && allDone) addListDone();
    listWasDone.current = allDone;
  }, [allDone, addListDone]);

  const streak = streakOf(cooked.map((c) => c.date));
  const input = { cooked, customRecipes, plan, favorites, fun, streak };
  const newlyEarned = BADGES.filter((b) => !fun.badges.includes(b.id) && b.earned(input));
  const { level, title } = levelFor(xpFor(input));
  const earnedKey = newlyEarned.map((b) => b.id).join(',');

  useEffect(() => {
    if (!onboarded) return;
    if (!ready.current) {
      // First run after launch: record silently, never celebrate old progress.
      ready.current = true;
      lastStreak.current = streak;
      if (newlyEarned.length) unlockBadges(newlyEarned.map((b) => b.id));
      if (level !== fun.lastLevel) setLastLevel(level);
      return;
    }
    // The streak grew (your first cook today): streak first, then badges, then a new level.
    if (lastStreak.current !== null && streak > lastStreak.current) {
      celebrate({ kind: 'streak', number: streak, title: streak === 1 ? 'Day one!' : `${streak} day streak!`, message: streak === 1 ? 'Your streak has started. Cook again tomorrow to keep it going.' : 'You cooked again today. Keep it going tomorrow!', icon: 'flameFill', color: pop.sunshine });
    }
    lastStreak.current = streak;
    if (newlyEarned.length) {
      unlockBadges(newlyEarned.map((b) => b.id));
      for (const b of newlyEarned) celebrate({ kind: 'badge', title: 'New badge!', message: `${b.title}: ${b.hint.charAt(0).toLowerCase()}${b.hint.slice(1)}. +25 XP`, icon: b.icon, color: pop.leaf });
    }
    if (level > fun.lastLevel) {
      setLastLevel(level);
      celebrate({ kind: 'level', title: `Level ${level}!`, message: `You’re now a ${title}.`, icon: 'crown', color: pop.lilac });
    } else if (level < fun.lastLevel) {
      setLastLevel(level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedKey, level, onboarded, streak]);

  return null;
}
