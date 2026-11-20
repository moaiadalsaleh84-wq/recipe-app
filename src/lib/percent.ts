/**
 * Whole-number percentages that always add up to exactly 100 (the largest-remainder method):
 * round everything down, then give the leftover points to the values that lost the most.
 * [25, 25, 50] → [25, 25, 50]; [1, 1, 1] → [34, 33, 33]. All zeros → all zeros.
 */
export function roundPercents(values: number[]): number[] {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(0, v) / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, rest: e - floors[i] })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

/** Share of calories from protein, carbs and fat (4, 4 and 9 kcal per gram), adding up to 100. */
export const macroPercents = (protein: number, carbs: number, fat: number) => roundPercents([protein * 4, carbs * 4, fat * 9]);
