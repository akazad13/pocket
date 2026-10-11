import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateMedian, detectSpendingAnomalies} from '../../lib/anomaly';
import type {Expense} from '../../lib/expenses';

test('calculateMedian computes median accurately for odd and even counts', () => {
  assert.equal(calculateMedian([100, 200, 300]), 200);
  assert.equal(calculateMedian([100, 200, 300, 400]), 250);
  assert.equal(calculateMedian([500]), 500);
  assert.equal(calculateMedian([]), 0);
  assert.equal(calculateMedian([400, 100, 300, 200, 500]), 300); // Unsorted input
});

test('detectSpendingAnomalies flags high multiples above category median', () => {
  const allItems: Expense[] = [
    // Historical baseline for "Dining" (median = 50,000 cents = 500 BDT)
    { id: '1', date: '2026-08-01', cents: 45000, category: 'Dining', note: 'Lunch', method: 'Cash', account: '' },
    { id: '2', date: '2026-08-15', cents: 50000, category: 'Dining', note: 'Dinner', method: 'Cash', account: '' },
    { id: '3', date: '2026-09-02', cents: 55000, category: 'Dining', note: 'Burger', method: 'Cash', account: '' },

    // Normal Dining in October (500 BDT)
    { id: '4', date: '2026-10-05', cents: 50000, category: 'Dining', note: 'Cafe', method: 'Cash', account: '' },

    // Huge Dining Spike in October: 2,500 BDT (250,000 cents) = 5.0x median
    { id: '5', date: '2026-10-14', cents: 250000, category: 'Dining', note: 'Fine dining banquet', method: 'Card', account: '' },

    // Small expense with large multiple (e.g. 50 BDT tea vs 10 BDT tea)
    // Should NOT be flagged because < minAbsoluteCents (150,000 cents)
    { id: '6', date: '2026-08-05', cents: 1000, category: 'Tea', note: '', method: '', account: '' },
    { id: '7', date: '2026-08-10', cents: 1000, category: 'Tea', note: '', method: '', account: '' },
    { id: '8', date: '2026-09-01', cents: 1000, category: 'Tea', note: '', method: '', account: '' },
    { id: '9', date: '2026-10-18', cents: 5000, category: 'Tea', note: 'Fancy tea', method: '', account: '' }
  ];

  const report = detectSpendingAnomalies(allItems, '2026-10');

  assert.equal(report.month, '2026-10');
  assert.equal(report.anomalies.length, 1);

  const spike = report.anomalies[0];
  assert.equal(spike.id, '5');
  assert.equal(spike.category, 'Dining');
  assert.equal(spike.cents, 250000);
  assert.equal(spike.multiplier, 5.0);
  assert.equal(spike.categoryMedianCents, 50000);
  assert.equal(spike.severity, 'high');
  assert.equal(spike.excessCents, 200000);
});

test('detectSpendingAnomalies ignores categories with insufficient history', () => {
  const allItems: Expense[] = [
    // Only 2 items in "Gadgets" (below minCategoryHistoryCount = 3)
    { id: 'g1', date: '2026-09-01', cents: 100000, category: 'Gadgets', note: 'Earphones', method: '', account: '' },
    { id: 'g2', date: '2026-10-05', cents: 5000000, category: 'Gadgets', note: 'Laptop', method: '', account: '' }
  ];

  const report = detectSpendingAnomalies(allItems, '2026-10');
  assert.equal(report.anomalies.length, 0);
});
