import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, entriesToCsv } from '../../lib/csv.ts';
import type { Entry } from '../../lib/activity.ts';

test('toCsv quotes cells and escapes existing double quotes', () => {
  const rows = [
    ['Date', 'Category', 'Note'],
    ['2026-10-01', 'Food', 'Dinner "Special"'],
  ];
  const csv = toCsv(rows);
  assert.equal(csv, '"Date","Category","Note"\r\n"2026-10-01","Food","Dinner ""Special"""');
});

test('toCsv prefixes formula characters to prevent formula injection', () => {
  const rows = [
    ['Safe', '=SUM(1,2)', '+123', '-456', '@admin'],
  ];
  const csv = toCsv(rows);
  assert.equal(csv, '"Safe","\'=SUM(1,2)","\'+123","\'-456","\'@admin"');
});

test('toCsv handles numbers and blank values', () => {
  const rows = [
    ['Category', 'Amount', 'Account'],
    ['Groceries', 250.75, ''],
  ];
  const csv = toCsv(rows);
  assert.equal(csv, '"Category","Amount","Account"\r\n"Groceries","250.75",""');
});

test('entriesToCsv exports expenses, income and transfers with summary totals', () => {
  const entries: Entry[] = [
    {
      kind: 'expense',
      id: 'e1',
      date: '2026-10-05',
      cents: 15000,
      item: { id: 'e1', cents: 15000, category: 'Utilities', date: '2026-10-05', note: 'Electricity', method: 'bKash', account: 'acc1' },
    },
    {
      kind: 'income',
      id: 'i1',
      date: '2026-10-01',
      cents: 50000,
      item: { id: 'i1', cents: 50000, source: 'Salary', date: '2026-10-01', note: 'Monthly pay', account: 'acc1' },
    },
    {
      kind: 'transfer',
      id: 't1',
      date: '2026-10-02',
      cents: 10000,
      item: { id: 't1', cents: 10000, date: '2026-10-02', from: 'acc1', to: 'acc2', note: 'Savings transfer' },
    },
  ];

  const names = { acc1: 'City Bank', acc2: 'DPS Account' };
  const csv = entriesToCsv(entries, names);

  // Check header exists
  assert.ok(csv.includes('"Date","Type","Category / Details","Amount (BDT)","Account","Payment Method","Note"'));

  // Check rows
  assert.ok(csv.includes('"2026-10-05","Expense","Utilities","150.00","City Bank","bKash","Electricity"'));
  assert.ok(csv.includes('"2026-10-01","Income","Salary","500.00","City Bank","","Monthly pay"'));
  assert.ok(csv.includes('"2026-10-02","Transfer","City Bank -> DPS Account","100.00","City Bank","","Savings transfer"'));

  // Check summary lines
  assert.ok(csv.includes('"Total Spent","","","150.00"'));
  assert.ok(csv.includes('"Total Earned","","","500.00"'));
  assert.ok(csv.includes('"Total Transferred","","","100.00"'));
  assert.ok(csv.includes('"Net Flow (Earned - Spent)","","","350.00"'));
});
