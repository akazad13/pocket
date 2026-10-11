import type {Account,AccountType} from './accounts';
import {isDebt,shown} from './accounts';
import type {Expense} from './expenses';

export type AssetCategory = 'liquid' | 'savings' | 'equities' | 'real_assets' | 'other';

export interface CategoryAllocation {
  category: AssetCategory;
  label: string;
  description: string;
  cents: number;
  percentage: number;
  accountCount: number;
  color: string;
}

export interface AssetAllocationReport {
  totalAssetsCents: number;
  totalDebtsCents: number;
  netWorthCents: number;
  categories: CategoryAllocation[];
  debtToAssetRatio: number;
  liquidCents: number;
  monthlyBurnCents: number;
  emergencyRunwayMonths: number;
  runwayRating: 'critical' | 'vulnerable' | 'healthy' | 'strong';
}

export const CATEGORY_CONFIG: Record<AssetCategory, {label: string; description: string; color: string}> = {
  liquid: {
    label: 'Liquid Cash & Banks',
    description: 'Instant cash, bank accounts & mobile wallets',
    color: '#256a53'
  },
  savings: {
    label: 'Fixed & Guaranteed Savings',
    description: 'DPS, Fixed Deposits (FD) & Sanchayapatra',
    color: '#2563eb'
  },
  equities: {
    label: 'Equities & Capital Markets',
    description: 'Stocks, shares & mutual funds',
    color: '#7c3aed'
  },
  real_assets: {
    label: 'Tangible & Physical Assets',
    description: 'Physical gold, jewelry, land & property',
    color: '#d97706'
  },
  other: {
    label: 'Other Receivables & Assets',
    description: 'Loans given to others & miscellaneous assets',
    color: '#6b7280'
  }
};

export function classifyAccount(type: AccountType): AssetCategory | 'debt' {
  if (isDebt(type)) return 'debt';
  switch (type) {
    case 'cash':
    case 'bank':
    case 'wallet':
      return 'liquid';
    case 'dps':
    case 'fd':
    case 'sanchayapatra':
      return 'savings';
    case 'shares':
    case 'mutual_fund':
      return 'equities';
    case 'gold':
    case 'property':
      return 'real_assets';
    case 'loan_given':
    case 'other':
    default:
      return 'other';
  }
}

/**
 * Calculates monthly average spending over the past months (up to 6 months)
 */
export function calculateAverageMonthlyBurn(items: Pick<Expense, 'cents' | 'date'>[], currentMonth: string): number {
  if (!items.length) return 0;

  // Group expenses by month (YYYY-MM)
  const byMonth = new Map<string, number>();
  for (const item of items) {
    const m = item.date.slice(0, 7);
    if (m <= currentMonth) {
      byMonth.set(m, (byMonth.get(m) ?? 0) + item.cents);
    }
  }

  if (byMonth.size === 0) return 0;

  // Consider up to the latest 6 active months
  const sortedMonths = Array.from(byMonth.keys()).sort().reverse().slice(0, 6);
  const totalBurn = sortedMonths.reduce((sum, m) => sum + (byMonth.get(m) ?? 0), 0);
  return Math.round(totalBurn / sortedMonths.length);
}

/**
 * Computes full asset allocation breakdown and liquidity runway
 */
export function calculateAssetAllocation(
  accounts: Account[],
  values: Record<string, number>,
  items: Pick<Expense, 'cents' | 'date'>[] = [],
  currentMonth: string = new Date().toISOString().slice(0, 7)
): AssetAllocationReport {
  const openAccounts = accounts.filter(a => !a.closed);

  const catSums: Record<AssetCategory, {cents: number; count: number}> = {
    liquid: {cents: 0, count: 0},
    savings: {cents: 0, count: 0},
    equities: {cents: 0, count: 0},
    real_assets: {cents: 0, count: 0},
    other: {cents: 0, count: 0}
  };

  let totalDebtsCents = 0;

  for (const a of openAccounts) {
    const rawVal = values[a.id] ?? 0;
    const balance = shown(a, rawVal);

    if (isDebt(a.type)) {
      if (balance > 0) {
        totalDebtsCents += balance;
      }
    } else {
      const cat = classifyAccount(a.type);
      if (cat !== 'debt') {
        const assetCents = Math.max(0, balance);
        catSums[cat].cents += assetCents;
        if (assetCents > 0) {
          catSums[cat].count += 1;
        }
      }
    }
  }

  const totalAssetsCents = Object.values(catSums).reduce((s, c) => s + c.cents, 0);
  const netWorthCents = totalAssetsCents - totalDebtsCents;

  const categories: CategoryAllocation[] = (['liquid', 'savings', 'equities', 'real_assets', 'other'] as AssetCategory[]).map(cat => {
    const cents = catSums[cat].cents;
    const percentage = totalAssetsCents > 0 ? Math.round((cents / totalAssetsCents) * 1000) / 10 : 0;
    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      description: CATEGORY_CONFIG[cat].description,
      cents,
      percentage,
      accountCount: catSums[cat].count,
      color: CATEGORY_CONFIG[cat].color
    };
  });

  const debtToAssetRatio = totalAssetsCents > 0 ? Math.round((totalDebtsCents / totalAssetsCents) * 1000) / 10 : 0;

  const liquidCents = catSums.liquid.cents;
  const monthlyBurnCents = calculateAverageMonthlyBurn(items, currentMonth);

  let emergencyRunwayMonths = 0;
  if (monthlyBurnCents > 0) {
    emergencyRunwayMonths = Math.round((liquidCents / monthlyBurnCents) * 10) / 10;
  } else if (liquidCents > 0) {
    emergencyRunwayMonths = 99; // Abundant
  }

  let runwayRating: 'critical' | 'vulnerable' | 'healthy' | 'strong' = 'healthy';
  if (emergencyRunwayMonths < 1) runwayRating = 'critical';
  else if (emergencyRunwayMonths < 3) runwayRating = 'vulnerable';
  else if (emergencyRunwayMonths <= 6) runwayRating = 'healthy';
  else runwayRating = 'strong';

  return {
    totalAssetsCents,
    totalDebtsCents,
    netWorthCents,
    categories,
    debtToAssetRatio,
    liquidCents,
    monthlyBurnCents,
    emergencyRunwayMonths,
    runwayRating
  };
}
