import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBill, billStatus, sortBills, type Bill} from '../../lib/bills.ts';

const bill = (patch: Partial<Bill>): Bill => ({id: 'b', name: 'Electricity', category: 'Utilities', cents: 0, day: 10, account: '', note: '', paidMonth: '', ...patch});

test('validateBill', () => {
  assert.deepEqual(validateBill({id: 'b1', name: ' DESCO  bill ', category: 'Utilities', amount: '', day: 15, account: 'bank'}, ['Utilities']),
    {id: 'b1', name: 'DESCO bill', category: 'Utilities', cents: 0, day: 15, account: 'bank', note: '', paidMonth: ''});
  assert.equal(validateBill({id: 'b', name: 'Net', category: 'Internet', amount: '1200', day: 1, paidMonth: '2026-10'}, ['Internet']).cents, 120000);
  for (const bad of [{name: ''}, {category: 'Nope'}, {amount: '-1'}, {day: 0}, {day: 32}, {paidMonth: '2026-13'}, {account: 'bad id'}]) {
    assert.throws(() => validateBill({id: 'b', name: 'X', category: 'Utilities', day: 5, ...bad}, ['Utilities']), Error, JSON.stringify(bad));
  }
});

test('billStatus: overdue, due soon, upcoming and paid', () => {
  assert.deepEqual(billStatus(bill({day: 3}), '2026-10-06'), {state: 'overdue', due: '2026-10-03', days: -3});
  assert.deepEqual(billStatus(bill({day: 10}), '2026-10-06'), {state: 'soon', due: '2026-10-10', days: 4});
  assert.deepEqual(billStatus(bill({day: 25}), '2026-10-06'), {state: 'upcoming', due: '2026-10-25', days: 19});
  assert.deepEqual(billStatus(bill({day: 31, paidMonth: '2026-10'}), '2026-10-06'), {state: 'paid', due: '2026-11-30', days: 55});
  assert.equal(billStatus(bill({day: 3, paidMonth: '2026-09'}), '2026-10-06').state, 'overdue', 'last month paid does not cover this month');
});

test('sortBills puts overdue first, then by due date', () => {
  const list = sortBills([bill({id: 'paid', day: 1, paidMonth: '2026-10'}), bill({id: 'later', day: 28}), bill({id: 'late', day: 2}), bill({id: 'soon', day: 8})], '2026-10-06');
  assert.deepEqual(list.map((x) => x.bill.id), ['late', 'soon', 'later', 'paid']);
});
