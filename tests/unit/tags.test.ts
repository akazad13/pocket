import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTags, hasTag, calculateTagBreakdown, getUniqueTagsList } from '../../lib/tags';
import type { Expense } from '../../lib/expenses';

test('extractTags extracts single and multiple hashtags', () => {
  assert.deepEqual(extractTags('Lunch with team #office #work'), ['office', 'work']);
  assert.deepEqual(extractTags('#vacation Flight ticket'), ['vacation']);
  assert.deepEqual(extractTags('No tags here'), []);
  assert.deepEqual(extractTags(''), []);
  assert.deepEqual(extractTags(null), []);
  assert.deepEqual(extractTags(undefined), []);
});

test('extractTags handles case normalization, deduplication and Bangla script', () => {
  // Normalization and deduplication
  assert.deepEqual(extractTags('Trip #Holiday and more #holiday fun #HOLIDAY'), ['holiday']);
  // Bangla script
  assert.deepEqual(extractTags('ঈদ উপহার #ঈদ #উৎসব'), ['ঈদ', 'উৎসব']);
});

test('hasTag checks tag presence accurately', () => {
  const note = 'Hotel stay #summer2026 #vacation';
  assert.equal(hasTag(note, 'vacation'), true);
  assert.equal(hasTag(note, '#vacation'), true);
  assert.equal(hasTag(note, '#VACATION'), true);
  assert.equal(hasTag(note, 'winter'), false);
  assert.equal(hasTag('', 'vacation'), false);
  assert.equal(hasTag(undefined, 'vacation'), false);
});

test('calculateTagBreakdown aggregates expenses correctly', () => {
  const expenses: Expense[] = [
    { id: '1', cents: 10000, category: 'Food', date: '2026-10-01', note: 'Dinner #party', method: '', account: '' },
    { id: '2', cents: 5000, category: 'Transport', date: '2026-10-02', note: 'Uber #party #work', method: '', account: '' },
    { id: '3', cents: 20000, category: 'Shopping', date: '2026-10-03', note: 'Shirt #gift', method: '', account: '' },
    { id: '4', cents: 3000, category: 'Food', date: '2026-10-04', note: 'No tag', method: '', account: '' },
  ];

  const breakdown = calculateTagBreakdown(expenses);
  assert.equal(breakdown.uniqueTagsCount, 3);
  assert.equal(breakdown.totalTaggedCents, 35000); // 10000 + 5000 + 20000

  // #gift has 20000 cents
  // #party has 15000 cents (10000 + 5000)
  // #work has 5000 cents
  assert.equal(breakdown.items[0]?.tag, 'gift');
  assert.equal(breakdown.items[0]?.totalCents, 20000);
  assert.equal(breakdown.items[0]?.count, 1);

  assert.equal(breakdown.items[1]?.tag, 'party');
  assert.equal(breakdown.items[1]?.totalCents, 15000);
  assert.equal(breakdown.items[1]?.count, 2);
  assert.deepEqual(breakdown.items[1]?.categories, ['Food', 'Transport']);

  assert.equal(breakdown.items[2]?.tag, 'work');
  assert.equal(breakdown.items[2]?.totalCents, 5000);
});

test('getUniqueTagsList sorts tags by frequency', () => {
  const entries = [
    { note: '#tagA #tagB' },
    { note: '#tagA #tagC' },
    { note: '#tagA' },
  ];
  const list = getUniqueTagsList(entries);
  assert.equal(list[0], 'taga'); // 3 occurrences
  assert.equal(list.length, 3);
});
