import { MarketplaceId, PrioritySeverity } from '../types/ecom';

export function formatZar(amount: number): string {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

export function severityLabel(severity: PrioritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Opportunity';
  }
}

export function severityClasses(severity: PrioritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-rose-300 bg-rose-500/10 border border-rose-500/25';
    case 'high':
      return 'text-amber-300 bg-amber-500/10 border border-amber-500/25';
    case 'medium':
      return 'text-blue-300 bg-blue-500/10 border border-blue-500/25';
    case 'low':
      return 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/25';
  }
}

export function severityDotClass(severity: PrioritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500';
    case 'high':
      return 'bg-amber-400';
    case 'medium':
      return 'bg-blue-400';
    case 'low':
      return 'bg-emerald-400';
  }
}

export function scoreColorClass(score: number): string {
  if (score >= 88) return 'text-emerald-400';
  if (score >= 75) return 'text-amber-400';
  return 'text-rose-400';
}

export function channelShortName(id: MarketplaceId): string {
  switch (id) {
    case 'shopify':
      return 'Shopify';
    case 'takealot':
      return 'Takealot';
    case 'makro':
      return 'Makro';
    case 'amazon_sc':
      return 'Amazon SC';
    case 'amazon_vc':
      return 'Amazon VC';
    case 'woocommerce':
      return 'WooCommerce';
  }
}
