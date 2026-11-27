import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centerCrop, foodCrop, isLowResolution, sharperFrameUrl } from '../src/lib/crop.ts';

test('centerCrop: 4:3 and 1:1 from portrait, landscape and square pictures, centered', () => {
  // A TikTok thumbnail (portrait 9:16).
  assert.deepEqual(centerCrop(720, 1280, 4 / 3), { originX: 0, originY: 370, width: 720, height: 540 });
  assert.deepEqual(centerCrop(720, 1280, 1), { originX: 0, originY: 280, width: 720, height: 720 });
  // A YouTube thumbnail (16:9).
  assert.deepEqual(centerCrop(1280, 720, 4 / 3), { originX: 160, originY: 0, width: 960, height: 720 });
  assert.deepEqual(centerCrop(1280, 720, 1), { originX: 280, originY: 0, width: 720, height: 720 });
  // Already 4:3.
  assert.deepEqual(centerCrop(1600, 1200, 4 / 3), { originX: 0, originY: 0, width: 1600, height: 1200 });
});

test('card crop: 4:3 part of the photo, zoom and drag stay inside it', async () => {
  const { cardCrop, dragCrop } = await import('../src/lib/crop.ts');
  // A tall TikTok cover (9:16): full width, a 4:3 band in the middle.
  const tall = cardCrop(9 / 16, 1);
  assert.equal(tall.w, 1);
  assert.equal(tall.h, 0.4219);
  assert.equal(tall.x, 0);
  assert.ok(Math.abs(tall.y - (1 - tall.h) / 2) < 0.001);
  // A wide photo (16:9): full height.
  assert.deepEqual(cardCrop(16 / 9, 1), { x: 0.125, y: 0, w: 0.75, h: 1 });
  // Zoom 2×: half the size; never outside the photo.
  const z = cardCrop(16 / 9, 2, 0, 0);
  assert.deepEqual(z, { x: 0, y: 0, w: 0.375, h: 0.5 });
  // Dragging the photo down shows more of its top; it stops at the edge.
  const up = dragCrop(tall, 0, 1000, 300);
  assert.equal(up.y, 0);
  const down = dragCrop(tall, 0, -1000, 300);
  assert.equal(down.y, Math.round((1 - tall.h) * 10000) / 10000);
});

test('foodCrop: 4:5, zoomed in a little and just below the middle on tall video frames', () => {
  const r = foodCrop(720, 1280);
  assert.equal(Math.round((r.width / r.height) * 100) / 100, 0.8);
  assert.ok(r.width < 720, 'zoomed in on a tall frame');
  assert.ok(r.originY + r.height / 2 > 640, 'centred just below the middle');
  assert.ok(r.originY >= 0 && r.originY + r.height <= 1280 && r.originX >= 0 && r.originX + r.width <= 720);
});

test('foodCrop: a landscape photo keeps the full height, centred', () => {
  const r = foodCrop(1600, 1200);
  assert.equal(r.height, 1200);
  assert.equal(r.width, 960);
  assert.equal(r.originX, 320);
});

test('isLowResolution and sharperFrameUrl', () => {
  assert.equal(isLowResolution(320, 180), true);
  assert.equal(isLowResolution(1280, 720), false);
  assert.equal(sharperFrameUrl('https://i.ytimg.com/vi/abc_DEF-123/hqdefault.jpg'), 'https://i.ytimg.com/vi/abc_DEF-123/maxresdefault.jpg');
  assert.equal(sharperFrameUrl('https://p16.tiktokcdn.com/x.jpg'), null);
});
