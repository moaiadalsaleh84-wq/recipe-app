/**
 * Timer logic tests: start, pause, resume, stop, restart, several timers, app killed.
 * Run: node --test scripts/timers.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_TIMERS, clock, pause, prune, restart, restore, resume, secondsLeft, silence, start, stop, tick, type CookTimer, type StartInput } from '../src/lib/cookTimers.ts';
import { planAlerts } from '../src/lib/timerPlan.ts';

const T0 = 1_800_000_000_000;
const pasta: StartInput = { label: '10 minutes', total: 600, recipeId: 'penne', recipeTitle: 'Penne', step: 2, stepText: 'Boil the pasta' };
const sauce: StartInput = { ...pasta, label: '5 minutes', total: 300, step: 3, stepText: 'Simmer the sauce' };
const kinds = (ops: ReturnType<typeof planAlerts>) => ops.map((o) => o.kind).sort();

test('start: counts down from the end time, not from ticks', () => {
  const l = start([], pasta, T0, 'a');
  assert.equal(l[0].status, 'running');
  assert.equal(l[0].endsAt, T0 + 600_000);
  assert.equal(secondsLeft(l[0], T0 + 61_000), 539);
  assert.equal(clock(539), '8:59');
  assert.equal(clock(3723), '1:02:03');
});

test('pause keeps the remaining time; resume sets a new end time', () => {
  let l = start([], pasta, T0, 'a');
  l = pause(l, 'a', T0 + 100_000);
  assert.equal(l[0].status, 'paused');
  assert.equal(l[0].remaining, 500);
  assert.equal(l[0].endsAt, null);
  // An hour on the counter while paused changes nothing.
  assert.equal(secondsLeft(l[0], T0 + 3_600_000), 500);
  l = resume(l, 'a', T0 + 3_600_000);
  assert.equal(l[0].endsAt, T0 + 3_600_000 + 500_000);
  // Resuming a running timer, or pausing a paused one, does nothing.
  assert.deepEqual(resume(l, 'a', T0), l);
  assert.deepEqual(pause(pause(l, 'a', T0 + 3_700_000), 'a', T0 + 3_800_000)[0].remaining, 400);
});

test('restart from running, paused or ringing goes back to the full time', () => {
  let l = start([], pasta, T0, 'a');
  l = tick(l, T0 + 600_000).list;
  assert.equal(l[0].status, 'ringing');
  l = restart(l, 'a', T0 + 700_000);
  assert.equal(l[0].status, 'running');
  assert.equal(l[0].endsAt, T0 + 700_000 + 600_000);
  assert.equal(l[0].finishedAt, null);
});

test('stop removes the timer; silence keeps it as done', () => {
  let l = start(start([], pasta, T0, 'a'), sauce, T0, 'b');
  assert.equal(stop(l, 'a').length, 1);
  l = tick(l, T0 + 300_000).list;
  assert.equal(silence(l, 'b').find((t) => t.id === 'b')!.status, 'done');
});

test('several timers run independently and finish in order', () => {
  let l = start(start([], pasta, T0, 'a'), sauce, T0 + 1_000, 'b');
  let r = tick(l, T0 + 301_000);
  assert.deepEqual(r.finished, [{ id: 'b', ring: true }]);
  l = r.list;
  assert.equal(l.find((t) => t.id === 'a')!.status, 'running');
  r = tick(l, T0 + 600_000);
  assert.deepEqual(r.finished, [{ id: 'a', ring: true }]);
  // Ticking again finishes nothing new.
  assert.deepEqual(tick(r.list, T0 + 700_000).finished, []);
});

test('the same timer restarts instead of duplicating; a 5th replaces a finished one', () => {
  let l = start([], pasta, T0, 'a');
  l = start(l, pasta, T0 + 5_000, 'ignored');
  assert.equal(l.length, 1);
  assert.equal(l[0].id, 'a');
  assert.equal(l[0].endsAt, T0 + 5_000 + 600_000);
  for (let i = 0; i < MAX_TIMERS - 1; i++) l = start(l, { ...pasta, step: 10 + i, total: 60 }, T0, `x${i}`);
  l = tick(l, T0 + 61_000).list; // the x timers finish
  l = start(l, { ...pasta, step: 99 }, T0 + 62_000, 'new');
  assert.equal(l.length, MAX_TIMERS);
  assert.ok(l.some((t) => t.id === 'new'));
  assert.ok(l.some((t) => t.id === 'a'), 'the running timer is kept');
});

test('app killed: restore from storage; a timer that ended while closed is done, not ringing again', () => {
  const saved = JSON.parse(JSON.stringify(start(start([], pasta, T0, 'a'), sauce, T0, 'b')));
  // Reopened 6 minutes later: sauce (5 min) ended a minute ago, pasta still running.
  const l = restore(saved, T0 + 360_000);
  assert.equal(l.find((t) => t.id === 'b')!.status, 'done');
  assert.equal(l.find((t) => t.id === 'a')!.status, 'running');
  assert.equal(secondsLeft(l.find((t) => t.id === 'a')!, T0 + 360_000), 240);
  // Reopened just after the end: it still rings in the app.
  const soon = restore(saved, T0 + 300_000 + 5_000);
  assert.equal(soon.find((t) => t.id === 'b')!.status, 'ringing');
  // A ringing timer from a previous run doesn't ring again.
  const ringingSaved = JSON.parse(JSON.stringify(tick(start([], sauce, T0, 'b'), T0 + 300_000).list));
  assert.equal(restore(ringingSaved, T0 + 301_000)[0].status, 'done');
});

test('restore ignores garbage', () => {
  assert.deepEqual(restore(null, T0), []);
  assert.deepEqual(restore('nope', T0), []);
  assert.deepEqual(restore([{ id: 1 }, { foo: 'bar' }], T0), []);
});

test('old finished timers are pruned after 3 hours', () => {
  const l = tick(start([], sauce, T0, 'b'), T0 + 300_000).list.map((t) => ({ ...t, status: 'done' as const }));
  assert.equal(prune(l, T0 + 300_000 + 3_600_000).length, 1);
  assert.equal(prune(l, T0 + 300_000 + 4 * 3_600_000).length, 0);
});

/* ---------------- alert plan ---------------- */

