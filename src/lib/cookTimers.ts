/**
 * Cook Mode timers, as plain data. No React, no native modules, so it's unit-tested in Node
 * (scripts/timers.test.ts).
 *
 * A timer is defined by when it ends (`endsAt`), not by counting seconds, so it stays correct
 * while the app is suspended or killed: on return we simply compare with the clock.
 */

export type TimerStatus = 'running' | 'paused' | 'ringing' | 'done';

export type CookTimer = {
  id: string;
  /** "18 minutes", as written in the step. */
  label: string;
  /** Full length in seconds. */
  total: number;
  status: TimerStatus;
  /** When it reaches 0:00 (ms). Set while running. */
  endsAt: number | null;
  /** Seconds left, kept while paused. */
  remaining: number;
  /** When it reached 0:00 (ms). Set once ringing/done. */
  finishedAt: number | null;
  recipeId: string;
  recipeTitle: string;
  /** 1-based step it was started on. */
  step: number;
  /** Short text of that step, for the lock screen. */
  stepText: string;
};

export const MAX_TIMERS = 4;
/** Ring in the app only if it finished less than this long ago (otherwise it already rang as a notification). */
export const RING_IF_LATE_UNDER_MS = 60_000;

export const secondsLeft = (t: CookTimer, now: number) =>
  t.status === 'running' && t.endsAt != null ? Math.max(0, Math.ceil((t.endsAt - now) / 1000)) : t.status === 'paused' ? t.remaining : 0;

/** "4:05", "1:02:03". */
export function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export type StartInput = Pick<CookTimer, 'label' | 'total' | 'recipeId' | 'recipeTitle' | 'step' | 'stepText'>;

const newId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Starts a timer. The same timer (same recipe, step and label) restarts instead of duplicating.
 * At MAX_TIMERS, the oldest finished one is replaced, else the oldest overall.
 */
export function start(list: CookTimer[], input: StartInput, now: number, id: string = newId()): CookTimer[] {
  const fresh: CookTimer = { ...input, id, status: 'running', endsAt: now + input.total * 1000, remaining: input.total, finishedAt: null };
  const same = list.find((t) => t.recipeId === input.recipeId && t.step === input.step && t.label === input.label);
  if (same) return list.map((t) => (t === same ? { ...fresh, id: same.id } : t));
  let next = [...list];
  if (next.length >= MAX_TIMERS) {
    const victim = next.find((t) => t.status === 'done' || t.status === 'ringing') ?? next[0];
    next = next.filter((t) => t !== victim);
  }
  return [...next, fresh];
}

const update = (list: CookTimer[], id: string, fn: (t: CookTimer) => CookTimer) => list.map((t) => (t.id === id ? fn(t) : t));

export const pause = (list: CookTimer[], id: string, now: number) =>
  update(list, id, (t) => (t.status === 'running' ? { ...t, status: 'paused', remaining: secondsLeft(t, now), endsAt: null } : t));

export const resume = (list: CookTimer[], id: string, now: number) =>
  update(list, id, (t) => (t.status === 'paused' && t.remaining > 0 ? { ...t, status: 'running', endsAt: now + t.remaining * 1000 } : t));

export const restart = (list: CookTimer[], id: string, now: number) =>
  update(list, id, (t) => ({ ...t, status: 'running', endsAt: now + t.total * 1000, remaining: t.total, finishedAt: null }));

/** Stop a ringing timer, or cancel a running/paused one. Either way it's removed. */
export const stop = (list: CookTimer[], id: string) => list.filter((t) => t.id !== id);

/** Silence a ringing timer but keep it listed as done (e.g. the alarm timed out). */
export const silence = (list: CookTimer[], id: string) => update(list, id, (t) => (t.status === 'ringing' ? { ...t, status: 'done' } : t));

/**
 * Moves time forward: running timers past their end start ringing.
 * Returns which ones finished now and whether each should ring in the app (not if it finished
 * long ago, e.g. while the app was closed; the notification already rang then).
 */
export function tick(list: CookTimer[], now: number): { list: CookTimer[]; finished: { id: string; ring: boolean }[] } {
  const finished: { id: string; ring: boolean }[] = [];
  const next = list.map((t) => {
    if (t.status !== 'running' || t.endsAt == null || t.endsAt > now) return t;
    const late = now - t.endsAt;
    const ring = late < RING_IF_LATE_UNDER_MS;
    finished.push({ id: t.id, ring });
    return { ...t, status: ring ? ('ringing' as const) : ('done' as const), remaining: 0, finishedAt: t.endsAt, endsAt: null };
  });
  return { list: finished.length ? next : list, finished };
}

/** Saved timers from storage, validated (a bad save never crashes Cook Mode). */
export function restore(raw: unknown, now: number): CookTimer[] {
  if (!Array.isArray(raw)) return [];
  const ok = raw.filter(
    (t): t is CookTimer =>
      !!t && typeof t === 'object' && typeof t.id === 'string' && typeof t.total === 'number' && ['running', 'paused', 'ringing', 'done'].includes(t.status),
  );
  // Ringing timers from a previous run don't ring again: the notification did that.
  const quiet = ok.map((t) => (t.status === 'ringing' ? { ...t, status: 'done' as const } : t));
  return tick(quiet.slice(-MAX_TIMERS), now).list;
}

/** Timers older than a few hours are forgotten. */
export const prune = (list: CookTimer[], now: number) =>
  list.filter((t) => !(t.status === 'done' && t.finishedAt != null && now - t.finishedAt > 3 * 3600_000));
