import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRemittance, POPULAR_CURRENCIES } from '../../lib/remittance.ts';

test('POPULAR_CURRENCIES includes USD, EUR, GBP, AED, SAR', () => {
  const codes = POPULAR_CURRENCIES.map(c => c.code);
  assert.ok(codes.includes('USD'));
  assert.ok(codes.includes('EUR'));
  assert.ok(codes.includes('GBP'));
  assert.ok(codes.includes('AED'));
  assert.ok(codes.includes('SAR'));
});

test('calculateRemittance computes basic conversion without incentive', () => {
  const res = calculateRemittance({
    foreignAmount: 1000,
    exchangeRate: 122.5,
    currency: 'USD',
    incentivePercent: 0,
  });

  assert.equal(res.foreignAmount, 1000);
  assert.equal(res.exchangeRate, 122.5);
  assert.equal(res.currency, 'USD');
  assert.equal(res.grossBdtCents, 12250000); // 122,500.00 BDT
  assert.equal(res.incentiveBdtCents, 0);
  assert.equal(res.netBdtCents, 12250000);
  assert.equal(res.netBdtFormatted, '122500.00');
  assert.equal(res.summaryNote, '$1,000.00 USD @ 122.50');
});

test('calculateRemittance applies Bangladesh 2.5% wage earner cash incentive', () => {
  const res = calculateRemittance({
    foreignAmount: 1000,
    exchangeRate: 122.5,
    currency: 'USD',
    incentivePercent: 2.5,
  });

  // Gross: 122,500 BDT (12,250,000 cents)
  // Incentive 2.5%: 3,062.50 BDT (306,250 cents)
  // Net: 125,562.50 BDT (12,556,250 cents)
  assert.equal(res.grossBdtCents, 12250000);
  assert.equal(res.incentiveBdtCents, 306250);
  assert.equal(res.netBdtCents, 12556250);
  assert.equal(res.netBdtFormatted, '125562.50');
  assert.equal(res.summaryNote, '$1,000.00 USD @ 122.50 (+2.5% incentive)');
});

test('calculateRemittance handles foreign fee deduction', () => {
  const res = calculateRemittance({
    foreignAmount: 500,
    exchangeRate: 130,
    currency: 'EUR',
    incentivePercent: 0,
    feeForeign: 10, // 490 EUR net * 130 = 63,700 BDT
  });

  assert.equal(res.netForeignAmount, 490);
  assert.equal(res.grossBdtCents, 6370000);
  assert.equal(res.netBdtCents, 6370000);
  assert.equal(res.netBdtFormatted, '63700.00');
  assert.ok(res.summaryNote.includes('-10 fee'));
});

test('calculateRemittance handles BDT bank fees and incentive combined', () => {
  const res = calculateRemittance({
    foreignAmount: 2000,
    exchangeRate: 33, // 2000 SAR * 33 = 66,000 BDT
    currency: 'SAR',
    incentivePercent: 2.5, // +1,650 BDT incentive = 67,650 BDT
    feeBdt: 150, // -150 BDT fee = 67,500 BDT
  });

  assert.equal(res.grossBdtCents, 6600000);
  assert.equal(res.incentiveBdtCents, 165000);
  assert.equal(res.feeBdtCents, 15000);
  assert.equal(res.netBdtCents, 6750000);
  assert.equal(res.netBdtFormatted, '67500.00');
  assert.ok(res.summaryNote.includes('+2.5% incentive, -৳150.00 fee'));
});

test('calculateRemittance returns zeros for zero or negative inputs', () => {
  const res1 = calculateRemittance({ foreignAmount: 0, exchangeRate: 120 });
  assert.equal(res1.netBdtCents, 0);
  assert.equal(res1.netBdtFormatted, '0.00');
  assert.equal(res1.summaryNote, '');

  const res2 = calculateRemittance({ foreignAmount: 100, exchangeRate: -1 });
  assert.equal(res2.netBdtCents, 0);
  assert.equal(res2.netBdtFormatted, '0.00');
});
