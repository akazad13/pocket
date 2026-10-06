import {test} from 'node:test';
import assert from 'node:assert/strict';
import {netWorthSeries, lastMonths} from '../../lib/networth.ts';
import type {Account} from '../../lib/accounts.ts';

const acc = (id: string, type: Account['type'], opening: number): Account => ({id, name: id, type, opening, note: '', closed: false, startDate: '', maturityDate: '', rate: 0, instalment: 0, quantity: 0, unit: ''});

test('lastMonths crosses year boundaries', () => {
  assert.deepEqual(lastMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02']);
});

test('net worth at each month end uses entries dated up to that day', () => {
  const accounts = [acc('bank', 'bank', 10000), acc('loan', 'loan_taken', 50000)];
  const s = netWorthSeries(accounts,
    [{id: 'e', category: 'Food', cents: 2000, date: '2026-09-30', note: '', method: '', account: 'bank'}],
    [{id: 'i', source: 'Salary', cents: 30000, date: '2026-10-01', note: '', account: 'bank'}],
    [{id: 't', from: 'bank', to: 'loan', cents: 5000, date: '2026-10-15', note: ''}],
    [{id: 'j', account: 'bank', cents: 100, date: '2026-11-02', note: ''}],
    ['2026-08', '2026-09', '2026-10', '2026-11']);
  assert.deepEqual(s.map((x) => x.net), [-40000, -42000, -12000, -11900]);
  assert.deepEqual([s[2].assets, s[2].debts], [33000, 45000], 'an EMI moves money out of assets and lowers what is owed');
});
