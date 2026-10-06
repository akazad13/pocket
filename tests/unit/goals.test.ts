import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateGoal, goalProgress, type Goal} from '../../lib/goals.ts';

const goal = (patch: Partial<Goal>): Goal => ({id: 'g', name: 'Hajj', target: 100000000, targetDate: '', accounts: [], saved: 0, note: '', ...patch});

test('validateGoal normalises and rejects bad input', () => {
  const g = validateGoal({id: 'g1', name: '  Emergency   fund ', target: '300000', targetDate: '2027-06-30', accounts: ['a', 'a', 'b'], saved: '500'});
  assert.deepEqual(g, {id: 'g1', name: 'Emergency fund', target: 30000000, targetDate: '2027-06-30', accounts: ['a', 'b'], saved: 0, note: ''}, 'saved is ignored when accounts are linked');
  assert.equal(validateGoal({id: 'g', name: 'Laptop', target: '150000', saved: '20000.5'}).saved, 2000050);
  for (const bad of [{name: ''}, {target: '0'}, {targetDate: '2027-02-30'}, {accounts: 'a'}, {accounts: ['bad id']}, {saved: '-1'}, {note: 'n'.repeat(201)}]) {
    assert.throws(() => validateGoal({id: 'g', name: 'X', target: '10', ...bad}), Error, JSON.stringify(bad));
  }
});

test('goalProgress from linked accounts, ignoring missing ones and negative balances', () => {
  const bal: Record<string, number> = {a: 30000000, b: 10000000, od: -500};
  const p = goalProgress(goal({accounts: ['a', 'b', 'gone', 'od'], targetDate: '2027-04-06'}), (id) => bal[id] ?? null, '2026-10-06');
  assert.deepEqual(p, {current: 40000000, left: 60000000, pct: 40, done: false, monthsLeft: 6, perMonth: 10000000, late: false});
});

test('goalProgress from a manual amount, done, late and undated goals', () => {
  assert.equal(goalProgress(goal({saved: 100000000}), () => null, '2026-10-06').done, true);
  const late = goalProgress(goal({saved: 1, targetDate: '2026-01-01'}), () => null, '2026-10-06');
  assert.deepEqual([late.late, late.monthsLeft, late.perMonth], [true, 0, null]);
  const open = goalProgress(goal({saved: 25000000}), () => null, '2026-10-06');
  assert.deepEqual([open.pct, open.monthsLeft, open.perMonth], [25, null, null]);
  assert.equal(goalProgress(goal({saved: 1, targetDate: '2026-10-20'}), () => null, '2026-10-06').monthsLeft, 1, 'less than a month left still counts as one');
  assert.equal(goalProgress(goal({target: 60000000, saved: 0, targetDate: '2027-01-06'}), () => null, '2026-10-06').perMonth, 20000000);
  assert.equal(goalProgress(goal({target: 10000001, saved: 0, targetDate: '2026-11-06'}), () => null, '2026-10-06').perMonth, 10000100, 'rounded up to whole taka');
});
