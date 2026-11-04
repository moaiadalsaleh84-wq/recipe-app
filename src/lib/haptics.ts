import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (fn: () => Promise<void>) => {
  if (!enabled) return;
  fn().catch(() => {
    // Haptics are a nice-to-have; ignore devices without a Taptic Engine.
  });
};

/** Thin wrapper so screens express intent, not engine details. */
export const haptics = {
  /** Standard tap on a button or card. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Changing a selection: chips, steppers, day picker, checkboxes. */
  select: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Destructive action like delete. */
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
};

export type HapticKind = keyof typeof haptics;
