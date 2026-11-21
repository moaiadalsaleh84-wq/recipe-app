import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../state/store';

/**
 * Tapping the daily dinner idea (or the streak saver) opens Get ready for that recipe: one tap from
 * the notification to cooking. Also handles the tap that launched the app. Renders nothing.
 */
export function NotificationTaps() {
  const { onboarded, hydrated, getRecipe } = useStore();
  useEffect(() => {
    if (!hydrated || !onboarded || Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    let live = true;
    const open = (data: unknown) => {
      const d = data as { kind?: string; recipeId?: string } | undefined;
      if (d?.kind !== 'dinner' || !d.recipeId || !getRecipe(d.recipeId)) return;
      router.push({ pathname: '/cook/[id]', params: { id: d.recipeId } });
    };
    (async () => {
      try {
        const N = await import('expo-notifications');
        if (!live) return;
        const last = await N.getLastNotificationResponseAsync();
        if (last) {
          // Cold start: give the navigator a moment to mount before moving.
          setTimeout(() => live && open(last.notification.request.content.data), 600);
          await N.clearLastNotificationResponseAsync?.();
        }
        sub = N.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
      } catch {
        // Notifications unavailable (e.g. Expo Go limits): nothing to handle.
      }
    })();
    return () => {
      live = false;
      sub?.remove();
    };
  }, [hydrated, onboarded, getRecipe]);
  return null;
}
