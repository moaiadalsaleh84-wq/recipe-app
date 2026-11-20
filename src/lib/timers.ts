/** Finds durations like "18 minutes", "5 to 6 minutes", "1 hour" in a step. */
const UNIT = { h: 3600, m: 60, s: 1 } as const;
const unitOf = (word: string): keyof typeof UNIT => (word.startsWith('h') ? 'h' : word.startsWith('m') ? 'm' : 's');
/** "20 minutes", "18 min", "1 hour", "30 seconds", "10-12 minutes", "5–7 mins". */
const PART = /(\d+)(?:\s*(?:-|–|—|to)\s*(\d+))?\s*(hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)\b/gi;

/**
 * Every time in a step, as exact seconds, in the order written. A range uses the LOWER number
 * ("10-12 minutes" is 10 minutes: check early, you can always add time). "1 hour 10 minutes" is one
 * timer of 4200 seconds. A step with no time gets no timer.
 */
export function findTimers(step: string): { label: string; seconds: number }[] {
  const out: { label: string; seconds: number; start: number; end: number; unit: keyof typeof UNIT }[] = [];
  for (const m of step.matchAll(PART)) {
    const unit = unitOf(m[3].toLowerCase());
    const seconds = Number(m[1]) * UNIT[unit];
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const prev = out[out.length - 1];
    // "1 hour 10 minutes", "1 hour and 10 minutes": one timer, if the units get smaller.
    if (prev && !m[2] && UNIT[unit] < UNIT[prev.unit] && /^\s*(?:,|and)?\s*$/i.test(step.slice(prev.end, start))) {
      prev.seconds += seconds;
      prev.end = end;
      prev.label = step.slice(prev.start, end);
      prev.unit = unit;
      continue;
    }
    if (seconds > 0) out.push({ label: m[0], seconds, start, end, unit });
  }
  return out.map(({ label, seconds }) => ({ label, seconds }));
}

/** A short, readable length for a timer: "45 sec", "18 min", "1 hr 30 min". Numbers never split from their units. */
export function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const n = (v: number, u: string) => `${v}\u00A0${u}`;
  if (s < 60) return n(s, 'sec');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return m ? `${n(h, 'hr')} ${n(m, 'min')}` : n(h, 'hr');
  return rest ? `${n(m, 'min')} ${n(rest, 'sec')}` : n(m, 'min');
}
