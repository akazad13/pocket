import {test} from 'node:test';
import assert from 'node:assert/strict';
import {taxYearOf, taxYearLabel, taxYearRange, taxYearSummary} from '../../lib/taxyear.ts';
import type {Account} from '../../lib/accounts.ts';

const acc = (id: string, type: Account['type']): Account => ({id, name: id, type, opening: 0, note: '', closed: false, startDate: '', maturityDate: '', rate: 0, instalment: 0, quantity: 0, unit: ''});

test('tax year boundaries are 1 July to 30 June', () => {
  assert.equal(taxYearOf('2026-06-30'), 2025);
  assert.equal(taxYearOf('2026-07-01'), 2026);
  assert.equal(taxYearLabel(2025), '2025-26');
  assert.equal(taxYearLabel(2099), '2099-00');
  assert.deepEqual(taxYearRange(2025), {from: '2025-07-01', to: '2026-06-30'});
});

test('summary: income by source, tax paid, deposits into investments only from outside', () => {
  const accounts = [acc('bank', 'bank'), acc('dps', 'dps'), acc('sp', 'sanchayapatra'), acc('fd', 'fd')];
  const s = taxYearSummary(2025,
    [{id: 'e1', category: 'Tax', cents: 500000, date: '2025-11-30', note: '', method: '', account: ''}, {id: 'e2', category: 'Food', cents: 1000, date: '2026-01-01', note: '', method: '', account: ''}, {id: 'e3', category: 'Taxi', cents: 999, date: '2026-01-01', note: '', method: '', account: ''}, {id: 'old', category: 'Tax', cents: 7, date: '2025-06-30', note: '', method: '', account: ''}],
    [{id: 'i1', source: 'Salary', cents: 9000000, date: '2025-07-01', note: '', account: ''}, {id: 'i2', source: 'Salary', cents: 9000000, date: '2026-06-30', note: '', account: ''}, {id: 'i3', source: 'Interest', cents: 40000, date: '2026-03-01', note: '', account: ''}, {id: 'i4', source: 'Salary', cents: 1, date: '2026-07-01', note: '', account: ''}],
    [{id: 't1', from: 'bank', to: 'dps', cents: 500000, date: '2025-08-12', note: ''}, {id: 't2', from: 'bank', to: 'sp', cents: 50000000, date: '2026-02-01', note: ''}, {id: 't3', from: 'fd', to: 'dps', cents: 999, date: '2026-02-01', note: ''}, {id: 't4', from: 'dps', to: 'bank', cents: 1, date: '2026-02-01', note: ''}],
    accounts);
  assert.equal(s.label, '2025-26');
  assert.deepEqual(s.incomeBySource, [{name: 'Salary', cents: 18000000}, {name: 'Interest', cents: 40000}]);
  assert.equal(s.incomeTotal, 18040000);
  assert.equal(s.spentTotal, 501999);
  assert.equal(s.taxPaid, 500000, 'Taxi is not Tax; June 2025 is the previous year');
  assert.deepEqual(s.investments.map((x) => [x.name, x.cents]), [['sp', 50000000], ['dps', 500000]], 'moves between investments are not new investment');
  assert.equal(s.investedTotal, 50500000);
});
