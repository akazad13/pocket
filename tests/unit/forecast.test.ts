import {test} from 'node:test';
import assert from 'node:assert/strict';
import {upcoming, forecastTotals} from '../../lib/forecast.ts';
import type {Rule} from '../../lib/rules.ts';
import type {Bill} from '../../lib/bills.ts';
import type {Account} from '../../lib/accounts.ts';

const rule = (patch: Partial<Rule>): Rule => ({id: 'r', kind: 'expense', category: 'Rent', source: '', account: '', toAccount: '', cents: 2000000, day: 1, note: '', startMonth: '2026-01', lastMonth: '2026-10', ...patch});
const bill = (patch: Partial<Bill>): Bill => ({id: 'b', name: 'Electricity', category: 'Utilities', cents: 0, day: 10, account: '', note: '', paidMonth: '', ...patch});
const acc = (id: string, type: Account['type'], patch: Partial<Account> = {}): Account => ({id, name: id, type, opening: 0, note: '', closed: false, startDate: '', maturityDate: '', rate: 0, instalment: 0, quantity: 0, unit: '', ...patch});
const today = '2026-10-06';

test('recurring rules: next occurrences inside the window only', () => {
  const list = upcoming({rules: [rule({}), rule({id: 's', kind: 'income', category: '', source: 'Salary', cents: 9000000, day: 25, lastMonth: '2026-09'})], bills: [], accounts: [], balanceOf: () => 0, today});
  assert.deepEqual(list.map((u) => [u.kind, u.date, u.sign]), [['income', '2026-10-25', 1], ['expense', '2026-11-01', -1]]);
});

test('bills: overdue first, paid ones only when next due falls in the window', () => {
  const list = upcoming({rules: [], bills: [bill({id: 'late', day: 3}), bill({id: 'paid', day: 2, paidMonth: '2026-10', cents: 50000}), bill({id: 'far', day: 28, paidMonth: '2026-10'})], accounts: [], balanceOf: () => 0, today});
  assert.deepEqual(list.map((u) => [u.key, u.overdue ?? false, u.cents]), [['b-late-2026-10-03', true, null], ['b-paid-2026-11-02', false, 50000]]);
});

test('loan EMIs unless a recurring transfer covers the loan; maturities as moves', () => {
  const loan = acc('loan', 'loan_taken', {startDate: '2025-01-15', instalment: 2000000, opening: 50000000});
  const fd = acc('fd', 'fd', {maturityDate: '2026-10-20', rate: 1200});
  const balanceOf = (a: Account) => (a.id === 'loan' ? 30000000 : 10000000);
  let list = upcoming({rules: [], bills: [], accounts: [loan, fd], balanceOf, today});
  assert.deepEqual(list.map((u) => [u.kind, u.date, u.cents, u.sign]), [['emi', '2026-10-15', 2000000, -1], ['maturity', '2026-10-20', 10000000, 0]]);
  list = upcoming({rules: [rule({kind: 'transfer', category: '', account: 'bank', toAccount: 'loan', day: 15, lastMonth: '2026-09'})], bills: [], accounts: [loan], balanceOf, today});
  assert.deepEqual(list.map((u) => u.kind), ['transfer'], 'the recurring transfer replaces the EMI estimate');
});

test('totals skip varying bills and moves between accounts', () => {
  const list = upcoming({rules: [rule({}), rule({id: 'i', kind: 'income', category: '', source: 'Salary', cents: 9000000, day: 25, lastMonth: '2026-09'}), rule({id: 't', kind: 'transfer', category: '', account: 'a', toAccount: 'b', cents: 500000, day: 7, lastMonth: '2026-09'})], bills: [bill({day: 9})], accounts: [], balanceOf: () => 0, today});
  assert.deepEqual(forecastTotals(list), {incoming: 9000000, outgoing: 2000000, net: 7000000, varies: 1});
});
