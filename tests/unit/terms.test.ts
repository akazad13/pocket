import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthsBetween, maturity, upcomingMaturities, ratePct, loanInfo} from '../../lib/terms.ts';
import type {Account} from '../../lib/accounts.ts';

const acc = (patch: Partial<Account>): Account => ({id: 'a', name: 'a', type: 'fd', opening: 0, note: '', closed: false, startDate: '', maturityDate: '', rate: 0, instalment: 0, ...patch});

test('monthsBetween counts whole months', () => {
  assert.equal(monthsBetween('2026-10-06', '2027-10-06'), 12);
  assert.equal(monthsBetween('2026-10-06', '2027-10-05'), 11);
  assert.equal(monthsBetween('2026-10-31', '2026-11-30'), 0);
  assert.equal(monthsBetween('2027-01-01', '2026-01-01'), 0);
});

test('FD: simple interest to maturity', () => {
  const m = maturity(acc({type: 'fd', maturityDate: '2027-10-06', rate: 1000}), 10000000, '2026-10-06');
  assert.deepEqual(m, {date: '2027-10-06', monthsLeft: 12, expected: 11000000, monthlyProfit: null});
});

test('DPS: balance compounds and remaining instalments are added', () => {
  const m = maturity(acc({type: 'dps', maturityDate: '2026-12-06', rate: 1200, instalment: 100000}), 1000000, '2026-10-06')!;
  // i = 1% a month, n = 2: 1,000,000*1.0201 + 100,000*2.01
  assert.equal(m.expected, 1020100 + 201000);
  assert.equal(maturity(acc({type: 'dps', maturityDate: '2026-12-06', instalment: 100000}), 1000000, '2026-10-06')!.expected, 1200000, 'zero rate just adds instalments');
});

test('Sanchayapatra: principal back, monthly profit', () => {
  const m = maturity(acc({type: 'sanchayapatra', maturityDate: '2031-10-06', rate: 1152}), 50000000, '2026-10-06')!;
  assert.equal(m.expected, 50000000);
  assert.equal(m.monthlyProfit, 480000);
});

test('no maturity for other types, unset dates, or past dates count as due', () => {
  assert.equal(maturity(acc({type: 'bank', maturityDate: '2027-01-01'}), 1, '2026-10-06'), null);
  assert.equal(maturity(acc({type: 'fd'}), 1, '2026-10-06'), null);
  assert.equal(maturity(acc({type: 'fd', maturityDate: '2026-01-01', rate: 1000}), 500, '2026-10-06')!.monthsLeft, 0);
});

test('upcomingMaturities: open savings accounts, soonest first, past ones dropped', () => {
  const list = upcomingMaturities([
    acc({id: 'later', maturityDate: '2028-01-01'}),
    acc({id: 'soon', type: 'dps', maturityDate: '2026-12-01'}),
    acc({id: 'past', maturityDate: '2026-01-01'}),
    acc({id: 'closed', maturityDate: '2027-01-01', closed: true}),
    acc({id: 'bank', type: 'bank', maturityDate: '2027-01-01'}),
  ], () => 100, '2026-10-06');
  assert.deepEqual(list.map((x) => x.account.id), ['soon', 'later']);
});

test('ratePct', () => {
  assert.equal(ratePct(950), '9.5%');
  assert.equal(ratePct(1152), '11.52%');
  assert.equal(ratePct(0), '');
});

test('loanInfo: interest split, payoff and next due', () => {
  const loan = acc({type: 'loan_taken', opening: 100000000, startDate: '2025-03-10', maturityDate: '2030-03-10', rate: 1200, instalment: 2224445});
  const l = loanInfo(loan, 80000000, '2026-10-06')!;
  assert.equal(l.monthlyInterest, 800000);
  assert.equal(l.interestPart, 800000);
  assert.equal(l.principalPart, 1424445);
  assert.equal(l.nextDue, '2026-10-10');
  assert.equal(l.repaid, 0.2);
  assert.equal(l.covers, true);
  assert.equal(l.monthsToPayoff, 45, '-ln(1 - 0.01*800000/22244.45)/ln(1.01) = 44.8');
  assert.equal(l.payoffMonth, '2030-06');
  assert.equal(l.scheduledMonths, 42);
  assert.equal(loanInfo(loan, 80000000, '2026-10-11')!.nextDue, '2026-11-10', 'after this month’s day it moves to next month');
});
test('loanInfo: zero rate, uncovered interest, paid off, other types', () => {
  assert.equal(loanInfo(acc({type: 'loan_given', instalment: 1000}), 2500, '2026-10-06')!.monthsToPayoff, 3);
  const short = loanInfo(acc({type: 'loan_taken', rate: 2400, instalment: 1000}), 100000, '2026-10-06')!;
  assert.equal(short.covers, false);
  assert.equal(short.monthsToPayoff, null);
  const done = loanInfo(acc({type: 'loan_taken', instalment: 1000, startDate: '2025-01-01'}), 0, '2026-10-06')!;
  assert.deepEqual([done.monthsToPayoff, done.payoffMonth, done.nextDue], [0, null, null]);
  assert.equal(loanInfo(acc({type: 'dps'}), 1, '2026-10-06'), null);
});
