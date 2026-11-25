export interface ProductEconomicsInput {
  sellingPriceCents: number;
  cogsCents: number;
  packagingCents: number;
  commissionBps: number;
  fulfillmentFeeCents: number;
  shippingCostCents: number;
  vatRateBps: number;
  expectedReturnRateBps: number;
  adSpendPerUnitCents: number;
  minNetMarginBps: number;
}

export interface ProfitabilityBreakdown {
  grossExVatCents: number;
  commissionCents: number;
  returnAllowanceCents: number;
  totalCostsCents: number;
  netProfitCents: number;
  netMarginPercent: number;
  isMarginAtRisk: boolean;
  minimumSafePriceCents: number;
}

export function calculateProductProfitability(
  input: ProductEconomicsInput
): ProfitabilityBreakdown {
  const vatFactor = 1 + input.vatRateBps / 10000;
  const grossExVatCents = Math.round(input.sellingPriceCents / vatFactor);
  const commissionCents = Math.round((input.sellingPriceCents * input.commissionBps) / 10000);
  const returnAllowanceCents = Math.round(
    (grossExVatCents * input.expectedReturnRateBps) / 10000
  );

  const totalCostsCents =
    input.cogsCents +
    input.packagingCents +
    commissionCents +
    input.fulfillmentFeeCents +
    input.shippingCostCents +
    returnAllowanceCents +
    input.adSpendPerUnitCents;

  const netProfitCents = grossExVatCents - totalCostsCents;
  const netMarginPercent =
    grossExVatCents > 0 ? Math.round((netProfitCents / grossExVatCents) * 1000) / 10 : 0;

  const minMarginRatio = input.minNetMarginBps / 10000;
  const fixedUnitCosts =
    input.cogsCents +
    input.packagingCents +
    input.fulfillmentFeeCents +
    input.shippingCostCents +
    input.adSpendPerUnitCents;

  const denominator =
    1 / vatFactor -
    input.commissionBps / 10000 -
    input.expectedReturnRateBps / (10000 * vatFactor) -
    minMarginRatio / vatFactor;

  const minimumSafePriceCents =
    denominator > 0 ? Math.ceil(fixedUnitCosts / denominator) : input.sellingPriceCents;

  return {
    grossExVatCents,
    commissionCents,
    returnAllowanceCents,
    totalCostsCents,
    netProfitCents,
    netMarginPercent,
    isMarginAtRisk: netMarginPercent < input.minNetMarginBps / 100,
    minimumSafePriceCents,
  };
}
