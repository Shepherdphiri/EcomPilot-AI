import { NormalizedListing } from '@ecompilot/connectors';
import { scoreOperationalPriority } from './priorityScoringAlgorithm.js';

export interface EvaluatedTask {
  productId?: string;
  connectionId?: string;
  sku: string;
  priorityScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  summary: string;
  recommendedAction: string;
  estimatedRevenueImpactCents: number;
  targetRoles: string[];
}

export function evaluateOperationalPriorities(params: {
  listings: Array<
    NormalizedListing & {
      provider: string;
      connectionId: string;
      productId: string;
      canonicalSku: string;
      targetPriceCents: number;
      channelRevenueShare: number;
    }
  >;
  inventory: Array<{
    productId: string;
    sku: string;
    availableUnits: number;
    dailyVelocity: number;
    priceCents: number;
    leadTimeDays: number;
    channelRevenueShare: number;
  }>;
}): EvaluatedTask[] {
  const rawCandidates: Array<
    Omit<EvaluatedTask, 'priorityScore' | 'severity'> & {
      hoursToImpact: number;
      marginImpactBps: number;
      channelRevenueShare: number;
    }
  > = [];

  for (const lst of params.listings) {
    if (lst.status === 'suppressed') {
      const estDailyLoss = Math.max(150000, lst.priceCents * 2);
      rawCandidates.push({
        productId: lst.productId,
        connectionId: lst.connectionId,
        sku: lst.canonicalSku,
        category: 'suppression',
        title: `${lst.provider} listing suppressed (${lst.canonicalSku})`,
        summary: lst.suppressionReason || 'Offer is not buyable on marketplace.',
        recommendedAction: 'Restore buyable status or populate missing marketplace attributes',
        estimatedRevenueImpactCents: estDailyLoss,
        targetRoles: ['ecommerce_manager', 'content_manager', 'executive'],
        hoursToImpact: 0,
        marginImpactBps: 1500,
        channelRevenueShare: lst.channelRevenueShare,
      });
    }

    if (lst.targetPriceCents > 0 && lst.priceCents > 0) {
      const diffPct = Math.round(
        (Math.abs(lst.targetPriceCents - lst.priceCents) / lst.targetPriceCents) * 100
      );
      if (diffPct >= 5) {
        const marginBps = Math.min(1500, diffPct * 100);
        rawCandidates.push({
          productId: lst.productId,
          connectionId: lst.connectionId,
          sku: lst.canonicalSku,
          category: 'pricing',
          title: `Price mismatch on ${lst.provider} (${lst.canonicalSku}): ${diffPct}% variance`,
          summary: `Channel price is R${(lst.priceCents / 100).toFixed(0)} vs canonical target R${(lst.targetPriceCents / 100).toFixed(0)}.`,
          recommendedAction: 'Sync channel price back to parity',
          estimatedRevenueImpactCents: Math.abs(lst.targetPriceCents - lst.priceCents) * 4,
          targetRoles: ['ecommerce_manager', 'executive'],
          hoursToImpact: 24,
          marginImpactBps: marginBps,
          channelRevenueShare: lst.channelRevenueShare,
        });
      }
    }
  }

  for (const inv of params.inventory) {
    if (inv.dailyVelocity > 0) {
      const coverDays = inv.availableUnits / inv.dailyVelocity;
      if (coverDays <= inv.leadTimeDays) {
        const hours = Math.max(0, Math.round(coverDays * 24));
        rawCandidates.push({
          productId: inv.productId,
          sku: inv.sku,
          category: 'stockout',
          title:
            coverDays <= 1
              ? `Stockout imminent (<24h) for ${inv.sku}`
              : `Stockout predicted in ${Math.round(coverDays)} days (${inv.sku})`,
          summary: `${inv.availableUnits} units remaining at ${inv.dailyVelocity.toFixed(1)} units/day velocity (lead time ${inv.leadTimeDays}d).`,
          recommendedAction: 'Place urgent replenishment PO or pause paid traffic',
          estimatedRevenueImpactCents: Math.round(inv.dailyVelocity * inv.priceCents * 3),
          targetRoles: ['ecommerce_manager', 'inventory_manager', 'executive'],
          hoursToImpact: hours,
          marginImpactBps: 1200,
          channelRevenueShare: inv.channelRevenueShare,
        });
      }
    }
  }

  return rawCandidates
    .map((c, idx) => {
      const scored = scoreOperationalPriority({
        id: String(idx),
        revenueAtRiskCents: c.estimatedRevenueImpactCents,
        hoursToImpact: c.hoursToImpact,
        marginImpactBps: c.marginImpactBps,
        channelRevenueShare: c.channelRevenueShare,
      });

      return {
        productId: c.productId,
        connectionId: c.connectionId,
        sku: c.sku,
        priorityScore: scored.score,
        severity: scored.severity,
        category: c.category,
        title: c.title,
        summary: c.summary,
        recommendedAction: c.recommendedAction,
        estimatedRevenueImpactCents: c.estimatedRevenueImpactCents,
        targetRoles: c.targetRoles,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
