import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAccount,
  calculateAverageMonthlyBurn,
  calculateAssetAllocation
} from '../../lib/asset-allocation';
import type {Account} from '../../lib/accounts';
import type {Expense} from '../../lib/expenses';

const makeAccount = (id: string, name: string, type: any, opening: number = 0, closed = false): Account => ({
  id,
  name,
  type,
  opening,
  note: '',
  closed,
  startDate: '2026-01-01',
  maturityDate: '',
  rate: 0,
  instalment: 0,
  quantity: 0,
  unit: ''
});

test('classifyAccount classifies account types correctly', () => {
  assert.equal(classifyAccount('cash'), 'liquid');
  assert.equal(classifyAccount('bank'), 'liquid');
  assert.equal(classifyAccount('wallet'), 'liquid');
  assert.equal(classifyAccount('dps'), 'savings');
  assert.equal(classifyAccount('fd'), 'savings');
  assert.equal(classifyAccount('sanchayapatra'), 'savings');
  assert.equal(classifyAccount('shares'), 'equities');
  assert.equal(classifyAccount('mutual_fund'), 'equities');
  assert.equal(classifyAccount('gold'), 'real_assets');
  assert.equal(classifyAccount('property'), 'real_assets');
  assert.equal(classifyAccount('loan_given'), 'other');
  assert.equal(classifyAccount('other'), 'other');
  assert.equal(classifyAccount('credit_card'), 'debt');
  assert.equal(classifyAccount('loan_taken'), 'debt');
});

test('calculateAverageMonthlyBurn computes recent monthly average', () => {
  const items: Pick<Expense, 'cents' | 'date'>[] = [
    { cents: 300000, date: '2026-08-05' }, // 3,000 BDT in Aug
    { cents: 200000, date: '2026-08-20' }, // 2,000 BDT in Aug -> 5,000 BDT
    { cents: 400000, date: '2026-09-10' }, // 4,000 BDT in Sep
    { cents: 600000, date: '2026-10-02' }  // 6,000 BDT in Oct
  ];

  // Avg of 3 months: (5000 + 4000 + 6000) / 3 = 5,000 BDT = 500000 cents
  const burn = calculateAverageMonthlyBurn(items, '2026-10');
  assert.equal(burn, 500000);

  // Empty items
  assert.equal(calculateAverageMonthlyBurn([], '2026-10'), 0);
});

test('calculateAssetAllocation computes full breakdown and metrics', () => {
  const accounts: Account[] = [
    makeAccount('a1', 'Wallet', 'wallet'),
    makeAccount('a2', 'City Bank', 'bank'),
    makeAccount('a3', 'Brac DPS', 'dps'),
    makeAccount('a4', 'Beximco Shares', 'shares'),
    makeAccount('a5', 'Gold Coin', 'gold'),
    makeAccount('a6', 'Credit Card', 'credit_card'),
    makeAccount('a7', 'Old Bank', 'bank', 0, true) // Closed account should be ignored
  ];

  const values: Record<string, number> = {
    a1: 50000,    // 500 BDT
    a2: 150000,   // 1,500 BDT -> Liquid total = 2,000 BDT (200,000 cents)
    a3: 300000,   // 3,000 BDT -> Savings = 3,000 BDT (300,000 cents)
    a4: 300000,   // 3,000 BDT -> Equities = 3,000 BDT (300,000 cents)
    a5: 200000,   // 2,000 BDT -> Real Assets = 2,000 BDT (200,000 cents)
    a6: -100000,  // -1,000 BDT (Debt shown = 100,000 cents)
    a7: 999999    // Closed
  };

  // Total Assets = 200,000 + 300,000 + 300,000 + 200,000 = 1,000,000 cents (10,000 BDT)
  // Total Debts = 100,000 cents (1,000 BDT)
  // Net Worth = 900,000 cents (9,000 BDT)
  // Debt to Asset = 100,000 / 1,000,000 = 10.0%

  const items: Pick<Expense, 'cents' | 'date'>[] = [
    { cents: 100000, date: '2026-10-01' } // 1,000 BDT monthly burn
  ];

  const report = calculateAssetAllocation(accounts, values, items, '2026-10');

  assert.equal(report.totalAssetsCents, 1000000);
  assert.equal(report.totalDebtsCents, 100000);
  assert.equal(report.netWorthCents, 900000);
  assert.equal(report.debtToAssetRatio, 10.0);
  assert.equal(report.liquidCents, 200000);
  assert.equal(report.monthlyBurnCents, 100000);
  assert.equal(report.emergencyRunwayMonths, 2.0);
  assert.equal(report.runwayRating, 'vulnerable');

  // Verify categories
  const liquid = report.categories.find(c => c.category === 'liquid')!;
  assert.equal(liquid.cents, 200000);
  assert.equal(liquid.percentage, 20.0);
  assert.equal(liquid.accountCount, 2);

  const savings = report.categories.find(c => c.category === 'savings')!;
  assert.equal(savings.cents, 300000);
  assert.equal(savings.percentage, 30.0);

  const equities = report.categories.find(c => c.category === 'equities')!;
  assert.equal(equities.cents, 300000);
  assert.equal(equities.percentage, 30.0);

  const realAssets = report.categories.find(c => c.category === 'real_assets')!;
  assert.equal(realAssets.cents, 200000);
  assert.equal(realAssets.percentage, 20.0);
});

test('calculateAssetAllocation handles zero assets gracefully', () => {
  const report = calculateAssetAllocation([], {});
  assert.equal(report.totalAssetsCents, 0);
  assert.equal(report.totalDebtsCents, 0);
  assert.equal(report.debtToAssetRatio, 0);
  assert.equal(report.emergencyRunwayMonths, 0);
});
