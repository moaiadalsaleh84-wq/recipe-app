/**
 * Carries out the timer alert plan (src/lib/timerPlan.ts) on the phone:
 * - a local notification at the exact end time (rings with the app closed or the phone locked),
 * - a Live Activity on the Lock Screen and in the Dynamic Island.
 *
 * Both need native code from a development or App Store build. In Expo Go and on the web,
 * every function here does nothing and Cook Mode says the timer only rings while the app is open.
 * Native modules are loaded lazily inside try/catch, so a missing module can never crash the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { BuddyId } from '../components/cats/types';
import { liveActivity as palette } from '../theme';
import type { CookTimerActivityProps } from '../widgets/CookTimerActivity';
import { clock, type CookTimer } from './cookTimers';
import type { AlertOp } from './timerPlan';

type NotificationsModule = typeof import('expo-notifications');
type WidgetsModule = typeof import('expo-widgets');
type ActivityInstance = ReturnType<ReturnType<WidgetsModule['createLiveActivity']>['start']>;

export const TIMER_NOTIFICATION_SOUND = 'timer-alarm.wav';
const NOTIF_PREFIX = 'cook-timer-';
const ACTIVITY_MAP_KEY = 'pantry-pop-timer-activities-v1';

/* ---------------- what this build can do ---------------- */

export type BackgroundSupport = { notifications: boolean; liveActivities: boolean; reason: 'web' | 'expo-go' | null };

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notifications: NotificationsModule | null | undefined;
function N(): NotificationsModule | null {
  if (notifications === undefined) {
    notifications = null;
    if (Platform.OS !== 'web' && !isExpoGo) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        notifications = require('expo-notifications') as NotificationsModule;
      } catch {
        notifications = null;
      }
    }
  }
  return notifications;
}

let widgets: { mod: WidgetsModule; factory: ReturnType<WidgetsModule['createLiveActivity']> } | null | undefined;
function W() {
  if (widgets === undefined) {
    widgets = null;
    if (Platform.OS === 'ios' && !isExpoGo) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('expo-widgets') as WidgetsModule;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CookTimerActivity } = require('../widgets/CookTimerActivity') as typeof import('../widgets/CookTimerActivity');
        widgets = { mod, factory: mod.createLiveActivity<CookTimerActivityProps>('CookTimer', CookTimerActivity) };
      } catch {
        widgets = null; // no extension in this build
      }
    }
  }
  return widgets;
}

export function backgroundSupport(): BackgroundSupport {
  if (Platform.OS === 'web') return { notifications: false, liveActivities: false, reason: 'web' };
  if (isExpoGo) return { notifications: false, liveActivities: false, reason: 'expo-go' };
  return { notifications: !!N(), liveActivities: !!W(), reason: null };
}

