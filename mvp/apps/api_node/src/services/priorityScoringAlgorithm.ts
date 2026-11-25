export interface PriorityCandidate {
  id: string;
  revenueAtRiskCents: number;
  hoursToImpact: number; // e.g. 0 for active suppression, 72 for 3-day stockout
  marginImpactBps: number;
  channelRevenueShare: number; // 0.0 - 1.0
}

export interface ScoredPriorityResult {
  id: string;
  score: number; // 0 - 100
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Deterministic Daily Priority Scoring Algorithm:
 * Score = 0.40 * RevenueRiskNorm + 0.25 * UrgencyDecay + 0.20 * MarginImpactNorm + 0.15 * ChannelWeight
 */
export function scoreOperationalPriority(candidate: PriorityCandidate): ScoredPriorityResult {
  const revenueNorm = Math.min(100, (candidate.revenueAtRiskCents / 600000) * 100);
  const urgencyDecay = Math.max(0, Math.min(100, 100 - (candidate.hoursToImpact / 240) * 100));
  const marginNorm = Math.min(100, (candidate.marginImpactBps / 1500) * 100);
  const channelNorm = Math.min(100, candidate.channelRevenueShare * 100);

  const score = Math.round(
    (revenueNorm * 0.4 + urgencyDecay * 0.25 + marginNorm * 0.2 + channelNorm * 0.15) * 10
  ) / 10;

  let severity: ScoredPriorityResult['severity'] = 'low';
  if (score >= 75) severity = 'critical';
  else if (score >= 50) severity = 'high';
  else if (score >= 25) severity = 'medium';

  return { id: candidate.id, score, severity };
}
