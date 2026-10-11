import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyBurn, calculateWellnessScore } from '../../lib/wellness';
import type { Expense } from '../../lib/expenses';
import type { Income } from '../../lib/income';
import type { Account, Transfer, Adjustment } from '../../lib/accounts';

test('calculateMonthlyBurn computes average across recent months', () => {
  const expenses: Expense[] = [
    { id: '1', category: 'Food', cents: 10000, date: '2026-08-15', note: '', method: '', account: '' },
    { id: '2', category: 'Rent', cents: 20000, date: '2026-09-01', note: '', method: '', account: '' },
    { id: '3', category: 'Food', cents: 30000, date: '2026-10-10', note: '', method: '', account: '' },
    { id: '4', category: 'Food', cents: 50000, date: '2026-11-01', note: '', method: '', account: '' }, // future
  ];

  // For 2026-10, it considers 2026-08, 2026-09, 2026-10: (10000 + 20000 + 30000) / 3 = 20000
  const burn = calculateMonthlyBurn(expenses, '2026-10');
  assert.equal(burn, 20000);

  // Empty expenses returns 0
  assert.equal(calculateMonthlyBurn([], '2026-10'), 0);
});

test('calculateWellnessScore awards high score for strong financial profile', () => {
  const expenses: Expense[] = [
    { id: 'e1', category: 'Groceries', cents: 10000, date: '2026-10-05', note: '', method: '', account: 'a1' },
    { id: 'e2', category: 'Rent', cents: 20000, date: '2026-10-06', note: '', method: '', account: 'a1' }
  ];

  const income: Income[] = [
    { id: 'i1', source: 'Salary', cents: 100000, date: '2026-10-01', note: '', account: 'a1' }
  ];

  // Total spent = 30000, earned = 100000 -> Savings rate = 70%
  const accounts: Account[] = [
    {
      id: 'a1',
      name: 'City Bank',
      type: 'bank',
      opening: 500000, // 500,000 cents liquid = 5000 BDT
      note: '',
      closed: false,
      startDate: '',
      maturityDate: '',
      rate: 0,
      instalment: 0,
      quantity: 0,
      unit: ''
    }
  ];

  const transfers: Transfer[] = [];
  const adjustments: Adjustment[] = [];
  const budgets: Record<string, number> = {
    Groceries: 15000,
    Rent: 25000
  };

  const report = calculateWellnessScore({
    expenses,
    income,
    accounts,
    transfers,
    adjustments,
    budgets,
    month: '2026-10'
  });

  assert.ok(report.score >= 80, `Expected high score, got ${report.score}`);
  assert.ok(['A+', 'A'].includes(report.grade));
  assert.equal(report.metrics.savingsRatePercent, 70);
  assert.ok(report.pillars.length === 5);
  assert.equal(report.pillars.find(p => p.id === 'savings')?.status, 'excellent');
  assert.equal(report.pillars.find(p => p.id === 'debt')?.status, 'excellent');
});

test('calculateWellnessScore identifies high debt and low runway risks', () => {
  const expenses: Expense[] = [
    { id: 'e1', category: 'Groceries', cents: 60000, date: '2026-10-05', note: '', method: '', account: 'a1' }
  ];

  const income: Income[] = [
    { id: 'i1', source: 'Salary', cents: 50000, date: '2026-10-01', note: '', account: 'a1' }
  ];

  // Expenses > income (deficit). High debt. Very low liquid cash.
  const accounts: Account[] = [
    {
      id: 'a1',
      name: 'Wallet',
      type: 'wallet',
      opening: 1000, // tiny liquid balance
      note: '',
      closed: false,
      startDate: '',
      maturityDate: '',
      rate: 0,
      instalment: 0,
      quantity: 0,
      unit: ''
    },
    {
      id: 'd1',
      name: 'Credit Card',
      type: 'credit_card',
      opening: 200000, // large debt
      note: '',
      closed: false,
      startDate: '',
      maturityDate: '',
      rate: 0,
      instalment: 0,
      quantity: 0,
      unit: ''
    }
  ];

  const report = calculateWellnessScore({
    expenses,
    income,
    accounts,
    transfers: [],
    adjustments: [],
    budgets: { Groceries: 40000 }, // over budget
    month: '2026-10'
  });

  assert.ok(report.score <= 45, `Expected low score for deficit and debt, got ${report.score}`);
  assert.ok(['C', 'D'].includes(report.grade));
  assert.ok(report.recommendations.length > 0);
});

test('calculateWellnessScore handles empty or initial state gracefully', () => {
  const report = calculateWellnessScore({
    expenses: [],
    income: [],
    accounts: [],
    transfers: [],
    adjustments: [],
    budgets: {},
    month: '2026-10'
  });

  assert.ok(Number.isFinite(report.score));
  assert.ok(report.score >= 0 && report.score <= 100);
  assert.equal(report.pillars.length, 5);
  assert.ok(report.recommendations.length > 0);
});
