import type {Expense} from './expenses';

export type MethodSpend = {
  method: string;
  cents: number;
  pct: number;
  count: number;
};

// Pure payment method spending aggregator (client & server safe).
export function methodBreakdown(expenses: Expense[]): MethodSpend[] {
  const total = expenses.reduce((s, e) => s + e.cents, 0);
  if (total <= 0) return [];

  const map = new Map<string, { cents: number; count: number }>();
  for (const e of expenses) {
    const key = e.method.trim() || 'Unspecified';
    const curr = map.get(key) ?? { cents: 0, count: 0 };
    curr.cents += e.cents;
    curr.count += 1;
    map.set(key, curr);
  }

  return Array.from(map.entries())
    .map(([method, data]) => ({
      method,
      cents: data.cents,
      pct: Math.round((data.cents / total) * 100),
      count: data.count,
    }))
    .sort((a, b) => b.cents - a.cents);
}
