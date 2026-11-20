/**
 * Cook Mode timers from step text: exact seconds, lower number of a range, combined hours and minutes.
 *
 * Run: node --test scripts/durations.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clock, pause, reset, resume, secondsLeft, start, type StartInput } from '../src/lib/cookTimers.ts';
import { findTimers } from '../src/lib/timers.ts';

const secs = (text: string) => findTimers(text).map((t) => t.seconds);

test('step text becomes exact seconds', () => {
  assert.deepEqual(secs('Simmer for 20 minutes.'), [1200]);
  assert.deepEqual(secs('Rest for 1 minute.'), [60]);
  assert.deepEqual(secs('Bake 18 min until golden.'), [1080]);
  assert.deepEqual(secs('Roast for 1 hour 10 minutes.'), [4200]);
  assert.deepEqual(secs('Roast for 1 hour and 10 minutes.'), [4200]);
  assert.deepEqual(secs('Whisk for 30 seconds.'), [30]);
});

test('a range uses the lower number', () => {
  assert.deepEqual(secs('Cook for 10-12 minutes.'), [600]);
  assert.deepEqual(secs('Fry for 5–7 mins.'), [300]);
  assert.deepEqual(secs('Bake for 8 to 10 minutes.'), [480]);
});

test('no time in the text means no timer; two separate times stay separate', () => {
  assert.deepEqual(secs('Add the cream and stir.'), []);
  assert.deepEqual(secs('Boil for 8 minutes, then rest for 2 minutes.'), [480, 120]);
});

const T0 = 1_800_000_000_000;
const tw: StartInput = { label: '20 minutes', total: 1200, recipeId: 'r', recipeTitle: 'R', step: 1, stepText: '' };

test('a 20-minute timer shows 20:00, then 19:59, and never more than 20:00', () => {
  const l = start([], tw, T0, 'a');
  assert.equal(clock(secondsLeft(l[0], T0)), '20:00');
  assert.equal(clock(secondsLeft(l[0], T0 + 1000)), '19:59');
  // Drawn against a clock that's a few seconds old (the old "20:03" bug): still 20:00.
  assert.equal(clock(secondsLeft(l[0], T0 - 3000)), '20:00');
});

test('pause keeps the exact time, resume sets a new end, reset goes back to full and stops', () => {
  let l = start([], tw, T0, 'a');
  l = pause(l, 'a', T0 + 61_500);
  assert.equal(l[0].remainingMs, 1_138_500);
  l = resume(l, 'a', T0 + 100_000);
  assert.equal(l[0].endsAt, T0 + 100_000 + 1_138_500);
  l = reset(l, 'a');
  assert.equal(l[0].status, 'paused');
  assert.equal(clock(secondsLeft(l[0], T0 + 999_999)), '20:00');
});

test('clock: m:ss under an hour, h:mm:ss from an hour', () => {
  assert.equal(clock(1200), '20:00');
  assert.equal(clock(545), '9:05');
  assert.equal(clock(4200), '1:10:00');
});
