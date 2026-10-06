import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterExpenses,isFiltered,noFilters} from '../../lib/filter.ts';
import type {Expense} from '../../lib/expenses.ts';

const items: Expense[] = [
  {id: 'a', category: 'Food', cents: 15000, date: '2026-01-10', note: 'Lunch with team', method: 'bKash', account: ''},
  {id: 'b', category: 'Rent', cents: 2500000, date: '2026-02-01', note: '', method: 'Bank transfer', account: ''},
  {id: 'c', category: 'Food', cents: 999, date: '2026-03-05', note: 'snack', method: 'Cash', account: ''},
  {id: 'd', category: 'Transport', cents: 25050, date: '2025-12-31', note: 'CNG', method: '', account: ''},
];
const ids = (f: Partial<typeof noFilters>) => filterExpenses(items, {...noFilters, ...f}).map((e) => e.id);

test('no filters returns everything newest first', () => {
  assert.deepEqual(ids({}), ['c', 'b', 'a', 'd']);
});
test('text matches category or note, case-insensitive', () => {
  assert.deepEqual(ids({text: 'FOOD'}), ['c', 'a']);
  assert.deepEqual(ids({text: 'team'}), ['a']);
  assert.deepEqual(ids({text: '  cng '}), ['d']);
});
test('category is an exact match', () => {
  assert.deepEqual(ids({category: 'Food'}), ['c', 'a']);
  assert.deepEqual(ids({category: 'Foo'}), []);
});
test('date range is inclusive at both ends', () => {
  assert.deepEqual(ids({from: '2026-01-10', to: '2026-02-01'}), ['b', 'a']);
  assert.deepEqual(ids({to: '2025-12-31'}), ['d']);
});
test('amount range compares in cents without float errors', () => {
  assert.deepEqual(ids({min: '150'}), ['b', 'a', 'd']);
  assert.deepEqual(ids({min: '250.50', max: '250.50'}), ['d']);
  assert.deepEqual(ids({max: '9.99'}), ['c']);
});
test('blank or invalid amounts are ignored', () => {
  assert.deepEqual(ids({min: ' ', max: 'abc'}), ['c', 'b', 'a', 'd']);
});
test('method is an exact match and searchable', () => {
  assert.deepEqual(ids({method: 'Cash'}), ['c']);
  assert.deepEqual(ids({text: 'bkash'}), ['a']);
});
test('filters combine', () => {
  assert.deepEqual(ids({category: 'Food', min: '100', text: 'lunch'}), ['a']);
});
test('isFiltered ignores whitespace', () => {
  assert.equal(isFiltered(noFilters), false);
  assert.equal(isFiltered({...noFilters, text: '  '}), false);
  assert.equal(isFiltered({...noFilters, min: '1'}), true);
});
