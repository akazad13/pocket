import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMonthCalendar} from '../../lib/calendar-schedule';
import type {Expense} from '../../lib/expenses';
import type {Income} from '../../lib/income';
import type {Bill} from '../../lib/bills';
import type {Rule} from '../../lib/rules';

const makeExpense = (id: string, date: string, cents: number, category = 'Food'): Expense => ({
  id,
  date,
  cents,
  category,
  note: '',
  method: 'Cash',
  account: ''
});

const makeIncome = (id: string, date: string, cents: number, source = 'Salary'): Income => ({
  id,
  date,
  cents,
  source,
  note: '',
  account: ''
});

const makeBill = (id: string, name: string, day: number, cents: number): Bill => ({
  id,
  name,
  category: 'Utilities',
  cents,
  day,
  account: '',
  note: '',
  paidMonth: ''
});

test('buildMonthCalendar builds correct month grid structure', () => {
  // October 2026: 31 days. 2026-10-01 is Thursday (startWeekday = 4).
  const cal = buildMonthCalendar('2026-10', [], [], [], [], '2026-10-15');

  assert.equal(cal.month, '2026-10');
  assert.equal(cal.year, 2026);
  assert.equal(cal.monthName, 'October');
  assert.equal(cal.startWeekday, 4); // Thursday
  assert.equal(cal.daysInMonth, 31);
  assert.equal(cal.days.length, 31);

  // Check today flag
  const day15 = cal.days.find(d => d.day === 15)!;
  assert.equal(day15.isToday, true);
  assert.equal(day15.isFuture, false);

  const day16 = cal.days.find(d => d.day === 16)!;
  assert.equal(day16.isToday, false);
  assert.equal(day16.isFuture, true);

  const day14 = cal.days.find(d => d.day === 14)!;
  assert.equal(day14.isToday, false);
  assert.equal(day14.isFuture, false);
});

test('buildMonthCalendar aggregates expenses, income, bills and calculates intensities', () => {
  const expenses: Expense[] = [
    makeExpense('e1', '2026-10-05', 20000), // 200 BDT
    makeExpense('e2', '2026-10-05', 30000), // 300 BDT -> Day 5 = 500 BDT (50,000 cents)
    makeExpense('e3', '2026-10-10', 150000), // 1,500 BDT
    makeExpense('e4', '2026-10-20', 800000), // 8,000 BDT (Large spike)
    makeExpense('e5', '2026-09-20', 99999)  // Past month, should be ignored
  ];

  const income: Income[] = [
    makeIncome('i1', '2026-10-01', 5000000), // 50,000 BDT
    makeIncome('i2', '2026-10-20', 100000)   // 1,000 BDT
  ];

  const bills: Bill[] = [
    makeBill('b1', 'Electricity Bill', 10, 250000), // Due on 10th
    makeBill('b2', 'Internet Bill', 5, 100000)      // Due on 5th
  ];

  const cal = buildMonthCalendar('2026-10', expenses, income, bills, [], '2026-10-25');

  assert.equal(cal.totalSpentCents, 1000000); // 500 + 1500 + 8000 = 10,000 BDT (1,000,000 cents)
  assert.equal(cal.totalIncomeCents, 5100000); // 51,000 BDT
  assert.equal(cal.netMonthCents, 4100000);
  assert.equal(cal.spendingDaysCount, 3);
  assert.equal(cal.highestSpendDay?.day, 20);
  assert.equal(cal.highestSpendDay?.spentCents, 800000);

  // Check Day 5
  const day5 = cal.days.find(d => d.day === 5)!;
  assert.equal(day5.spentCents, 50000);
  assert.equal(day5.expenses.length, 2);
  assert.equal(day5.bills.length, 1);
  assert.equal(day5.bills[0].name, 'Internet Bill');

  // Check Day 10
  const day10 = cal.days.find(d => d.day === 10)!;
  assert.equal(day10.spentCents, 150000);
  assert.equal(day10.bills.length, 1);
  assert.equal(day10.bills[0].name, 'Electricity Bill');

  // Check Day 20 (high spend)
  const day20 = cal.days.find(d => d.day === 20)!;
  assert.equal(day20.spentCents, 800000);
  assert.equal(day20.intensity, 3);
  assert.equal(day20.incomeCents, 100000);
  assert.equal(day20.netFlowCents, -700000);
});

test('buildMonthCalendar clamps bills due on day 31 in shorter months like February', () => {
  const bills: Bill[] = [
    makeBill('b1', 'Month End Bill', 31, 50000)
  ];

  // Feb 2026 has 28 days
  const cal = buildMonthCalendar('2026-02', [], [], bills, [], '2026-02-15');
  assert.equal(cal.daysInMonth, 28);
  const day28 = cal.days.find(d => d.day === 28)!;
  assert.equal(day28.bills.length, 1);
  assert.equal(day28.bills[0].name, 'Month End Bill');
});
