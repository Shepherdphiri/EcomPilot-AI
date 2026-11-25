import { PrioritySeverity } from '../types/ecom';

export function formatZar(amount: number): string {
  return `R${amount.toLocaleString('en-ZA')}`;
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
      return 'Low';
  }
}

export function severityClasses(severity: PrioritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-700 bg-red-50 border border-red-200';
    case 'high':
      return 'text-amber-700 bg-amber-50 border border-amber-200';
    case 'medium':
      return 'text-blue-700 bg-blue-50 border border-blue-200';
    case 'low':
      return 'text-slate-600 bg-slate-100 border border-slate-200';
  }
}

export function scoreColorClass(score: number): string {
  if (score >= 90) return 'text-emerald-700';
  if (score >= 80) return 'text-amber-700';
  return 'text-red-700';
}
