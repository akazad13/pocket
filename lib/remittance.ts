export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const POPULAR_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

export interface RemittanceParams {
  foreignAmount: number;
  exchangeRate: number;
  currency?: string;
  incentivePercent?: number; // e.g. 2.5 for Bangladesh Government 2.5% incentive
  feeForeign?: number;
  feeBdt?: number;
}

export interface RemittanceResult {
  foreignAmount: number;
  exchangeRate: number;
  currency: string;
  netForeignAmount: number;
  grossBdtCents: number;
  incentiveBdtCents: number;
  feeBdtCents: number;
  netBdtCents: number;
  netBdtFormatted: string;
  summaryNote: string;
}

export function calculateRemittance(params: RemittanceParams): RemittanceResult {
  const currency = (params.currency || 'USD').toUpperCase().trim();
  const rawAmount = Number(params.foreignAmount) || 0;
  const rate = Number(params.exchangeRate) || 0;
  const feeForeign = Number(params.feeForeign) || 0;
  const feeBdt = Number(params.feeBdt) || 0;
  const incentivePct = Number(params.incentivePercent) || 0;

  if (rawAmount <= 0 || rate <= 0) {
    return {
      foreignAmount: Math.max(0, rawAmount),
      exchangeRate: Math.max(0, rate),
      currency,
      netForeignAmount: 0,
      grossBdtCents: 0,
      incentiveBdtCents: 0,
      feeBdtCents: 0,
      netBdtCents: 0,
      netBdtFormatted: '0.00',
      summaryNote: '',
    };
  }

  const netForeign = Math.max(0, rawAmount - Math.max(0, feeForeign));
  const grossBdtCents = Math.round(netForeign * rate * 100);
  const incentiveBdtCents = incentivePct > 0 ? Math.round(grossBdtCents * (incentivePct / 100)) : 0;
  const feeBdtCents = Math.max(0, Math.round(feeBdt * 100));
  const netBdtCents = Math.max(0, grossBdtCents + incentiveBdtCents - feeBdtCents);
  const netBdtFormatted = (netBdtCents / 100).toFixed(2);

  const parts: string[] = [];
  const currSym = POPULAR_CURRENCIES.find(c => c.code === currency)?.symbol;
  const formattedForeign = rawAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const amountStr = currSym ? `${currSym}${formattedForeign} ${currency}` : `${formattedForeign} ${currency}`;
  const rateStr = `@ ${rate.toFixed(2)}`;

  let details = `${amountStr} ${rateStr}`;
  if (incentivePct > 0) {
    parts.push(`+${incentivePct}% incentive`);
  }
  if (feeBdt > 0) {
    parts.push(`-৳${feeBdt.toFixed(2)} fee`);
  } else if (feeForeign > 0) {
    parts.push(`-${feeForeign} fee`);
  }

  if (parts.length > 0) {
    details += ` (${parts.join(', ')})`;
  }

  return {
    foreignAmount: rawAmount,
    exchangeRate: rate,
    currency,
    netForeignAmount: netForeign,
    grossBdtCents,
    incentiveBdtCents,
    feeBdtCents,
    netBdtCents,
    netBdtFormatted,
    summaryNote: details,
  };
}
