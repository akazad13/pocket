import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, csvToBackup } from '../../lib/csv-import.ts';

test('parseCsv handles standard commas and quoted cells', () => {
  const input = 'Date,Category,Amount\n2026-10-01,"Food, Drink",150.50\n2026-10-02,Transport,50';
  const rows = parseCsv(input);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['Date', 'Category', 'Amount']);
  assert.deepEqual(rows[1], ['2026-10-01', 'Food, Drink', '150.50']);
  assert.deepEqual(rows[2], ['2026-10-02', 'Transport', '50']);
});

test('csvToBackup auto-detects headers and produces valid backup format', () => {
  const csv = `Date,Category,Amount (BDT),Paid with,Note
2026-10-05,Utilities,1200.00,bKash,Electricity bill
06/10/2026,Groceries,450.75,Cash,Weekly market`;

  const backup = csvToBackup(csv);
  assert.equal(backup.app, 'pocket');
  assert.equal(backup.version, 1);
  assert.equal(backup.expenses.length, 2);

  assert.equal(backup.expenses[0].date, '2026-10-05');
  assert.equal(backup.expenses[0].category, 'Utilities');
  assert.equal(backup.expenses[0].cents, 120000);
  assert.equal(backup.expenses[0].method, 'bKash');
  assert.equal(backup.expenses[0].note, 'Electricity bill');

  assert.equal(backup.expenses[1].date, '2026-10-06');
  assert.equal(backup.expenses[1].category, 'Groceries');
  assert.equal(backup.expenses[1].cents, 45075);
  assert.equal(backup.expenses[1].method, 'Cash');
});

test('csvToBackup rejects empty or header-only CSV with friendly error', () => {
  assert.throws(() => csvToBackup(''), /CSV file is empty/);
  assert.throws(() => csvToBackup('Date,Category,Amount\n'), /No valid expense rows found/);
});
