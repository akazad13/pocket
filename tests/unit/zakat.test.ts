import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zakat, nisabFrom, dueWithinYear, countedByDefault} from '../../lib/zakat.ts';
import type {Account} from '../../lib/accounts.ts';

const acc = (id: string, type: Account['type'], patch: Partial<Account> = {}): Account => ({id, name: id, type, opening: 0, note: '', closed: false, startDate: '', maturityDate: '', rate: 0, instalment: 0, quantity: 0, unit: '', ...patch});
const accounts = [acc('bank', 'bank'), acc('gold', 'gold'), acc('flat', 'property'), acc('lent', 'loan_given'), acc('card', 'credit_card'), acc('home', 'loan_taken', {instalment: 2000000}), acc('od', 'bank')];
const balances: Record<string, number> = {bank: 50000000, gold: 140000000, flat: 900000000, lent: 5000000, card: 3000000, home: 100000000, od: -1000000};
const shown = (a: Account) => balances[a.id];
const byDefault = (a: Account) => countedByDefault(a.type);

test('default inclusion counts money, gold and money lent but not property', () => {
  assert.deepEqual(accounts.filter(byDefault).map((a) => a.id), ['bank', 'gold', 'lent', 'od']);
});

test('nisab from the price per vori', () => {
  assert.equal(nisabFrom('silver', 200000), 10500000);
  assert.equal(nisabFrom('gold', 11850000), 88875000);
});

test('debts due within a year: whole card, 12 EMIs of a loan', () => {
  assert.equal(dueWithinYear(accounts[4], 3000000), 3000000);
  assert.equal(dueWithinYear(accounts[5], 100000000), 24000000);
  assert.equal(dueWithinYear(acc('x', 'loan_taken'), 7000), 7000, 'no EMI: the whole loan');
  assert.equal(dueWithinYear(accounts[0], 500), 0);
});

test('zakat: 2.5% of assets minus debts when above nisab; negative balances count as zero', () => {
  const r = zakat(accounts, shown, byDefault, true, 10500000);
  assert.equal(r.assets, 195000000);
  assert.equal(r.debts, 27000000);
  assert.equal(r.net, 168000000);
  assert.equal(r.due, 4200000);
  assert.equal(zakat(accounts, shown, byDefault, false, 10500000).due, 4875000);
});

test('below nisab or no nisab set means nothing due', () => {
  assert.equal(zakat(accounts, shown, byDefault, true, 200000000).due, 0);
  assert.equal(zakat(accounts, shown, byDefault, true, 0).aboveNisab, false);
});
