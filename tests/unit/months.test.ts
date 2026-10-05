import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextMonth,occurrenceDate} from '../../lib/months.ts';

test('nextMonth rolls over the year', () => {
  assert.equal(nextMonth('2026-01'), '2026-02');
  assert.equal(nextMonth('2026-09'), '2026-10');
  assert.equal(nextMonth('2026-12'), '2027-01');
});
test('occurrenceDate clamps to the month length', () => {
  assert.equal(occurrenceDate('2026-01', 31), '2026-01-31');
  assert.equal(occurrenceDate('2026-02', 31), '2026-02-28');
  assert.equal(occurrenceDate('2028-02', 30), '2028-02-29');
  assert.equal(occurrenceDate('2026-04', 31), '2026-04-30');
  assert.equal(occurrenceDate('2026-04', 5), '2026-04-05');
});
