import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVirtualSlice } from '../../lib/virtual.ts';

test('calculateVirtualSlice computes initial slice at top of viewport', () => {
  // 1000 items, each 60px height, viewport 600px (10 visible), overscan 5
  const res = calculateVirtualSlice({
    totalCount: 1000,
    itemHeight: 60,
    offsetY: 0,
    viewportHeight: 600,
    overscan: 5,
  });

  assert.equal(res.totalHeight, 60000);
  assert.equal(res.startIndex, 0); // 0 - 5 clamped to 0
  assert.equal(res.endIndex, 15); // 10 + 5 = 15
  assert.equal(res.topPadding, 0);
  assert.equal(res.bottomPadding, (1000 - 15) * 60);
  assert.equal(res.visibleCount, 15);
});

test('calculateVirtualSlice calculates slice midway through list', () => {
  // Scrolled down 3000px (= item index 50)
  const res = calculateVirtualSlice({
    totalCount: 1000,
    itemHeight: 60,
    offsetY: 3000,
    viewportHeight: 600,
    overscan: 5,
  });

  // rawStart = 50, rawEnd = 60
  // startIndex = 50 - 5 = 45
  // endIndex = 60 + 5 = 65
  assert.equal(res.startIndex, 45);
  assert.equal(res.endIndex, 65);
  assert.equal(res.topPadding, 45 * 60);
  assert.equal(res.bottomPadding, (1000 - 65) * 60);
  assert.equal(res.visibleCount, 20);
});

test('calculateVirtualSlice clamps to end of list without overflowing', () => {
  // Scrolled all the way to bottom: total height 60,000px
  const res = calculateVirtualSlice({
    totalCount: 1000,
    itemHeight: 60,
    offsetY: 59500,
    viewportHeight: 600,
    overscan: 10,
  });

  assert.equal(res.endIndex, 1000);
  assert.equal(res.bottomPadding, 0);
  assert.ok(res.startIndex <= 1000);
  assert.ok(res.topPadding <= 60000);
});

test('calculateVirtualSlice handles zero or negative counts gracefully', () => {
  const res = calculateVirtualSlice({
    totalCount: 0,
    itemHeight: 60,
    offsetY: 0,
    viewportHeight: 600,
  });

  assert.equal(res.startIndex, 0);
  assert.equal(res.endIndex, 0);
  assert.equal(res.topPadding, 0);
  assert.equal(res.bottomPadding, 0);
  assert.equal(res.visibleCount, 0);
});
