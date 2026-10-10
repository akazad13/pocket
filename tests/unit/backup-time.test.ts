import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLastBackup } from '../../lib/backup-time.ts';

test('formatLastBackup handles never backed up', () => {
  const res = formatLastBackup(null);
  assert.equal(res.days, -1);
  assert.equal(res.text, 'Never backed up on this device');
  assert.equal(res.isOverdue, true);
});

test('formatLastBackup handles backed up today and yesterday', () => {
  const now = 1760000000000;
  const today = formatLastBackup(now - 1000 * 60 * 60 * 3, now);
  assert.equal(today.days, 0);
  assert.equal(today.text, 'Backed up today');
  assert.equal(today.isOverdue, false);

  const yesterday = formatLastBackup(now - 1000 * 60 * 60 * 25, now);
  assert.equal(yesterday.days, 1);
  assert.equal(yesterday.text, 'Backed up yesterday');
  assert.equal(yesterday.isOverdue, false);
});

test('formatLastBackup identifies overdue backups (30+ days)', () => {
  const now = 1760000000000;
  const days10 = formatLastBackup(now - 1000 * 60 * 60 * 24 * 10, now);
  assert.equal(days10.days, 10);
  assert.equal(days10.text, 'Backed up 10 days ago');
  assert.equal(days10.isOverdue, false);

  const days35 = formatLastBackup(now - 1000 * 60 * 60 * 24 * 35, now);
  assert.equal(days35.days, 35);
  assert.equal(days35.text, 'Backed up 35 days ago');
  assert.equal(days35.isOverdue, true);
});
