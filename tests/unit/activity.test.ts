import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activity, flows} from '../../lib/activity.ts';
import {noFilters} from '../../lib/filter.ts';
import type {Expense} from '../../lib/expenses.ts';
import type {Income} from '../../lib/income.ts';
import type {Transfer} from '../../lib/accounts.ts';

const expenses: Expense[] = [
  {id: 'e1', category: 'Food', cents: 500, date: '2026-10-03', note: 'lunch', method: 'Cash', account: 'cash'},
  {id: 'e2', category: 'Rent', cents: 20000, date: '2026-10-01', note: '', method: '', account: 'bank'},
];
const income: Income[] = [{id: 'i1', source: 'Salary', cents: 90000, date: '2026-10-02', note: 'October', account: 'bank'}];
const transfers: Transfer[] = [{id: 't1', from: 'bank', to: 'cash', cents: 3000, date: '2026-10-04', note: 'ATM'}];
const names = {bank: 'City Bank', cash: 'Wallet cash'};

test('all kinds merged newest first', () => {
  assert.deepEqual(activity(expenses, income, transfers, names, noFilters, 'all').map((e) => e.id), ['t1', 'e1', 'i1', 'e2']);
});
test('kind narrows the list', () => {
  assert.deepEqual(activity(expenses, income, transfers, names, noFilters, 'income').map((e) => e.id), ['i1']);
  assert.deepEqual(activity(expenses, income, transfers, names, noFilters, 'transfer').map((e) => e.id), ['t1']);
  assert.deepEqual(activity(expenses, income, transfers, names, noFilters, 'expense').map((e) => e.id), ['e1', 'e2']);
});
test('text searches account names, sources and notes', () => {
  const f = (text: string) => activity(expenses, income, transfers, names, {...noFilters, text}, 'all').map((e) => e.id);
  assert.deepEqual(f('city bank'), ['t1', 'i1', 'e2']);
  assert.deepEqual(f('atm'), ['t1']);
  assert.deepEqual(f('salary'), ['i1']);
});
test('category or method filters show spending only; amount and date apply to all', () => {
  assert.deepEqual(activity(expenses, income, transfers, names, {...noFilters, category: 'Food'}, 'all').map((e) => e.id), ['e1']);
  assert.deepEqual(activity(expenses, income, transfers, names, {...noFilters, min: '30', max: '900'}, 'all').map((e) => e.id), ['t1', 'i1', 'e2']);
  assert.deepEqual(activity(expenses, income, transfers, names, {...noFilters, from: '2026-10-02', to: '2026-10-03'}, 'all').map((e) => e.id), ['e1', 'i1']);
});
test('flows add up each kind', () => {
  assert.deepEqual(flows(activity(expenses, income, transfers, names, noFilters, 'all')), {spent: 20500, earned: 90000, moved: 3000});
});
