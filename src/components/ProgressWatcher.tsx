import { useEffect, useRef } from 'react';
import { BADGES, levelFor, streakOf, xpFor } from '../lib/progress';
import { useStore } from '../state/store';
import { useToast } from './Toast';

/**
 * Watches what you do and hands out badges, list-completion XP and level-ups.
 * Renders nothing. Its toasts queue behind any feedback toast that is already showing.
 */
export function ProgressWatcher() {
  const store = useStore();
  const toast = useToast();
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

  const input = { cooked, customRecipes, plan, favorites, fun, streak: streakOf(cooked.map((c) => c.date)) };
  const newlyEarned = BADGES.filter((b) => !fun.badges.includes(b.id) && b.earned(input));
  const { level, title } = levelFor(xpFor(input));
  const earnedKey = newlyEarned.map((b) => b.id).join(',');

  useEffect(() => {
    if (!onboarded) return;
    if (!ready.current) {
      // First run after launch: record silently, never celebrate old progress.
      ready.current = true;
      if (newlyEarned.length) unlockBadges(newlyEarned.map((b) => b.id));
      if (level !== fun.lastLevel) setLastLevel(level);
      return;
    }
    if (newlyEarned.length) {
      unlockBadges(newlyEarned.map((b) => b.id));
      for (const b of newlyEarned) toast({ message: `Badge unlocked: ${b.title}! +25 XP`, icon: b.icon, queue: true });
    }
    if (level > fun.lastLevel) {
      setLastLevel(level);
      toast({ message: `Level up! You’re now a ${title} (level ${level})`, icon: 'crown', queue: true });
    } else if (level < fun.lastLevel) {
      setLastLevel(level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedKey, level, onboarded]);

  return null;
}
