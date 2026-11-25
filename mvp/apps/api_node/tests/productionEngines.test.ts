import { describe, expect, it } from 'vitest';
import { calculateProductProfitability } from '../src/services/profitabilityEngine.js';
import { evaluateCompetitorPosition } from '../src/services/competitorTracker.js';
import { scoreOperationalPriority } from '../src/services/priorityScoringAlgorithm.js';

describe('Product Profitability Engine', () => {
  it('computes net profit after 15% VAT, commission, shipping, and returns', () => {
    const result = calculateProductProfitability({
      sellingPriceCents: 49900,
      cogsCents: 22000,
      packagingCents: 1500,
      commissionBps: 1500,
      fulfillmentFeeCents: 2500,
      shippingCostCents: 4500,
      vatRateBps: 1500,
      expectedReturnRateBps: 300,
      adSpendPerUnitCents: 1500,
      minNetMarginBps: 1500,
    });

    expect(result.grossExVatCents).toBe(43391);
    expect(result.netProfitCents).toBeGreaterThan(0);
    expect(result.minimumSafePriceCents).toBeGreaterThan(0);
  });
});

describe('Competitor Price Tracker', () => {
  it('flags Buy Box loss and recommends safe match when above margin floor', () => {
    const evalRes = evaluateCompetitorPosition(
      199900,
      [{ sellerName: 'RivalShop', priceCents: 194900, isBuyBoxWinner: true }],
      {
        cogsCents: 112000,
        packagingCents: 1500,
        commissionBps: 1200,
        fulfillmentFeeCents: 3000,
        shippingCostCents: 6000,
        vatRateBps: 1500,
        expectedReturnRateBps: 200,
        adSpendPerUnitCents: 2000,
        minNetMarginBps: 1200,
      }
    );

    expect(evalRes.buyBoxLost).toBe(true);
    expect(evalRes.recommendedAction).toBe('match_buy_box');
    expect(evalRes.suggestedPriceCents).toBe(194900);
  });
});

describe('Daily Priority Scoring Algorithm', () => {
  it('classifies high immediate revenue loss as critical', () => {
    const scored = scoreOperationalPriority({
      id: 'tsk-1',
      revenueAtRiskCents: 560000,
      hoursToImpact: 12,
      marginImpactBps: 1400,
      channelRevenueShare: 0.42,
    });

    expect(scored.severity).toBe('critical');
    expect(scored.score).toBeGreaterThanOrEqual(75);
  });
});
