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
