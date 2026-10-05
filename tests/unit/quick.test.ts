import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quickPicks} from '../../lib/quick.ts';
import type {Expense} from '../../lib/expenses.ts';

let n = 0;
const e = (category: string, cents: number, date: string, note = '', method = ''): Expense => ({id: String(n++), category, cents, date, note, method});

test('ranks by frequency, then recency, and merges same category+amount+note', () => {
  const picks = quickPicks([
    e('Milk', 9000, '2026-10-01'), e('Milk', 9000, '2026-10-03'), e('Milk', 9000, '2026-10-05', '', 'Cash'),
    e('Transport', 5000, '2026-10-02', 'CNG'), e('Transport', 5000, '2026-10-04', 'cng'),
    e('Food', 30000, '2026-10-06', 'Lunch'),
  ], '2026-10-06');
  assert.deepEqual(picks.map((p) => [p.category, p.cents, p.count]), [['Milk', 9000, 3], ['Transport', 5000, 2], ['Food', 30000, 1]]);
  assert.equal(picks[0].method, 'Cash', 'uses the latest method');
  assert.equal(picks[1].note, 'cng', 'uses the latest note spelling');
});
test('ignores entries older than the window or in the future', () => {
  const picks = quickPicks([e('Rent', 1, '2026-07-01'), e('Gift', 1, '2026-10-07'), e('Milk', 1, '2026-08-08')], '2026-10-06');
  assert.deepEqual(picks.map((p) => p.category), ['Milk']);
});
test('respects the limit', () => {
  const items = Array.from({length: 10}, (_, i) => e(`C${i}`, i + 1, '2026-10-01'));
  assert.equal(quickPicks(items, '2026-10-06', 3).length, 3);
  assert.deepEqual(quickPicks([], '2026-10-06'), []);
});
