import type { Expense } from './expenses';
import type { Income } from './income';
import type { Account, Transfer, Adjustment } from './accounts';
import { values, totals } from './accounts';

export interface WellnessPillar {
  id: 'savings' | 'runway' | 'budget' | 'debt' | 'coverage';
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  metric: string;
  detail: string;
  tip?: string;
}

export interface WellnessReport {
  score: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  label: string;
  summary: string;
  pillars: WellnessPillar[];
  recommendations: string[];
  metrics: {
    savingsRatePercent: number;
    liquidAssetsCents: number;
    monthlyBurnCents: number;
    runwayMonths: number;
    debtToAssetPercent: number;
    budgetAdherencePercent: number;
    incomeCoverageRatio: number;
  };
}

/**
 * Computes average monthly burn in cents over the available recent months
 */
export function calculateMonthlyBurn(expenses: Expense[], currentMonth: string): number {
  if (expenses.length === 0) return 0;

  // Group expenses by YYYY-MM
  const monthMap = new Map<string, number>();
  for (const exp of expenses) {
    const m = exp.date.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) ?? 0) + exp.cents);
  }

  // Look at up to the last 3 distinct months ending at currentMonth
  const pastMonths = Array.from(monthMap.keys())
    .filter(m => m <= currentMonth)
    .sort()
    .slice(-3);

  if (pastMonths.length === 0) {
    return monthMap.get(currentMonth) ?? 0;
  }

  const sum = pastMonths.reduce((acc, m) => acc + (monthMap.get(m) ?? 0), 0);
  return Math.round(sum / pastMonths.length);
}

/**
 * Evaluates composite Financial Health & Wellness score (0 - 100)
 */
