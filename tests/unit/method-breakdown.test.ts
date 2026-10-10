import { test } from 'node:test';
import assert from 'node:assert/strict';
import { methodBreakdown } from '../../lib/method-breakdown.ts';
import type { Expense } from '../../lib/expenses.ts';

const exp = (cents: number, method = ''): Expense => ({
  id: '1',
  category: 'Food',
  cents,
  date: '2026-10-01',
  note: '',
  method,
  account: '',
});

test('methodBreakdown aggregates by payment method and calculates percentages', () => {
  const items: Expense[] = [
    exp(50000, 'bKash'),
    exp(30000, 'Cash'),
    exp(20000, 'bKash'),
  ];
  const res = methodBreakdown(items);
  assert.equal(res.length, 2);
  assert.equal(res[0].method, 'bKash');
  assert.equal(res[0].cents, 70000);
  assert.equal(res[0].pct, 70);
  assert.equal(res[0].count, 2);

  assert.equal(res[1].method, 'Cash');
  assert.equal(res[1].cents, 30000);
  assert.equal(res[1].pct, 30);
  assert.equal(res[1].count, 1);
});

test('methodBreakdown labels blank methods as Unspecified', () => {
  const items: Expense[] = [
    exp(4000, ''),
    exp(6000, 'Card'),
  ];
  const res = methodBreakdown(items);
  assert.equal(res.length, 2);
  assert.equal(res[0].method, 'Card');
  assert.equal(res[0].pct, 60);
  assert.equal(res[1].method, 'Unspecified');
  assert.equal(res[1].pct, 40);
});

test('methodBreakdown returns empty array when total is 0 or empty', () => {
  assert.deepEqual(methodBreakdown([]), []);
  assert.deepEqual(methodBreakdown([exp(0, 'Cash')]), []);
});
