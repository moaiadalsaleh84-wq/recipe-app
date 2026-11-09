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