export function calculateWellnessScore(params: {
  expenses: Expense[];
  income: Income[];
  accounts: Account[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  budgets: Record<string, number>;
  month: string;
}): WellnessReport {
  const { expenses, income, accounts, transfers, adjustments, budgets, month } = params;

  // 1. Current Month Expenses and Income
  const monthExpenses = expenses.filter(e => e.date.startsWith(month));
  const monthIncome = income.filter(i => i.date.startsWith(month));

  const totalSpentCents = monthExpenses.reduce((s, e) => s + e.cents, 0);
  const totalEarnedCents = monthIncome.reduce((s, i) => s + i.cents, 0);

  // 2. Account Balances and Worth
  const accountVals = values(accounts, expenses, income, transfers, adjustments);
  const worth = totals(accounts, accountVals);

  // Liquid assets: cash, bank, wallet (positive balances only)
  const liquidAssetsCents = accounts
    .filter(a => ['cash', 'bank', 'wallet'].includes(a.type) && !a.closed)
    .reduce((sum, a) => sum + Math.max(0, accountVals[a.id] ?? 0), 0);

  // Monthly burn rate
  const monthlyBurnCents = Math.max(100, calculateMonthlyBurn(expenses, month) || totalSpentCents);

  // Runway in months
  const runwayMonths = monthlyBurnCents > 0
    ? Number((liquidAssetsCents / monthlyBurnCents).toFixed(1))
    : 0;

  // ==========================================
  // PILLAR 1: Savings Rate (25 pts)
  // ==========================================
  let savingsScore = 0;
  let savingsRate = 0;
  let savingsDetail = '';
  let savingsTip: string | undefined;

  if (totalEarnedCents > 0) {
    savingsRate = (totalEarnedCents - totalSpentCents) / totalEarnedCents;
    const ratePct = Math.round(savingsRate * 100);

    if (savingsRate >= 0.20) {
      savingsScore = 25;
      savingsDetail = `Saved ${ratePct}% of income (healthy >=20% target reached)`;
    } else if (savingsRate > 0) {
      savingsScore = Math.round((savingsRate / 0.20) * 25);
      savingsDetail = `Saved ${ratePct}% of income (target is >=20%)`;
      savingsTip = 'Aim to increase monthly savings rate to at least 20% by cutting non-essential expenses.';
    } else {
      savingsScore = 0;
      savingsDetail = `Deficit of ${Math.abs(ratePct)}% (spending exceeded incoming income)`;
      savingsTip = 'Spending outpaced income this month. Review largest discretionary expenses.';
    }
  } else {
    // No income recorded this month: neutral baseline
    savingsScore = totalSpentCents > 0 ? 8 : 15;
    savingsDetail = totalSpentCents > 0
      ? 'No income logged for this month yet'
      : 'No activity recorded this month';
    savingsTip = 'Record income entries to accurately track your monthly savings rate.';
  }

  // ==========================================
  // PILLAR 2: Emergency Runway / Liquidity (25 pts)
  // ==========================================
  let runwayScore = 0;
  let runwayDetail = '';
  let runwayTip: string | undefined;

  if (runwayMonths >= 6) {
    runwayScore = 25;
    runwayDetail = `${runwayMonths} months of expenses saved in liquid funds (exceeds 6-month buffer)`;
  } else if (runwayMonths >= 3) {
    runwayScore = Math.round(15 + ((runwayMonths - 3) / 3) * 10);
    runwayDetail = `${runwayMonths} months of liquid runway (comfortably covers 3+ months)`;
    runwayTip = 'Building your emergency buffer towards 6 full months will maximize resilience.';
  } else if (runwayMonths >= 1) {
    runwayScore = Math.round(5 + ((runwayMonths - 1) / 2) * 10);
    runwayDetail = `${runwayMonths} months of liquid runway (basic 1-3 month cushion)`;
    runwayTip = 'Prioritize liquid savings in high-yield bank accounts or cash until you hold at least 3 months of expenses.';
  } else {
    runwayScore = Math.min(5, Math.round(runwayMonths * 5));
    runwayDetail = `${runwayMonths} months of runway (vulnerable to income shocks)`;
    runwayTip = 'Immediate priority: build an emergency fund to cover at least 1-3 months of essential living costs.';
  }

  // ==========================================
  // PILLAR 3: Budget Discipline & Adherence (20 pts)
  // ==========================================
  let budgetScore = 0;
  let budgetDetail = '';
  let budgetTip: string | undefined;
  const budgetEntries = Object.entries(budgets).filter(([, limit]) => limit > 0);

  let budgetAdherencePercent = 100;
  if (budgetEntries.length === 0) {
    budgetScore = 14;
    budgetDetail = 'No category budgets configured';
    budgetTip = 'Set category budget limits in Overview to build disciplined spending habits.';
  } else {
    let overCount = 0;
    let budgetedSpent = 0;
    let budgetedLimit = 0;

    for (const [cat, limit] of budgetEntries) {
      budgetedLimit += limit;
      const spent = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.cents, 0);
      budgetedSpent += spent;
      if (spent > limit) overCount++;
    }

    const underCount = budgetEntries.length - overCount;
    budgetAdherencePercent = Math.round((underCount / budgetEntries.length) * 100);

    if (overCount === 0) {
      budgetScore = 20;
      budgetDetail = `All ${budgetEntries.length} budgeted categories remained within limits`;
    } else {
      const overRatio = budgetedLimit > 0 ? budgetedSpent / budgetedLimit : 1;
      if (overRatio <= 1.0) {
        budgetScore = Math.max(10, 20 - overCount * 3);
        budgetDetail = `${underCount}/${budgetEntries.length} categories on track; total spend within limits`;
      } else {
        budgetScore = Math.max(0, Math.round(20 - (overRatio - 1) * 35));
        budgetDetail = `${overCount} categories exceeded monthly allowances`;
        budgetTip = 'Monitor spending pace early in the month to avoid exceeding category allocations.';
      }
    }
  }

  // ==========================================
  // PILLAR 4: Debt-to-Asset Burden Ratio (15 pts)
  // ==========================================
  let debtScore = 0;
  let debtRatioPct = 0;
  let debtDetail = '';
  let debtTip: string | undefined;

  if (worth.debts === 0) {
    debtScore = 15;
    debtDetail = 'Completely debt-free (no active loans or credit card balances)';
  } else if (worth.assets <= 0) {
    debtScore = 0;
    debtRatioPct = 100;
    debtDetail = 'Debts exceed total recorded asset values';
    debtTip = 'Focus aggressively on high-interest debt payoffs and credit card balances.';
  } else {
    const ratio = worth.debts / worth.assets;
    debtRatioPct = Math.round(ratio * 100);

    if (ratio <= 0.15) {
      debtScore = 14;
      debtDetail = `Low debt load (${debtRatioPct}% of total asset value)`;
    } else if (ratio <= 0.35) {
      debtScore = 10;
      debtDetail = `Manageable debt level (${debtRatioPct}% of total assets)`;
      debtTip = 'Keep debt service payments below 30% of your net income.';
    } else if (ratio <= 0.60) {
      debtScore = 5;
      debtDetail = `Elevated debt burden (${debtRatioPct}% of total assets)`;
      debtTip = 'Consider using the Debt Snowball or Avalanche method to accelerate debt elimination.';
    } else {
      debtScore = 1;
      debtDetail = `Heavy debt burden (${debtRatioPct}% of total assets)`;
      debtTip = 'High debt exposure. Halt non-essential spending and prioritize debt reduction.';
    }
  }

  // ==========================================
  // PILLAR 5: Income Stability & Coverage (15 pts)
  // ==========================================
  let coverageScore = 0;
  let coverageRatio = 0;
  let coverageDetail = '';
  let coverageTip: string | undefined;

  if (totalEarnedCents > 0 && totalSpentCents > 0) {
    coverageRatio = Number((totalEarnedCents / totalSpentCents).toFixed(2));
    if (coverageRatio >= 1.30) {
      coverageScore = 15;
      coverageDetail = `Strong income buffer (${coverageRatio}x monthly expenses)`;
    } else if (coverageRatio >= 1.10) {
      coverageScore = 11;
      coverageDetail = `Moderate income buffer (${coverageRatio}x monthly expenses)`;
    } else if (coverageRatio >= 1.00) {
      coverageScore = 6;
      coverageDetail = `Breakeven income (${coverageRatio}x expenses; minimal surplus)`;
      coverageTip = 'Create additional income streams or trim fixed overhead to expand your monthly surplus.';
    } else {
      coverageScore = 2;
      coverageDetail = `Negative coverage (${coverageRatio}x expenses; living off savings/debt)`;
      coverageTip = 'Spending outstripped incoming revenue. Review recurring subscriptions and commitments.';
    }
  } else if (totalEarnedCents > 0 && totalSpentCents === 0) {
    coverageScore = 15;
    coverageRatio = 2.0;
    coverageDetail = '100% net surplus (no expenditures recorded)';
  } else {
    coverageScore = 7;
    coverageDetail = 'Record income and expenses to evaluate cash flow coverage';
  }

  // ==========================================
  // Composite Score & Grade Calculation
  // ==========================================
  const totalScore = Math.min(
    100,
    Math.max(0, savingsScore + runwayScore + budgetScore + debtScore + coverageScore)
  );

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  let label: string;
  let summary: string;

  if (totalScore >= 85) {
    grade = 'A+';
    label = 'Excellent';
    summary = 'Outstanding financial resilience. Your savings rate, liquidity, and debt discipline are exceptional.';
  } else if (totalScore >= 70) {
    grade = 'A';
    label = 'Strong';
    summary = 'Solid financial foundation. You maintain healthy reserves and manage expenditures with confidence.';
  } else if (totalScore >= 55) {
    grade = 'B';
    label = 'Moderate';
    summary = 'Good financial balance with clear opportunities to boost emergency runway and savings.';
  } else if (totalScore >= 40) {
    grade = 'C';
    label = 'Needs Attention';
    summary = 'Noticeable financial pressure. Focusing on emergency savings and budget control will quickly raise your score.';
  } else {
    grade = 'D';
    label = 'Vulnerable';
    summary = 'High financial strain detected. Prioritize building a 1-month cash buffer and tackling immediate liabilities.';
  }

  const pillars: WellnessPillar[] = [
    {
      id: 'savings',
      name: 'Savings Rate',
      score: savingsScore,
      maxScore: 25,
      percentage: Math.round((savingsScore / 25) * 100),
      status: savingsScore >= 20 ? 'excellent' : savingsScore >= 12 ? 'good' : savingsScore >= 6 ? 'warning' : 'critical',
      metric: totalEarnedCents > 0 ? `${Math.round(savingsRate * 100)}%` : '—',
      detail: savingsDetail,
      tip: savingsTip
    },
    {
      id: 'runway',
      name: 'Emergency Runway',
      score: runwayScore,
      maxScore: 25,
      percentage: Math.round((runwayScore / 25) * 100),
      status: runwayScore >= 20 ? 'excellent' : runwayScore >= 14 ? 'good' : runwayScore >= 8 ? 'warning' : 'critical',
      metric: `${runwayMonths} mo`,
      detail: runwayDetail,
      tip: runwayTip
    },
    {
      id: 'budget',
      name: 'Budget Discipline',
      score: budgetScore,
      maxScore: 20,
      percentage: Math.round((budgetScore / 20) * 100),
      status: budgetScore >= 17 ? 'excellent' : budgetScore >= 12 ? 'good' : budgetScore >= 7 ? 'warning' : 'critical',
      metric: budgetEntries.length > 0 ? `${budgetAdherencePercent}%` : 'Not set',
      detail: budgetDetail,
      tip: budgetTip
    },
    {
      id: 'debt',
      name: 'Debt-to-Asset Ratio',
      score: debtScore,
      maxScore: 15,
      percentage: Math.round((debtScore / 15) * 100),
      status: debtScore >= 13 ? 'excellent' : debtScore >= 9 ? 'good' : debtScore >= 5 ? 'warning' : 'critical',
      metric: worth.debts === 0 ? '0%' : `${debtRatioPct}%`,
      detail: debtDetail,
      tip: debtTip
    },
    {
      id: 'coverage',
      name: 'Cash Flow Coverage',
      score: coverageScore,
      maxScore: 15,
      percentage: Math.round((coverageScore / 15) * 100),
      status: coverageScore >= 12 ? 'excellent' : coverageScore >= 8 ? 'good' : coverageScore >= 4 ? 'warning' : 'critical',
      metric: coverageRatio > 0 ? `${coverageRatio}x` : '—',
      detail: coverageDetail,
      tip: coverageTip
    }
  ];

  // Pick top actionable recommendations from lowest scoring pillars
  const recommendations: string[] = [];
  const sortedPillars = [...pillars].sort((a, b) => a.percentage - b.percentage);
  for (const p of sortedPillars) {
    if (p.tip && recommendations.length < 3) {
      recommendations.push(p.tip);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep up the exceptional financial habits and consider exploring diversified investments.');
  }

  return {
    score: totalScore,
    grade,
    label,
    summary,
    pillars,
    recommendations,
    metrics: {
      savingsRatePercent: Math.round(savingsRate * 100),
      liquidAssetsCents,
      monthlyBurnCents,
      runwayMonths,
      debtToAssetPercent: debtRatioPct,
      budgetAdherencePercent,
      incomeCoverageRatio: coverageRatio
    }
  };
}
