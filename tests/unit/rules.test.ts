import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dueMonths, dueRows, validateRule, ruleTitle, type Rule} from '../../lib/rules.ts';

const rule = (patch: Partial<Rule>): Rule => ({id: 'r', kind: 'expense', category: 'Rent', source: '', account: '', toAccount: '', cents: 100, day: 31, note: 'n', startMonth: '2026-01', lastMonth: null, ...patch});

test('dueMonths clamps the day and stops at today', () => {
  assert.deepEqual(dueMonths(rule({}), '2026-03-15').map((m) => m.date), ['2026-01-31', '2026-02-28']);
  assert.deepEqual(dueMonths(rule({lastMonth: '2026-02'}), '2026-03-31').map((m) => m.date), ['2026-03-31']);
  assert.deepEqual(dueMonths(rule({startMonth: '2026-05'}), '2026-03-31'), []);
});

test('dueRows builds expenses, income and transfers with deterministic ids', () => {
  const rows = dueRows([
    rule({id: 'e', day: 1, account: 'cash'}),
    rule({id: 'i', kind: 'income', category: '', source: 'Salary', account: 'bank', day: 1, cents: 9000}),
    rule({id: 't', kind: 'transfer', category: '', account: 'bank', toAccount: 'dps', day: 5, cents: 500}),
  ], '2026-02-03');
  assert.deepEqual(rows.expenses.map((e) => [e.id, e.date, e.account]), [['rec-e-2026-01', '2026-01-01', 'cash'], ['rec-e-2026-02', '2026-02-01', 'cash']]);
  assert.deepEqual(rows.income.map((e) => [e.id, e.source, e.account, e.cents]), [['rec-i-2026-01', 'Salary', 'bank', 9000], ['rec-i-2026-02', 'Salary', 'bank', 9000]]);
  assert.deepEqual(rows.transfers.map((t) => [t.id, t.from, t.to, t.date]), [['rec-t-2026-01', 'bank', 'dps', '2026-01-05']], 'Feb 5th is not due yet');
  assert.deepEqual(rows.advanced, [{id: 'e', m: '2026-02'}, {id: 'i', m: '2026-02'}, {id: 't', m: '2026-01'}]);
});

test('validateRule per kind', () => {
  const base = {id: 'r1', amount: '10', day: 1, note: '', startMonth: '2026-01'};
  assert.equal(validateRule({...base, category: 'Rent'}, ['Rent']).kind, 'expense', 'kind defaults to expense for older clients and backups');
  assert.throws(() => validateRule({...base, category: 'Nope'}, ['Rent']), /category/);
  assert.deepEqual(validateRule({...base, kind: 'income', source: '  Salary  ', account: 'bank', category: 'ignored'}, []), {id: 'r1', kind: 'income', category: '', source: 'Salary', account: 'bank', toAccount: '', cents: 1000, day: 1, note: '', startMonth: '2026-01'});
  assert.throws(() => validateRule({...base, kind: 'income', source: ' '}, []), /source/);
  assert.equal(validateRule({...base, kind: 'transfer', account: 'a', toAccount: 'b'}, []).toAccount, 'b');
  assert.throws(() => validateRule({...base, kind: 'transfer', account: 'a'}, []), /both/);
  assert.throws(() => validateRule({...base, kind: 'transfer', account: 'a', toAccount: 'a'}, []), /different/);
  assert.throws(() => validateRule({...base, kind: 'gift'}, []), /expense, income or transfer/);
});

test('ruleTitle', () => {
  const name = (id: string) => id.toUpperCase();
  assert.equal(ruleTitle(rule({}), name), 'Rent');
  assert.equal(ruleTitle(rule({kind: 'income', source: 'Salary'}), name), 'Salary');
  assert.equal(ruleTitle(rule({kind: 'transfer', account: 'bank', toAccount: 'dps'}), name), 'BANK → DPS');
});
