import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSplitProgress, validateSplitExpense } from '../../lib/splits.ts';

test('calculateSplitProgress computes target, allocated, remaining and matches', () => {
  // With target, matching
  const p1 = calculateSplitProgress('100.00', [{ amount: '60' }, { amount: '40' }]);
  assert.equal(p1.targetCents, 10000);
  assert.equal(p1.allocatedCents, 10000);
  assert.equal(p1.remainingCents, 0);
  assert.equal(p1.isMatch, true);
  assert.equal(p1.canSave, true);

  // With target, remaining unallocated
  const p2 = calculateSplitProgress('150.00', [{ amount: '100' }]);
  assert.equal(p2.targetCents, 15000);
  assert.equal(p2.allocatedCents, 10000);
  assert.equal(p2.remainingCents, 5000);
  assert.equal(p2.isMatch, false);
  assert.equal(p2.canSave, false); // needs >= 2 splits and match

  // With target, over target
  const p3 = calculateSplitProgress('50', [{ amount: '30' }, { amount: '30' }]);
  assert.equal(p3.targetCents, 5000);
  assert.equal(p3.allocatedCents, 6000);
  assert.equal(p3.remainingCents, -1000);
  assert.equal(p3.isMatch, false);
  assert.equal(p3.canSave, false);

  // Without target, 2 valid items
  const p4 = calculateSplitProgress('', [{ amount: '25.50' }, { amount: '14.50' }]);
  assert.equal(p4.targetCents, null);
  assert.equal(p4.allocatedCents, 4000);
  assert.equal(p4.remainingCents, 0);
  assert.equal(p4.isMatch, true);
  assert.equal(p4.canSave, true);
});

test('validateSplitExpense normalises and validates valid split expenses', () => {
  const result = validateSplitExpense({
    date: '2026-10-11',
    method: 'Card',
    account: 'acc-123',
    memo: 'Shwapno weekly',
    splits: [
      { category: 'Groceries', amount: '1200.50', note: 'Veggies & rice' },
      { category: 'Treat', amount: '350.00', note: 'Chocolates' }
    ]
  }, ['Groceries', 'Treat']);

  assert.equal(result.totalCents, 155050);
  assert.equal(result.expenses.length, 2);

  assert.equal(result.expenses[0].category, 'Groceries');
  assert.equal(result.expenses[0].cents, 120050);
  assert.equal(result.expenses[0].date, '2026-10-11');
  assert.equal(result.expenses[0].method, 'Card');
  assert.equal(result.expenses[0].account, 'acc-123');
  assert.equal(result.expenses[0].note, 'Shwapno weekly: Veggies & rice');
  assert.ok(result.expenses[0].id.length > 0);

  assert.equal(result.expenses[1].category, 'Treat');
  assert.equal(result.expenses[1].cents, 35000);
  assert.equal(result.expenses[1].note, 'Shwapno weekly: Chocolates');
});

test('validateSplitExpense handles targetTotal matching and mismatch', () => {
  // Matching target
  const match = validateSplitExpense({
    date: '2026-10-11',
    targetTotal: '500.00',
    splits: [
      { category: 'Food', amount: '200' },
      { category: 'Utilities', amount: '300' }
    ]
  }, ['Food', 'Utilities']);
  assert.equal(match.totalCents, 50000);

  // Mismatched target throws
  assert.throws(() => {
    validateSplitExpense({
      date: '2026-10-11',
      targetTotal: '600.00',
      splits: [
        { category: 'Food', amount: '200' },
        { category: 'Utilities', amount: '300' }
      ]
    }, ['Food', 'Utilities']);
  }, /does not match the target receipt/);
});

test('validateSplitExpense rejects invalid payload and fields', () => {
  // Fewer than 2 splits
  assert.throws(() => {
    validateSplitExpense({
      date: '2026-10-11',
      splits: [{ category: 'Food', amount: '100' }]
    }, ['Food']);
  }, /Add at least two split items/);

  // Invalid date
  assert.throws(() => {
    validateSplitExpense({
      date: 'invalid-date',
      splits: [
        { category: 'Food', amount: '100' },
        { category: 'Treat', amount: '100' }
      ]
    }, ['Food', 'Treat']);
  }, /valid date/);

  // Invalid category
  assert.throws(() => {
    validateSplitExpense({
      date: '2026-10-11',
      splits: [
        { category: 'Nonexistent', amount: '100' },
        { category: 'Food', amount: '100' }
      ]
    }, ['Food']);
  }, /Choose a category/);

  // Negative amount
  assert.throws(() => {
    validateSplitExpense({
      date: '2026-10-11',
      splits: [
        { category: 'Food', amount: '-50' },
        { category: 'Food', amount: '100' }
      ]
    }, ['Food']);
  }, /positive amount/);
});

test('validateSplitExpense preserves given ids and handles memos properly', () => {
  const result = validateSplitExpense({
    originalId: 'exp-orig-999',
    date: '2026-10-11',
    memo: 'Agora',
    splits: [
      { id: 'custom-id-1', category: 'Food', amount: '50', note: '' },
      { id: 'custom-id-2', category: 'Utilities', amount: '75', note: 'Bill' }
    ]
  }, ['Food', 'Utilities']);

  assert.equal(result.originalId, 'exp-orig-999');
  assert.equal(result.expenses[0].id, 'custom-id-1');
  assert.equal(result.expenses[0].note, 'Agora');
  assert.equal(result.expenses[1].id, 'custom-id-2');
  assert.equal(result.expenses[1].note, 'Agora: Bill');
});
