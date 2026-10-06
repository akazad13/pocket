import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAccount, validateTransfer, validateAdjustment, values, shown, totals, adjustmentFor, type Account} from '../../lib/accounts.ts';

const acc = (id: string, type: Account['type'], opening: number): Account => ({id, name: id, type, opening, note: '', closed: false});
const cash = acc('cash', 'cash', 10000), bank = acc('bank', 'bank', 500000), loan = acc('loan', 'loan_taken', 1000000), card = acc('card', 'credit_card', 0);
const all = [cash, bank, loan, card];

test('validateAccount normalises name, opening and closed', () => {
  const a = validateAccount({id: 'a1', name: '  City   Bank ', type: 'bank', opening: '1500.5', note: ' salary ', closed: true});
  assert.deepEqual(a, {id: 'a1', name: 'City Bank', type: 'bank', opening: 150050, note: 'salary', closed: true});
  assert.equal(validateAccount({id: 'a1', name: 'Cash', type: 'cash'}).opening, 0);
  assert.equal(validateAccount({id: 'a1', name: 'Cash', type: 'cash', opening: '0'}).opening, 0);
  for (const bad of [{name: ''}, {name: 'x'.repeat(51)}, {type: 'crypto'}, {opening: '-5'}, {opening: '1.234'}, {note: 'n'.repeat(201)}, {id: 'bad id'}]) {
    assert.throws(() => validateAccount({id: 'a1', name: 'Cash', type: 'cash', ...bad}), Error, JSON.stringify(bad));
  }
});

test('validateTransfer needs two different accounts and a positive amount', () => {
  assert.deepEqual(validateTransfer({id: 't', from: 'bank', to: 'cash', amount: '200', date: '2026-10-01', note: ''}), {id: 't', from: 'bank', to: 'cash', cents: 20000, date: '2026-10-01', note: ''});
  assert.throws(() => validateTransfer({id: 't', from: 'bank', to: 'bank', amount: '1', date: '2026-10-01'}), /different/);
  assert.throws(() => validateTransfer({id: 't', from: 'bank', to: 'cash', amount: '0', date: '2026-10-01'}));
  assert.throws(() => validateTransfer({id: 't', from: 'bank', to: 'cash', amount: '1', date: '2026-02-30'}));
});

test('validateAdjustment accepts signed amounts but not zero', () => {
  assert.equal(validateAdjustment({id: 'j', account: 'bank', amount: '-12.5', date: '2026-10-01'}).cents, -1250);
  assert.equal(validateAdjustment({id: 'j', account: 'bank', amount: '7', date: '2026-10-01'}).cents, 700);
  assert.throws(() => validateAdjustment({id: 'j', account: 'bank', amount: '0', date: '2026-10-01'}));
  assert.throws(() => validateAdjustment({id: 'j', account: 'bank', amount: '--1', date: '2026-10-01'}));
});

test('values combine opening, income, expenses, transfers and adjustments', () => {
  const v = values(all,
    [{account: 'cash', cents: 2500}, {account: 'card', cents: 4000}, {account: '', cents: 999}, {account: 'gone', cents: 1}],
    [{account: 'bank', cents: 300000}],
    [{id: 't1', from: 'bank', to: 'cash', cents: 5000, date: '2026-10-01', note: ''}, {id: 't2', from: 'bank', to: 'loan', cents: 100000, date: '2026-10-02', note: 'EMI'}],
    [{id: 'j1', account: 'bank', cents: 1234, date: '2026-10-03', note: 'interest'}]);
  assert.deepEqual(v, {cash: 12500, bank: 696234, loan: -900000, card: -4000});
  assert.equal(shown(loan, v.loan), 900000, 'EMI lowers the amount owed');
  assert.equal(shown(card, v.card), 4000, 'card spending raises the amount owed');
  assert.deepEqual(totals(all, v), {assets: 708734, debts: 904000, net: -195266});
});

test('adjustmentFor moves the shown balance to the target', () => {
  assert.equal(adjustmentFor(bank, 500000, 512345), '123.45');
  assert.equal(adjustmentFor(bank, 500000, 400000), '-1000.00');
  assert.equal(adjustmentFor(loan, 1000000, 900000), '1000.00', 'owing less raises net worth');
  assert.equal(adjustmentFor(cash, 100, 100), '');
});
