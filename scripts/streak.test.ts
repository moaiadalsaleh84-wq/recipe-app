// Streak rules: a day counts if at least one meal was finished in Cook Mode that day (local time);
// the streak runs up to today or yesterday (not broken until today ends).
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.TZ = 'America/Los_Angeles';
const { streakOf } = await import('../src/lib/progress.ts');

// Local noon on a given day of November 2026.
const at = (day: number, h = 12, m = 0) => new Date(2026, 10, day, h, m);
const iso = (d: Date) => d.toISOString();

test('cooked today (and the two days before): 3', () => {
  const now = at(21, 18);
  assert.equal(streakOf([iso(at(21, 9)), iso(at(20)), iso(at(19))], now), 3);
  assert.equal(streakOf([iso(at(21, 9))], now), 1);
});

test('cooked yesterday but not yet today: still alive', () => {
  const now = at(21, 18);
  assert.equal(streakOf([iso(at(20)), iso(at(19))], now), 2);
});

test('a gap of two days breaks it', () => {
  const now = at(21, 18);
  assert.equal(streakOf([iso(at(19)), iso(at(18))], now), 0);
  // Today after a gap starts again at 1.
  assert.equal(streakOf([iso(at(21, 8)), iso(at(18)), iso(at(17))], now), 1);
});

test('local midnight decides the day, not UTC', () => {
  // 11:30 pm Nov 20 in Los Angeles is already Nov 21 in UTC: it still counts for Nov 20 here.
  const lateNight = at(20, 23, 30);
  assert.equal(lateNight.toISOString().slice(0, 10), '2026-11-21');
  const justAfterMidnight = at(21, 0, 30);
  assert.equal(streakOf([iso(lateNight)], justAfterMidnight), 1, 'yesterday (local) keeps it alive');
  assert.equal(streakOf([iso(lateNight), iso(at(19))], justAfterMidnight), 2);
  // Two meals either side of local midnight are two days.
  assert.equal(streakOf([iso(lateNight), iso(at(21, 0, 10))], at(21, 1)), 2);
  // Several meals on one day count once.
  assert.equal(streakOf([iso(at(21, 8)), iso(at(21, 13)), iso(at(21, 19))], at(21, 20)), 1);
});