test('plan: start schedules a notification and starts a Live Activity', () => {
  const l = start([], pasta, T0, 'a');
  assert.deepEqual(kinds(planAlerts([], l)), ['activityStart', 'schedule']);
});

test('plan: pause cancels the notification and updates the activity; resume reschedules', () => {
  const a = start([], pasta, T0, 'a');
  const p = pause(a, 'a', T0 + 1000);
  assert.deepEqual(kinds(planAlerts(a, p)), ['activityUpdate', 'cancel']);
  const r = resume(p, 'a', T0 + 5000);
  const ops = planAlerts(p, r);
  assert.deepEqual(kinds(ops), ['activityUpdate', 'schedule']);
  const sched = ops.find((o) => o.kind === 'schedule') as { timer: CookTimer };
  assert.equal(sched.timer.endsAt, T0 + 5000 + 599_000);
});

test('plan: restart reschedules (one notification, new time); stop cancels and ends', () => {
  const a = start([], pasta, T0, 'a');
  const r = restart(a, 'a', T0 + 60_000);
  assert.deepEqual(kinds(planAlerts(a, r)), ['activityUpdate', 'schedule']);
  assert.deepEqual(kinds(planAlerts(r, stop(r, 'a'))), ['activityEnd', 'cancel']);
});

test('plan: finishing updates the activity to the alarm state; silencing ends it and clears the notification', () => {
  const a = start([], pasta, T0, 'a');
  const ringing = tick(a, T0 + 600_000).list;
  // Not cancelled at 0:00: the notification is firing right then (see timerPlan.ts).
  assert.deepEqual(kinds(planAlerts(a, ringing)), ['activityUpdate']);
  assert.deepEqual(kinds(planAlerts(ringing, silence(ringing, 'a'))), ['activityEnd', 'cancel']);
  assert.deepEqual(kinds(planAlerts(ringing, stop(ringing, 'a'))), ['activityEnd', 'cancel']);
});

test('plan: nothing changes, nothing happens', () => {
  const a = start([], pasta, T0, 'a');
  assert.deepEqual(planAlerts(a, a), []);
  assert.deepEqual(planAlerts(a, tick(a, T0 + 1000).list), []);
});

test('plan: two timers are handled separately', () => {
  const a = start([], pasta, T0, 'a');
  const ab = start(a, sauce, T0, 'b');
  const ops = planAlerts(a, ab);
  assert.ok(ops.every((o) => ('timer' in o ? o.timer.id : o.id) === 'b'));
  assert.deepEqual(kinds(planAlerts(ab, stop(ab, 'a'))), ['activityEnd', 'cancel']);
});
