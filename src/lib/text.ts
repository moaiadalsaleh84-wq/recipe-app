/**
 * Joins the last two words with a non-breaking space, so a line never ends with one word
 * alone on the next line ("You're on / fire." becomes "You're / on fire."). Works on every
 * platform, unlike CSS-only fixes.
 */
export function noWidow(text: string) {
  const i = text.trimEnd().lastIndexOf(' ');
  if (i <= 0) return text;
  const last = text.slice(i + 1);
  // Long last words can wrap on their own without looking lonely.
  return last.length > 14 ? text : `${text.slice(0, i)} ${last}`;
}
