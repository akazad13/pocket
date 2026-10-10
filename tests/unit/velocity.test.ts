import test from 'node:test';
import assert from 'node:assert/strict';
import { getDaysInMonth, calculateVelocity } from '../../lib/velocity.ts';

test('getDaysInMonth handles 30, 31 and leap years correctly', () => {
  assert.equal(getDaysInMonth(2026, 10), 31); // October
  assert.equal(getDaysInMonth(2026, 9), 30);  // September
  assert.equal(getDaysInMonth(2024, 2), 29);  // Leap Feb
  assert.equal(getDaysInMonth(2025, 2), 28);  // Normal Feb
});

test('calculateVelocity computes current month pace and projections', () => {
  // Oct 2026 (31 days). Today is 10th. Spent 15,000 BDT (1,500,000 cents).
  const report = calculateVelocity({
    month: '2026-10',
    today: '2026-10-10',
    spentCents: 1500000,
    previousMonthSpentCents: 4000000, // 40,000 BDT last month
    totalBudgetCents: 5000000,        // 50,000 BDT budget
  });

  assert.equal(report.isCurrentMonth, true);
  assert.equal(report.totalDays, 31);
  assert.equal(report.daysElapsed, 10);
  assert.equal(report.daysRemaining, 21);
  assert.equal(report.monthProgressPct, 32); // 10/31 ~ 32%

  // Daily rate: 1,500,000 / 10 = 150,000 cents (৳1,500/day)
  assert.equal(report.dailyRateCents, 150000);

  // Projected month end: 150,000 * 31 = 4,650,000 cents (৳46,500)
  assert.equal(report.projectedTotalCents, 4650000);

  // Projected vs previous: 4,650,000 - 4,000,000 = +650,000 (+16%)
  assert.equal(report.projectedVsPreviousCents, 650000);
  assert.equal(report.projectedVsPreviousPct, 16);

  // Budget tracking: 4,650,000 <= 5,000,000 -> On track!
  assert.equal(report.isOnTrackWithBudget, true);
  assert.equal(report.projectedVsBudgetCents, -350000); // 3,500 under budget

  // Safe daily allowance for remaining 21 days: (5,000,000 - 1,500,000) / 21 = 3,500,000 / 21 = 166,666 cents (৳1,666/day)
  assert.equal(report.safeDailyAllowanceCents, 166666);
});

test('calculateVelocity detects over-budget pace', () => {
  // Oct 2026. Day 10. Spent 25,000 BDT with budget 50,000 BDT.
  // Daily rate = 2,500 BDT. Projected = 77,500 BDT (> 50,000 BDT budget)
  const report = calculateVelocity({
    month: '2026-10',
    today: '2026-10-10',
    spentCents: 2500000,
    totalBudgetCents: 5000000,
  });

  assert.equal(report.isOnTrackWithBudget, false);
  assert.equal(report.projectedVsBudgetCents, 2750000); // 27,500 over budget
  // Safe daily allowance to stay within budget: (5,000,000 - 2,500,000) / 21 = 2,500,000 / 21 = 119,047 cents
  assert.equal(report.safeDailyAllowanceCents, 119047);
});

test('calculateVelocity handles past months as completed', () => {
  const report = calculateVelocity({
    month: '2026-08',
    today: '2026-10-10',
    spentCents: 3100000, // 31,000 BDT in August (31 days)
  });

  assert.equal(report.isPastMonth, true);
  assert.equal(report.daysElapsed, 31);
  assert.equal(report.daysRemaining, 0);
  assert.equal(report.projectedTotalCents, 3100000);
  assert.equal(report.dailyRateCents, 100000); // 1,000/day
});

test('calculateVelocity handles future months', () => {
  const report = calculateVelocity({
    month: '2026-12',
    today: '2026-10-10',
    spentCents: 0,
  });

  assert.equal(report.isFutureMonth, true);
  assert.equal(report.daysElapsed, 0);
  assert.equal(report.daysRemaining, 31);
  assert.equal(report.projectedTotalCents, 0);
  assert.equal(report.dailyRateCents, 0);
});
