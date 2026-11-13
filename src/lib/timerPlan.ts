/**
 * What has to happen outside the app when the timers change: which notifications to schedule
 * or cancel, which Live Activities to start, update or end. Pure (no native modules), so the
 * rules are unit-tested in Node; src/lib/timerAlerts.ts carries the plan out on the phone.
 */
import type { CookTimer } from './cookTimers';

export type AlertOp =
  | { kind: 'schedule'; timer: CookTimer } // notification at timer.endsAt
  | { kind: 'cancel'; id: string } // remove scheduled and delivered notification
  | { kind: 'activityStart'; timer: CookTimer }
  | { kind: 'activityUpdate'; timer: CookTimer }
  | { kind: 'activityEnd'; id: string };

/** The part of a timer the outside world shows. A change in any of these needs new alerts. */
const signature = (t: CookTimer) => `${t.status}|${t.endsAt ?? ''}|${t.remaining}`;

export function planAlerts(prev: CookTimer[], next: CookTimer[]): AlertOp[] {
  const ops: AlertOp[] = [];
  const before = new Map(prev.map((t) => [t.id, t]));
  const after = new Map(next.map((t) => [t.id, t]));

  for (const [id] of before) {
    if (!after.has(id)) {
      ops.push({ kind: 'cancel', id }, { kind: 'activityEnd', id });
    }
  }
  for (const [id, t] of after) {
    const old = before.get(id);
    if (old && signature(old) === signature(t)) continue;

    // Notification: exactly one pending while running.
    // Reaching 0:00 (running → ringing) cancels nothing: the notification is firing right then,
    // and iOS may still be running the app for a few seconds after the screen locks, so a cancel
    // here could remove the alert the person needs. It's cleared when they stop or silence it.
    if (t.status === 'running') ops.push({ kind: 'schedule', timer: t });
    else if (t.status === 'paused' || (t.status === 'done' && old?.status === 'ringing') || !old) ops.push({ kind: 'cancel', id });

    // Live Activity: shown while running, paused or ringing; ended once done.
    if (t.status === 'done') {
      if (old) ops.push({ kind: 'activityEnd', id });
    } else if (!old || old.status === 'done') {
      ops.push({ kind: 'activityStart', timer: t });
    } else {
      ops.push({ kind: 'activityUpdate', timer: t });
    }
  }
  return ops;
}
