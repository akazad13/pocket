import type {Expense} from './expenses';
import type {Income} from './income';
import type {Bill} from './bills';
import type {Rule} from './rules';

export interface CalendarDay {
  day: number;
  date: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  spentCents: number;
  incomeCents: number;
  netFlowCents: number;
  intensity: 0 | 1 | 2 | 3;
  expenses: Expense[];
  income: Income[];
  bills: Bill[];
  recurring: Rule[];
}

export interface MonthCalendarData {
  month: string;
  monthName: string;
  year: number;
  startWeekday: number; // 0=Sun .. 6=Sat
  daysInMonth: number;
  days: CalendarDay[];
  totalSpentCents: number;
  totalIncomeCents: number;
  netMonthCents: number;
  spendingDaysCount: number;
  avgDailySpentCents: number;
  highestSpendDay: {day: number; date: string; spentCents: number} | null;
  scheduledBillsCount: number;
  scheduledBillsTotalCents: number;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildMonthCalendar(
  month: string,
  items: Expense[] = [],
  incomeList: Income[] = [],
  bills: Bill[] = [],
  rules: Rule[] = [],
  today: string = new Date().toISOString().slice(0, 10)
): MonthCalendarData {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mIndex = Number(monthStr) - 1; // 0-based

  const firstDate = new Date(Date.UTC(year, mIndex, 1));
  const startWeekday = firstDate.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, mIndex + 1, 0)).getUTCDate();

  const monthName = new Date(Date.UTC(year, mIndex, 1)).toLocaleDateString('en', {
    month: 'long',
    timeZone: 'UTC'
  });

  // Filter items that belong to this month
  const monthExpenses = items.filter(e => e.date.startsWith(month));
  const monthIncome = incomeList.filter(i => i.date.startsWith(month));

  // Map by day number (1..daysInMonth)
  const expensesByDay = new Map<number, Expense[]>();
  for (const e of monthExpenses) {
    const d = parseInt(e.date.slice(8, 10), 10);
    if (!expensesByDay.has(d)) expensesByDay.set(d, []);
    expensesByDay.get(d)!.push(e);
  }

  const incomeByDay = new Map<number, Income[]>();
  for (const i of monthIncome) {
    const d = parseInt(i.date.slice(8, 10), 10);
    if (!incomeByDay.has(d)) incomeByDay.set(d, []);
    incomeByDay.get(d)!.push(i);
  }

  // Map bills by clamped day
  const billsByDay = new Map<number, Bill[]>();
  for (const b of bills) {
    const clamped = Math.min(b.day, daysInMonth);
    if (!billsByDay.has(clamped)) billsByDay.set(clamped, []);
    billsByDay.get(clamped)!.push(b);
  }

  // Map recurring rules by clamped day
  const rulesByDay = new Map<number, Rule[]>();
  for (const r of rules) {
    const clamped = Math.min(r.day, daysInMonth);
    if (!rulesByDay.has(clamped)) rulesByDay.set(clamped, []);
    rulesByDay.get(clamped)!.push(r);
  }

  // Calculate non-zero daily spend amounts to determine intensity thresholds
  const dailySpendValues: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const exps = expensesByDay.get(d) ?? [];
    const spent = exps.reduce((acc, e) => acc + e.cents, 0);
    if (spent > 0) dailySpendValues.push(spent);
  }

  dailySpendValues.sort((a, b) => a - b);
  const medianSpend = dailySpendValues.length > 0
    ? dailySpendValues[Math.floor(dailySpendValues.length / 2)]
    : 0;

  let totalSpentCents = 0;
  let totalIncomeCents = 0;
  let maxSpendDay: {day: number; date: string; spentCents: number} | null = null;
  let spendingDaysCount = 0;

  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayPadded = String(d).padStart(2, '0');
    const date = `${month}-${dayPadded}`;
    const isToday = date === today;
    const isFuture = date > today;

    const dayExpenses = expensesByDay.get(d) ?? [];
    const dayIncome = incomeByDay.get(d) ?? [];
    const dayBills = billsByDay.get(d) ?? [];
    const dayRules = rulesByDay.get(d) ?? [];

    const spentCents = dayExpenses.reduce((s, e) => s + e.cents, 0);
    const incomeCents = dayIncome.reduce((s, i) => s + i.cents, 0);
    const netFlowCents = incomeCents - spentCents;

    totalSpentCents += spentCents;
    totalIncomeCents += incomeCents;

    if (spentCents > 0) {
      spendingDaysCount += 1;
      if (!maxSpendDay || spentCents > maxSpendDay.spentCents) {
        maxSpendDay = {day: d, date, spentCents};
      }
    }

    let intensity: 0 | 1 | 2 | 3 = 0;
    if (spentCents > 0) {
      if (spentCents <= medianSpend * 0.75) intensity = 1;
      else if (spentCents <= medianSpend * 1.6) intensity = 2;
      else intensity = 3;
    }

    days.push({
      day: d,
      date,
      isCurrentMonth: true,
      isToday,
      isFuture,
      spentCents,
      incomeCents,
      netFlowCents,
      intensity,
      expenses: dayExpenses,
      income: dayIncome,
      bills: dayBills,
      recurring: dayRules
    });
  }

  // Scheduled bills count and total
  let scheduledBillsCount = 0;
  let scheduledBillsTotalCents = 0;
  for (const b of bills) {
    scheduledBillsCount += 1;
    scheduledBillsTotalCents += b.cents;
  }

  // Elapsed days calculation for daily average
  const todayMonth = today.slice(0, 7);
  let elapsedDays = daysInMonth;
  if (month === todayMonth) {
    const currentDay = parseInt(today.slice(8, 10), 10);
    elapsedDays = Math.max(1, Math.min(daysInMonth, currentDay));
  } else if (month > todayMonth) {
    elapsedDays = 0;
  }

  const avgDailySpentCents = elapsedDays > 0 ? Math.round(totalSpentCents / elapsedDays) : 0;

  return {
    month,
    monthName,
    year,
    startWeekday,
    daysInMonth,
    days,
    totalSpentCents,
    totalIncomeCents,
    netMonthCents: totalIncomeCents - totalSpentCents,
    spendingDaysCount,
    avgDailySpentCents,
    highestSpendDay: maxSpendDay,
    scheduledBillsCount,
    scheduledBillsTotalCents
  };
}
