import type {Expense} from './expenses';

export interface SpendingAnomaly {
  id: string;
  category: string;
  date: string;
  cents: number;
  note: string;
  method: string;
  account: string;
  categoryMedianCents: number;
  multiplier: number;
  excessCents: number;
  severity: 'moderate' | 'high' | 'severe';
}

export interface AnomalyReport {
  month: string;
  anomalies: SpendingAnomaly[];
  totalAnomalyCents: number;
  percentageOfMonthlySpend: number;
  highestAnomaly: SpendingAnomaly | null;
}

export interface AnomalyDetectionOptions {
  minAbsoluteCents?: number; // Minimum transaction size to be considered an anomaly (default: 1,500 BDT = 150000 cents)
  multiplierThreshold?: number; // Minimum multiple over median (default: 2.5)
  minCategoryHistoryCount?: number; // Minimum historical records in category (default: 3)
}

/**
 * Calculates the median of an array of numbers.
 */
export function calculateMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Detects spending anomalies and non-routine spikes in a given month.
 */
export function detectSpendingAnomalies(
  allItems: Expense[],
  targetMonth: string,
  options: AnomalyDetectionOptions = {}
): AnomalyReport {
  const minAbsoluteCents = options.minAbsoluteCents ?? 150000; // 1,500 BDT
  const multiplierThreshold = options.multiplierThreshold ?? 2.5;
  const minCategoryHistoryCount = options.minCategoryHistoryCount ?? 3;

  // 1. Group all historical expenses by category to establish baseline medians
  const historyByCategory = new Map<string, number[]>();
  for (const item of allItems) {
    // We compute baseline using all items up to or across the dataset
    if (!historyByCategory.has(item.category)) {
      historyByCategory.set(item.category, []);
    }
    historyByCategory.get(item.category)!.push(item.cents);
  }

  // Pre-calculate baseline median per category
  const categoryMedians = new Map<string, number>();
  for (const [cat, amounts] of historyByCategory.entries()) {
    if (amounts.length >= minCategoryHistoryCount) {
      categoryMedians.set(cat, calculateMedian(amounts));
    }
  }

  // 2. Scan expenses in targetMonth for anomalies
  const monthExpenses = allItems.filter(e => e.date.startsWith(targetMonth));
  const totalMonthCents = monthExpenses.reduce((sum, e) => sum + e.cents, 0);

  const anomalies: SpendingAnomaly[] = [];

  for (const exp of monthExpenses) {
    // Must meet minimum absolute dollar threshold
    if (exp.cents < minAbsoluteCents) continue;

    const median = categoryMedians.get(exp.category);
    if (!median || median <= 0) continue;

    const multiplier = Math.round((exp.cents / median) * 10) / 10;

    if (multiplier >= multiplierThreshold) {
      let severity: 'moderate' | 'high' | 'severe' = 'moderate';
      if (multiplier >= 6.0) severity = 'severe';
      else if (multiplier >= 3.8) severity = 'high';

      anomalies.push({
        id: exp.id,
        category: exp.category,
        date: exp.date,
        cents: exp.cents,
        note: exp.note,
        method: exp.method,
        account: exp.account,
        categoryMedianCents: median,
        multiplier,
        excessCents: exp.cents - median,
        severity
      });
    }
  }

  // Sort by highest multiple then by absolute cents
  anomalies.sort((a, b) => b.multiplier - a.multiplier || b.cents - a.cents);

  const totalAnomalyCents = anomalies.reduce((s, a) => s + a.cents, 0);
  const percentageOfMonthlySpend = totalMonthCents > 0
    ? Math.round((totalAnomalyCents / totalMonthCents) * 1000) / 10
    : 0;

  return {
    month: targetMonth,
    anomalies,
    totalAnomalyCents,
    percentageOfMonthlySpend,
    highestAnomaly: anomalies[0] ?? null
  };
}
