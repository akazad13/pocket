import {test} from 'node:test';
import assert from 'node:assert/strict';
import {yearReport} from '../../lib/yearly.ts';
import type {Expense} from '../../lib/expenses.ts';
import type {Income} from '../../lib/income.ts';

let n = 0;
const e = (category: string, cents: number, date: string): Expense => ({id: String(n++), category, cents, date, note: '', method: ''});
const items = [
  e('Rent', 2000000, '2026-01-01'), e('Rent', 2000000, '2026-02-01'), e('Food', 500000, '2026-02-10'),
  e('Food', 300000, '2026-10-03'), e('Tax', 1000000, '2026-06-30'),
  e('Rent', 1800000, '2025-12-01'), e('Food', 99, '2027-01-01'),
];
const income: Income[] = [{id: 'i', source: 'Salary', cents: 9000000, date: '2026-03-01', note: ''}];

test('totals, previous year change and category shares', () => {
  const r = yearReport(items, income, '2026', '2026-10-06');
  assert.equal(r.total, 5800000);
  assert.equal(r.prevTotal, 1800000);
  assert.equal(r.change, 222);
  assert.deepEqual(r.byCategory.map((c) => [c.name, c.share]), [['Rent', 69], ['Tax', 17.2], ['Food', 13.8]]);
});
test('average counts from the first month with spending to this month (current year) or December', () => {
  assert.equal(yearReport(items, [], '2026', '2026-10-06').average, 580000);
  assert.equal(yearReport(items, [], '2025', '2026-10-06').average, 1800000);
  assert.equal(yearReport([e('A', 600, '2026-08-05')], [], '2026', '2026-10-06').monthsCounted, 3);
  assert.equal(yearReport([e('A', 1200, '2025-03-05')], [], '2025', '2026-10-06').monthsCounted, 10);
  assert.equal(yearReport(items, [], '2027', '2026-10-06').monthsCounted, 0);
});
test('biggest and quietest months ignore empty months', () => {
  const r = yearReport(items, [], '2026', '2026-10-06');
  assert.deepEqual(r.biggest, {month: '2026-02', cents: 2500000});
  assert.deepEqual(r.quietest, {month: '2026-10', cents: 300000});
  assert.equal(yearReport([e('A', 1, '2026-05-01')], [], '2026', '2026-10-06').quietest, null);
});
test('largest expenses and income/saved', () => {
  const r = yearReport(items, income, '2026', '2026-10-06');
  assert.deepEqual(r.largest.map((x) => x.date), ['2026-02-01', '2026-01-01', '2026-06-30', '2026-02-10', '2026-10-03']);
  assert.equal(r.income, 9000000);
  assert.equal(r.saved, 3200000);
});
test('empty year', () => {
  const r = yearReport([], [], '2026', '2026-10-06');
  assert.equal(r.total, 0); assert.equal(r.change, null); assert.equal(r.biggest, null); assert.deepEqual(r.byCategory, []);
});
