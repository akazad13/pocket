import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../../lib/csv.ts';

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
