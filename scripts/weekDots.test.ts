/**
 * The You tab's week circles always fit and never touch.
 * Run: node --test scripts/weekDots.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOT_GAP, weekDotSize } from '../src/lib/weekDots.ts';

test('32pt circles when they fit; smaller when they would touch', () => {
  // The streak card's inside at 375pt: 375 − 40 margins − 5 border − 36 padding = 294.
  assert.equal(weekDotSize(294), 32);
  for (const w of [180, 220, 240, 260, 272, 294, 360]) {
    const d = weekDotSize(w);
    assert.ok(d * 7 + 6 * DOT_GAP <= w || d === 16, `fits at ${w}`);
  }
});
