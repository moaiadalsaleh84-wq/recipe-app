/**
 * "We'll send you a reminder that your trial is ending": a real local notification two days
 * before the trial ends (day 5 of a 7-day trial). Permission is asked only when a trial starts.
 * If it's refused (or this build can't schedule), Home shows the reminder in the app instead,
 * from that day on (see the trial reminder on the Cook tab).
 * The native module is loaded lazily inside try/catch, so it can never crash the app.
 */
import { Platform } from 'react-native';

const ID = 'pantry-pop-trial-reminder';

export async function scheduleTrialReminder(trialEndsAt: string): Promise<'scheduled' | 'denied' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const N = await import('expo-notifications');
    let perm = await N.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await N.requestPermissionsAsync();
    if (!perm.granted) return 'denied';
    const remindAt = new Date(new Date(trialEndsAt).getTime() - 2 * 24 * 3600 * 1000);
    if (remindAt.getTime() <= Date.now()) return 'unavailable';
    await N.cancelScheduledNotificationAsync(ID).catch(() => {});
    await N.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'Your Pantry Pop trial ends in 2 days', body: 'Keep Pro, or cancel in Settings before it renews.' },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: remindAt },
    });
    return 'scheduled';
  } catch {
    return 'unavailable';
  }
}
