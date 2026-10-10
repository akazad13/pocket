import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBudgetHistory, getRecentMonths } from '../../lib/budget-history.ts';
import type { Expense } from '../../lib/expenses.ts';

const exp = (category: string, cents: number, date: string): Expense => ({
  id: crypto.randomUUID(),
  category,
  cents,
  date,
  note: '',
  method: '',
  account: '',
});

test('getRecentMonths generates consecutive past months including current', () => {
  const months = getRecentMonths('2026-10', 4);
  assert.deepEqual(months, ['2026-07', '2026-08', '2026-09', '2026-10']);
});

test('getRecentMonths correctly rolls over year boundaries', () => {
  const months = getRecentMonths('2026-02', 3);
  assert.deepEqual(months, ['2025-12', '2026-01', '2026-02']);
});

test('buildBudgetHistory computes adherence rates, averages, and streaks', () => {
  const items: Expense[] = [
    // Groceries: budget 10,000 (1,000,000 cents)
    exp('Groceries', 800000, '2026-08-10'), // Under
    exp('Groceries', 1200000, '2026-09-12'), // Over
    exp('Groceries', 900000, '2026-10-05'), // Under

    // Utilities: budget 5,000 (500,000 cents)
    exp('Utilities', 450000, '2026-08-01'), // Under
    exp('Utilities', 400000, '2026-09-01'), // Under
    exp('Utilities', 420000, '2026-10-01'), // Under
  ];

  const budgets = {
    Groceries: 1000000,
    Utilities: 500000,
  };

  const history = buildBudgetHistory(items, budgets, '2026-10', 3);

  assert.equal(history.totalMonthsAnalyzed, 3);
  assert.equal(history.categories.length, 2);

  // Groceries: 2 under out of 3 = 67%
  const groc = history.categories.find(c => c.category === 'Groceries')!;
  assert.equal(groc.adherenceRate, 67);
  assert.equal(groc.monthsUnder, 2);
  assert.equal(groc.monthsOver, 1);
  assert.equal(groc.currentStreak, 1); // 2026-10 was under

  // Utilities: 3 under out of 3 = 100%
  const util = history.categories.find(c => c.category === 'Utilities')!;
  assert.equal(util.adherenceRate, 100);
  assert.equal(util.monthsUnder, 3);
  assert.equal(util.monthsOver, 0);
  assert.equal(util.currentStreak, 3); // 3 consecutive under

  // Overall: 5 under out of 6 category-months = 83%
  assert.equal(history.overallAdherenceRate, 83);
});

test('buildBudgetHistory handles zero budget or empty items', () => {
  const history = buildBudgetHistory([], { Rent: 2000000 }, '2026-10', 3);
  assert.equal(history.categories.length, 1);
  const rent = history.categories[0];
  assert.equal(rent.monthsUnder, 3);
  assert.equal(rent.adherenceRate, 100);
  assert.equal(rent.averageSpentCents, 0);
  assert.equal(rent.currentStreak, 3);
});
