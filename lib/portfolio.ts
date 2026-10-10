export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  buyPrice: number;
  currentPrice: number;
  notes: string;
}

export interface HoldingPerformance {
  holding: StockHolding;
  investedCents: number;
  currentValueCents: number;
  gainLossCents: number;
  gainLossPct: number;
  portfolioWeightPct: number;
}

export interface PortfolioSummary {
  holdings: HoldingPerformance[];
  totalInvestedCents: number;
  totalValueCents: number;
  totalGainLossCents: number;
  totalGainLossPct: number;
  totalSharesCount: number;
  holdingCount: number;
  topGainer?: HoldingPerformance;
  topLoser?: HoldingPerformance;
}

export const POPULAR_STOCKS = [
  { symbol: 'GP', name: 'Grameenphone Ltd.' },
  { symbol: 'SQURPHARMA', name: 'Square Pharmaceuticals' },
  { symbol: 'BATBC', name: 'British American Tobacco BD' },
  { symbol: 'BRACBANK', name: 'BRAC Bank PLC' },
  { symbol: 'RENATA', name: 'Renata PLC' },
  { symbol: 'BEXIMCO', name: 'Beximco Limited' },
  { symbol: 'LHBL', name: 'LafargeHolcim Bangladesh' },
  { symbol: 'OLYMPIC', name: 'Olympic Industries' },
  { symbol: 'ISLAMIBANK', name: 'Islami Bank Bangladesh' },
  { symbol: 'EBL', name: 'Eastern Bank PLC' },
  { symbol: 'WALTONHIL', name: 'Walton Hi-Tech Industries' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
];

export function validateHolding(p: Record<string, unknown>): StockHolding {
  const id = typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
  const rawSymbol = typeof p.symbol === 'string' ? p.symbol.trim().toUpperCase() : '';
  if (!rawSymbol || rawSymbol.length > 20) {
    throw Error('Enter a valid stock symbol (1-20 characters).');
  }

  const name = typeof p.name === 'string' ? p.name.trim().slice(0, 80) : '';
  const shares = Number(p.shares);
  if (!Number.isFinite(shares) || shares <= 0) {
    throw Error('Enter a positive number of shares.');
  }

  const buyPrice = Number(p.buyPrice);
  if (!Number.isFinite(buyPrice) || buyPrice < 0) {
    throw Error('Enter a valid average buy price per share.');
  }

  const currentPrice = Number(p.currentPrice !== undefined && p.currentPrice !== '' ? p.currentPrice : buyPrice);
  if (!Number.isFinite(currentPrice) || currentPrice < 0) {
    throw Error('Enter a valid current market price per share.');
  }

  const notes = typeof p.notes === 'string' ? p.notes.trim().slice(0, 200) : '';

  return {
    id,
    symbol: rawSymbol,
    name,
    shares,
    buyPrice,
    currentPrice,
    notes,
  };
}

export function calculatePortfolio(holdings: StockHolding[]): PortfolioSummary {
  if (!holdings.length) {
    return {
      holdings: [],
      totalInvestedCents: 0,
      totalValueCents: 0,
      totalGainLossCents: 0,
      totalGainLossPct: 0,
      totalSharesCount: 0,
      holdingCount: 0,
    };
  }

  let totalInvestedCents = 0;
  let totalValueCents = 0;
  let totalSharesCount = 0;

  const rawPerformances = holdings.map(h => {
    const investedCents = Math.round(h.shares * h.buyPrice * 100);
    const currentValueCents = Math.round(h.shares * h.currentPrice * 100);
    const gainLossCents = currentValueCents - investedCents;
    const gainLossPct = investedCents > 0 ? (gainLossCents / investedCents) * 100 : 0;

    totalInvestedCents += investedCents;
    totalValueCents += currentValueCents;
    totalSharesCount += h.shares;

    return {
      holding: h,
      investedCents,
      currentValueCents,
      gainLossCents,
      gainLossPct: Math.round(gainLossPct * 10) / 10,
    };
  });

  const performances: HoldingPerformance[] = rawPerformances.map(p => ({
    ...p,
    portfolioWeightPct:
      totalValueCents > 0 ? Math.round((p.currentValueCents / totalValueCents) * 1000) / 10 : 0,
  }));

  // Sort by current market value descending
  performances.sort((a, b) => b.currentValueCents - a.currentValueCents);

  const totalGainLossCents = totalValueCents - totalInvestedCents;
  const totalGainLossPct =
    totalInvestedCents > 0
      ? Math.round((totalGainLossCents / totalInvestedCents) * 1000) / 10
      : 0;

  const sortedByGain = [...performances].sort((a, b) => b.gainLossPct - a.gainLossPct);
  const topGainer = sortedByGain[0]?.gainLossPct > 0 ? sortedByGain[0] : undefined;
  const topLoser = sortedByGain[sortedByGain.length - 1]?.gainLossPct < 0 ? sortedByGain[sortedByGain.length - 1] : undefined;

  return {
    holdings: performances,
    totalInvestedCents,
    totalValueCents,
    totalGainLossCents,
    totalGainLossPct,
    totalSharesCount,
    holdingCount: holdings.length,
    topGainer,
    topLoser,
  };
}
