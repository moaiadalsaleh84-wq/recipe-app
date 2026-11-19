/** Finds durations like "18 minutes", "5 to 6 minutes", "1 hour" in a step. */
export function findTimers(step: string): { label: string; seconds: number }[] {
  const out: { label: string; seconds: number }[] = [];
  const re = /(\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(step))) {
    const n = Number(m[2] ?? m[1]); // use the upper bound of a range
    const unit = m[3].toLowerCase();
    const mult = unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1;
    out.push({ label: m[0], seconds: n * mult });
  }
  return out;
}

/** A short, readable length for a timer: "45 sec", "18 min", "1 hr 30 min". Never wraps awkwardly. */
export function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} sec`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return m ? `${h} hr ${m} min` : `${h} hr`;
  return rest ? `${m} min ${rest} sec` : `${m} min`;
}
