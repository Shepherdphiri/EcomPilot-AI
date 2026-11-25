import { calculateProductProfitability, ProductEconomicsInput } from './profitabilityEngine.js';

export interface CompetitorOffer {
  sellerName: string;
  priceCents: number;
  isBuyBoxWinner: boolean;
}

export interface CompetitorEvaluation {
  ourPriceCents: number;
  lowestCompetitorPriceCents: number;
  undercutPercent: number;
  buyBoxLost: boolean;
  recommendedAction: 'hold' | 'match_buy_box' | 'escalate_margin_floor';
  suggestedPriceCents: number;
}

export function evaluateCompetitorPosition(
  ourPriceCents: number,
  offers: CompetitorOffer[],
  economics: Omit<ProductEconomicsInput, 'sellingPriceCents'>
): CompetitorEvaluation {
  if (offers.length === 0) {
    return {
      ourPriceCents,
      lowestCompetitorPriceCents: ourPriceCents,
      undercutPercent: 0,
      buyBoxLost: false,
      recommendedAction: 'hold',
      suggestedPriceCents: ourPriceCents,
    };
  }

  const sorted = [...offers].sort((a, b) => a.priceCents - b.priceCents);
  const lowest = sorted[0];
  const buyBoxLost = sorted.some((o) => o.isBuyBoxWinner && o.priceCents < ourPriceCents);
  const undercutPercent =
    ourPriceCents > lowest.priceCents
      ? Math.round(((ourPriceCents - lowest.priceCents) / ourPriceCents) * 1000) / 10
      : 0;

  const currentEcon = calculateProductProfitability({
    ...economics,
    sellingPriceCents: ourPriceCents,
  });

  if (!buyBoxLost && undercutPercent < 2) {
    return {
      ourPriceCents,
      lowestCompetitorPriceCents: lowest.priceCents,
      undercutPercent,
      buyBoxLost: false,
      recommendedAction: 'hold',
      suggestedPriceCents: ourPriceCents,
    };
  }

  if (lowest.priceCents >= currentEcon.minimumSafePriceCents) {
    return {
      ourPriceCents,
      lowestCompetitorPriceCents: lowest.priceCents,
      undercutPercent,
      buyBoxLost,
      recommendedAction: 'match_buy_box',
      suggestedPriceCents: lowest.priceCents,
    };
  }

  return {
    ourPriceCents,
    lowestCompetitorPriceCents: lowest.priceCents,
    undercutPercent,
    buyBoxLost,
    recommendedAction: 'escalate_margin_floor',
    suggestedPriceCents: currentEcon.minimumSafePriceCents,
  };
}
