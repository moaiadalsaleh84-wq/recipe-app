import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centerCrop } from '../src/lib/crop.ts';

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