/* ---------------- permission ---------------- */

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function notificationPermission(): Promise<NotificationPermission> {
  const n = N();
  if (!n) return 'unavailable';
  try {
    const p = await n.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const n = N();
  if (!n) return false;
  try {
    const p = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return p.granted;
  } catch {
    return false;
  }
}

/* ---------------- listeners: foreground, taps, Lock Screen buttons ---------------- */

export type TimerControl = { action: 'pause' | 'resume' | 'stop'; timerId: string };

/**
 * - While the app is open, timer notifications stay silent: the in-app alarm rings instead.
 * - Tapping a notification opens that recipe's Cook Mode.
 * - Pause / Resume / Stop on the Lock Screen arrive as controls (iOS 17+).
 * Returns a cleanup function.
 */
export function listen(handlers: { onOpenRecipe: (recipeId: string) => void; onControl: (c: TimerControl) => void }): () => void {
  const subs: { remove: () => void }[] = [];
  const n = N();
  if (n) {
    try {
      n.setNotificationHandler({
        handleNotification: async (notification) => {
          const isTimer = notification.request.identifier.startsWith(NOTIF_PREFIX);
          return { shouldShowBanner: !isTimer, shouldShowList: true, shouldPlaySound: !isTimer, shouldSetBadge: false };
        },
      });
      subs.push(
        n.addNotificationResponseReceivedListener((r) => {
          const recipeId = r.notification.request.content.data?.recipeId;
          if (typeof recipeId === 'string') handlers.onOpenRecipe(recipeId);
        }),
      );
      // Opened from a notification while the app was closed.
      n.getLastNotificationResponseAsync()
        .then((r) => {
          const recipeId = r?.notification.request.content.data?.recipeId;
          if (typeof recipeId === 'string') handlers.onOpenRecipe(recipeId);
        })
        .catch(() => {});
    } catch {
      // notifications unavailable
    }
  }
  const w = W();
  if (w) {
    try {
      subs.push(
        w.mod.addUserInteractionListener((e) => {
          const [action, timerId] = String(e.target ?? '').split(':');
          if ((action === 'pause' || action === 'resume' || action === 'stop') && timerId) handlers.onControl({ action, timerId });
        }),
      );
    } catch {
      // no Live Activity support
    }
  }
  return () => subs.forEach((s) => s.remove());
}

/* ---------------- carrying out the plan ---------------- */

export type AlertContext = { buddy: BuddyId; buddyName: string; doneLine: string };

const notifId = (timerId: string) => `${NOTIF_PREFIX}${timerId}`;

/** Cat faces for the Live Activity, copied once into the folder the widget extension can read. */
let faceCache: Partial<Record<BuddyId, CookTimerActivityProps['faces']>> = {};
const FACE_ASSETS: Record<BuddyId, Record<'calm' | 'worried' | 'alarm', number>> = {
  tank: { calm: require('../../assets/live-activity/tank-calm.png'), worried: require('../../assets/live-activity/tank-worried.png'), alarm: require('../../assets/live-activity/tank-alarm.png') },
  biscuit: { calm: require('../../assets/live-activity/biscuit-calm.png'), worried: require('../../assets/live-activity/biscuit-worried.png'), alarm: require('../../assets/live-activity/biscuit-alarm.png') },
};

async function facesFor(buddy: BuddyId): Promise<CookTimerActivityProps['faces']> {
  const cached = faceCache[buddy];
  if (cached) return cached;
  const empty = { calm: '', worried: '', alarm: '' };
  const w = W();
  if (!w?.mod.widgetsDirectory) return empty;
  try {
    const { Asset } = await import('expo-asset');
    const { Directory, File } = await import('expo-file-system');
    const dir = new Directory(w.mod.widgetsDirectory);
    const out = { ...empty };
    for (const mood of ['calm', 'worried', 'alarm'] as const) {
      const dest = new File(dir, `cook-timer-${buddy}-${mood}.png`);
      if (!dest.exists) {
        const asset = await Asset.fromModule(FACE_ASSETS[buddy][mood]).downloadAsync();
        if (asset.localUri) await new File(asset.localUri).copy(dest);
      }
      out[mood] = dest.uri;
    }
    faceCache = { ...faceCache, [buddy]: out };
    return out;
  } catch {
    return empty; // the layout falls back to a timer symbol
  }
}

function activityProps(t: CookTimer, ctx: AlertContext, faces: CookTimerActivityProps['faces']): CookTimerActivityProps {
  const end = t.status === 'running' && t.endsAt ? t.endsAt : Date.now() + t.remaining * 1000;
  return {
    timerId: t.id,
    recipeTitle: t.recipeTitle,
    stepLine: `Step ${t.step}${t.stepText ? ` · ${t.stepText}` : ''}`,
    label: `${t.label} timer`,
    state: t.status === 'ringing' ? 'ringing' : t.status === 'paused' ? 'paused' : 'running',
    // The window covers the whole timer, so the bar shows true progress even after a pause.
    startMs: end - t.total * 1000,
    endMs: end,
    pausedText: clock(t.remaining),
    progress: t.total ? Math.min(1, Math.max(0, 1 - t.remaining / t.total)) : 0,
    faces,
    buddyName: ctx.buddyName,
    palette,
  };
}

/** iOS marks the activity stale this long before the end, and the cat starts to worry. */
const staleDateFor = (t: CookTimer) => (t.status === 'running' && t.endsAt ? new Date(t.endsAt - palette.worriedSeconds * 1000) : undefined);

const activities = new Map<string, ActivityInstance>();

async function loadActivityMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(ACTIVITY_MAP_KEY)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
async function saveActivityMap() {
  const map: Record<string, string> = {};
  for (const [timerId, a] of activities) {
    try {
      map[timerId] = a.getId();
    } catch {
      // ended
    }
  }
  await AsyncStorage.setItem(ACTIVITY_MAP_KEY, JSON.stringify(map)).catch(() => {});
}

/**
 * After the app was closed: reconnect to the Live Activities still on screen, and end the ones
 * whose timers no longer exist. Call once at launch with the restored timers.
 */
export async function reconnect(timers: CookTimer[]) {
  const w = W();
  if (!w) return;
  try {
    const map = await loadActivityMap();
    const byActivityId = new Map(Object.entries(map).map(([timerId, activityId]) => [activityId, timerId]));
    const live = new Set(timers.filter((t) => t.status !== 'done').map((t) => t.id));
    for (const instance of w.factory.getInstances()) {
      const timerId = byActivityId.get(instance.getId());
      if (timerId && live.has(timerId)) activities.set(timerId, instance);
      else await instance.end('immediate').catch(() => {});
    }
    await saveActivityMap();
  } catch {
    // nothing to reconnect
  }
}

async function run(op: AlertOp, ctx: AlertContext) {
  const n = N();
  const w = W();
  switch (op.kind) {
    case 'schedule': {
      const t = op.timer;
      const endsAt = t.endsAt;
      if (!n || !endsAt) return;
      await n.cancelScheduledNotificationAsync(notifId(t.id)).catch(() => {});
      await n.scheduleNotificationAsync({
        identifier: notifId(t.id),
        content: {
          title: `Time’s up: ${t.label}`,
          body: `${t.recipeTitle}, step ${t.step}. ${ctx.doneLine}`,
          sound: TIMER_NOTIFICATION_SOUND,
          interruptionLevel: 'timeSensitive', // breaks through Focus when the user allows it
          data: { timerId: t.id, recipeId: t.recipeId },
        },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
      });
      return;
    }
    case 'cancel': {
      if (!n) return;
      await n.cancelScheduledNotificationAsync(notifId(op.id)).catch(() => {});
      await n.dismissNotificationAsync(notifId(op.id)).catch(() => {});
      return;
    }
    case 'activityStart': {
      if (!w) return;
      const props = activityProps(op.timer, ctx, await facesFor(ctx.buddy));
      const url = `pantrypop://cook/${encodeURIComponent(op.timer.recipeId)}`;
      activities.set(op.timer.id, w.factory.start(props, url, staleDateFor(op.timer)));
      await saveActivityMap();
      return;
    }
    case 'activityUpdate': {
      const a = activities.get(op.timer.id);
      if (!a) return run({ kind: 'activityStart', timer: op.timer }, ctx);
      await a.update(activityProps(op.timer, ctx, await facesFor(ctx.buddy)), staleDateFor(op.timer));
      return;
    }
    case 'activityEnd': {
      const a = activities.get(op.id);
      activities.delete(op.id);
      if (a) {
        await a.end('immediate').catch(() => {});
        await saveActivityMap();
      }
      return;
    }
  }
}

/** Runs operations one after another, so a quick pause/resume can't arrive out of order. */
let queue: Promise<void> = Promise.resolve();
export function applyAlerts(ops: AlertOp[], ctx: AlertContext) {
  if (!ops.length) return queue;
  queue = queue.then(async () => {
    for (const op of ops) {
      try {
        await run(op, ctx);
      } catch {
        // One failed alert (e.g. permission denied) must not block the others or the timer itself.
      }
    }
  });
  return queue;
}
