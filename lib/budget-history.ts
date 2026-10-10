import { prevMonth } from './months';
import type { Expense } from './expenses';

export type BudgetStatus = 'under' | 'over' | 'exact' | 'no_spend';

export interface MonthAdherence {
  month: string;
  monthShort: string;
  spentCents: number;
  budgetCents: number;
  diffCents: number;
  status: BudgetStatus;
  percentUsed: number;
}

export interface CategoryBudgetHistory {
  category: string;
  budgetCents: number;
  months: MonthAdherence[];
  monthsUnder: number;
  monthsOver: number;
  adherenceRate: number; // 0 to 100
  averageSpentCents: number;
  currentStreak: number; // positive = consecutive months under budget, negative = consecutive months over budget
}

export interface BudgetHistorySummary {
  categories: CategoryBudgetHistory[];
  windowMonths: string[];
  overallAdherenceRate: number; // percentage of all budget-months that stayed within budget
  totalMonthsAnalyzed: number;
}

export function getRecentMonths(currentMonth: string, count = 6): string[] {
  const result: string[] = [];
  let cur = currentMonth;
  for (let i = 0; i < count; i++) {
    result.unshift(cur);
    cur = prevMonth(cur);
  }
  return result;
}

const shortMonthName = (m: string) => {
  const [, mo] = m.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[mo - 1] || m;
};

export function buildBudgetHistory(
  items: Expense[],
  budgets: Record<string, number>,
  currentMonth: string,
  windowSize = 6
): BudgetHistorySummary {
  const windowMonths = getRecentMonths(currentMonth, windowSize);
  const budgetedCategories = Object.keys(budgets).filter(c => budgets[c] > 0);

  let totalBudgetMonths = 0;
  let totalUnderMonths = 0;

  const categories: CategoryBudgetHistory[] = budgetedCategories.map(category => {
    const budgetCents = budgets[category];
    const categoryExpenses = items.filter(e => e.category === category);

    const months: MonthAdherence[] = windowMonths.map(month => {
      const spentCents = categoryExpenses
        .filter(e => e.date.startsWith(month))
        .reduce((sum, e) => sum + e.cents, 0);

      const diffCents = spentCents - budgetCents;
      let status: BudgetStatus;
      if (spentCents === 0) status = 'no_spend';
      else if (spentCents < budgetCents) status = 'under';
      else if (spentCents === budgetCents) status = 'exact';
      else status = 'over';

      const percentUsed = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;

      return {
        month,
        monthShort: shortMonthName(month),
        spentCents,
        budgetCents,
        diffCents,
        status,
        percentUsed,
      };
    });

    const monthsUnder = months.filter(m => m.spentCents <= m.budgetCents).length;
    const monthsOver = months.length - monthsUnder;
    const adherenceRate = months.length > 0 ? Math.round((monthsUnder / months.length) * 100) : 100;
    const totalSpent = months.reduce((s, m) => s + m.spentCents, 0);
    const averageSpentCents = months.length > 0 ? Math.round(totalSpent / months.length) : 0;

    // Calculate current streak from newest month backward
    let currentStreak = 0;
    const reversed = [...months].reverse();
    if (reversed.length > 0) {
      const isLatestUnder = reversed[0].spentCents <= reversed[0].budgetCents;
      for (const m of reversed) {
        const isUnder = m.spentCents <= m.budgetCents;
        if (isUnder === isLatestUnder) {
          currentStreak += isLatestUnder ? 1 : -1;
        } else {
          break;
        }
      }
    }

    totalBudgetMonths += months.length;
    totalUnderMonths += monthsUnder;

    return {
      category,
      budgetCents,
      months,
      monthsUnder,
      monthsOver,
      adherenceRate,
      averageSpentCents,
      currentStreak,
    };
  });

  // Sort by adherence rate ascending (lowest consistency first to highlight areas needing attention)
  categories.sort((a, b) => a.adherenceRate - b.adherenceRate || b.budgetCents - a.budgetCents);

  const overallAdherenceRate =
    totalBudgetMonths > 0 ? Math.round((totalUnderMonths / totalBudgetMonths) * 100) : 100;

  return {
    categories,
    windowMonths,
    overallAdherenceRate,
    totalMonthsAnalyzed: windowMonths.length,
  };
}
