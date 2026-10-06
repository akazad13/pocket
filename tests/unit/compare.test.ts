import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareMonths} from '../../lib/compare.ts';
import {prevMonth} from '../../lib/months.ts';
import type {Expense} from '../../lib/expenses.ts';

const e = (category: string, cents: number, date: string): Expense => ({id: `${category}${date}${cents}`, category, cents, date, note: '', method: '', account: ''});

test('prevMonth rolls back over the year', () => {
  assert.equal(prevMonth('2026-10'), '2026-09');
  assert.equal(prevMonth('2026-01'), '2025-12');
});
test('compares totals and categories with the previous month only', () => {
  const r = compareMonths([
    e('Food', 10000, '2026-10-01'), e('Food', 5000, '2026-10-20'), e('Food', 10000, '2026-09-03'),
    e('Rent', 50000, '2026-09-01'),
    e('Gift', 2000, '2026-10-05'),
    e('Food', 99999, '2026-08-01'),
  ], '2026-10');
  assert.equal(r.previousMonth, '2026-09');
  assert.deepEqual(r.total, {current: 17000, previous: 60000, delta: -43000, pct: -72});
  assert.deepEqual(r.rows.map((x) => [x.name, x.delta, x.pct]), [['Rent', -50000, -100], ['Food', 5000, 50], ['Gift', 2000, null]]);
});
test('January compares with the previous December', () => {
  const r = compareMonths([e('Food', 100, '2025-12-31'), e('Food', 300, '2026-01-01')], '2026-01');
  assert.deepEqual(r.total, {current: 300, previous: 100, delta: 200, pct: 200});
});
test('empty months give zero totals and no rows', () => {
  const r = compareMonths([], '2026-10');
  assert.deepEqual(r.total, {current: 0, previous: 0, delta: 0, pct: null});
  assert.equal(r.rows.length, 0);
});
