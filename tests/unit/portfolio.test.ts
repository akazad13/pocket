import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHolding, calculatePortfolio, POPULAR_STOCKS } from '../../lib/portfolio.ts';

test('POPULAR_STOCKS includes key blue-chip stocks', () => {
  const symbols = POPULAR_STOCKS.map(s => s.symbol);
  assert.ok(symbols.includes('GP'));
  assert.ok(symbols.includes('SQURPHARMA'));
  assert.ok(symbols.includes('BATBC'));
  assert.ok(symbols.includes('AAPL'));
});

test('validateHolding normalises and validates input', () => {
  const h = validateHolding({
    symbol: 'gp',
    name: 'Grameenphone Ltd.',
    shares: '500',
    buyPrice: '280.50',
    currentPrice: '310.00',
    notes: 'Long term holding',
  });

  assert.equal(h.symbol, 'GP');
  assert.equal(h.shares, 500);
  assert.equal(h.buyPrice, 280.5);
  assert.equal(h.currentPrice, 310);
  assert.equal(h.notes, 'Long term holding');
});

test('validateHolding rejects invalid inputs', () => {
  assert.throws(() => validateHolding({ symbol: '', shares: 10, buyPrice: 100 }));
  assert.throws(() => validateHolding({ symbol: 'GP', shares: -5, buyPrice: 100 }));
  assert.throws(() => validateHolding({ symbol: 'GP', shares: 10, buyPrice: -50 }));
});

test('calculatePortfolio computes invested, value, gains, and portfolio weights', () => {
  const holdings = [
    {
      id: '1',
      symbol: 'GP',
      name: 'Grameenphone',
      shares: 100,
      buyPrice: 300, // 30,000 invested (3,000,000 cents)
      currentPrice: 350, // 35,000 value (3,500,000 cents, +16.7%)
      notes: '',
    },
    {
      id: '2',
      symbol: 'BATBC',
      name: 'BAT Bangladesh',
      shares: 200,
      buyPrice: 500, // 100,000 invested (10,000,000 cents)
      currentPrice: 450, // 90,000 value (9,000,000 cents, -10.0%)
      notes: '',
    },
  ];

  const summary = calculatePortfolio(holdings);

  assert.equal(summary.holdingCount, 2);
  assert.equal(summary.totalSharesCount, 300);
  assert.equal(summary.totalInvestedCents, 13000000); // 130,000 BDT
  assert.equal(summary.totalValueCents, 12500000); // 125,000 BDT
  assert.equal(summary.totalGainLossCents, -500000); // -5,000 BDT
  assert.equal(summary.totalGainLossPct, -3.8);

  // Holding weights: GP = 35,000 / 125,000 = 28.0%, BATBC = 90,000 / 125,000 = 72.0%
  const gp = summary.holdings.find(h => h.holding.symbol === 'GP')!;
  assert.equal(gp.portfolioWeightPct, 28);
  assert.equal(gp.gainLossPct, 16.7);

  const bat = summary.holdings.find(h => h.holding.symbol === 'BATBC')!;
  assert.equal(bat.portfolioWeightPct, 72);
  assert.equal(bat.gainLossPct, -10);

  assert.equal(summary.topGainer?.holding.symbol, 'GP');
  assert.equal(summary.topLoser?.holding.symbol, 'BATBC');
});

test('calculatePortfolio handles empty list', () => {
  const summary = calculatePortfolio([]);
  assert.equal(summary.holdingCount, 0);
  assert.equal(summary.totalValueCents, 0);
  assert.equal(summary.totalInvestedCents, 0);
});
