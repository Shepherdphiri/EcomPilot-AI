import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { ROLE_META } from '../data/initialStoreData';
import {
  MarketplaceHealth,
  NavSection,
  PrioritySeverity,
  PriorityTask,
  UserRole,
} from '../types/ecom';
import {
  formatZar,
  scoreColorClass,
  severityClasses,
  severityLabel,
} from '../utils/formatters';

interface PriorityCenterViewProps {
  tasks: PriorityTask[];
  marketplaces: MarketplaceHealth[];
  activeRole: UserRole;
  searchQuery: string;
  onResolveTask: (taskId: string) => void;
  onReopenTask: (taskId: string) => void;
  onNavigate: (section: NavSection) => void;
  onAskAiAboutTask: (prompt: string) => void;
}

const SEVERITY_ORDER: Record<PrioritySeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PriorityCenterView: React.FC<PriorityCenterViewProps> = ({
  tasks,
  marketplaces,
  activeRole,
  searchQuery,
  onResolveTask,
  onReopenTask,
  onNavigate,
  onAskAiAboutTask,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | PrioritySeverity>('all');
  const [showResolved, setShowResolved] = useState(false);

  const roleMeta = ROLE_META[activeRole];

  const sortedAndFilteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => (showResolved ? true : !t.resolved))
      .filter((t) => (severityFilter === 'all' ? true : t.severity === severityFilter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.marketplaceLabel.toLowerCase().includes(q) ||
          (t.sku && t.sku.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Role relevance elevates matching tasks within same severity
        const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDiff !== 0) return sevDiff;
        const aRelevant = a.relevantRoles.includes(activeRole) ? 0 : 1;
        const bRelevant = b.relevantRoles.includes(activeRole) ? 0 : 1;
        return aRelevant - bRelevant;
      });
  }, [tasks, showResolved, severityFilter, searchQuery, activeRole]);

  const openTasks = tasks.filter((t) => !t.resolved);
  const criticalCount = openTasks.filter((t) => t.severity === 'critical').length;
  const highCount = openTasks.filter((t) => t.severity === 'high').length;
  const atRiskZar = openTasks.reduce((sum, t) => sum + t.revenueImpactZar, 0);
  const roleMatchedCount = openTasks.filter((t) =>
    t.relevantRoles.includes(activeRole)
  ).length;

  return (
    <div className="space-y-6">
      {/* Primary Hero Answer: What requires my attention today? */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-blue-700">
              {roleMeta.label} · Daily Priority Brief
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
              What requires my attention today?
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {roleMeta.focusDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('daily_report')}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              Morning Report
            </button>
            <button
              type="button"
              onClick={() => onAskAiAboutTask('What needs attention today and in what order should I tackle it?')}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
            >
              Ask Operations Assistant
            </button>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Critical Blockers</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-red-700 tabular-nums">
              {criticalCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Immediate revenue impact</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">High Priority</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
              {highCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Price, courier & review flags</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Revenue at Risk Today</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {formatZar(atRiskZar)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Recoverable across {openTasks.length} tasks</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Assigned to {roleMeta.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-blue-700 tabular-nums">
              {roleMatchedCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Tailored to active role</p>
          </div>
        </div>
      </section>

      {/* Priority Queue */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => {
              const count =
                level === 'all'
                  ? openTasks.length
                  : openTasks.filter((t) => t.severity === level).length;
              const active = severityFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverityFilter(level)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {level === 'all' ? 'All Open' : severityLabel(level)}{' '}
                  <span className="ml-1 font-mono tabular-nums text-slate-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowResolved((prev) => !prev)}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
          >
            {showResolved ? 'Hide Resolved Tasks' : 'Show Resolved Tasks'}
          </button>
        </div>

        {sortedAndFilteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold text-slate-900">
              No matching open issues
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Adjust your severity filter or search term to inspect other marketplace tasks.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {sortedAndFilteredTasks.map((task) => {
              const isRoleMatch = task.relevantRoles.includes(activeRole);
              return (
                <li
                  key={task.id}
                  className={`px-6 py-4 transition-colors hover:bg-slate-50/70 ${
                    task.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${severityClasses(
                            task.severity
                          )}`}
                        >
                          <AlertCircle className="h-3 w-3" />
                          {severityLabel(task.severity)}
                        </span>
                        <span className="font-medium text-slate-700">
                          {task.marketplaceLabel}
                        </span>
                        {task.sku && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-mono text-slate-600 tabular-nums">
                              SKU {task.sku}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-500">Detected {task.detectedAt}</span>
                        {isRoleMatch && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-medium text-blue-700">
                              Primary for {roleMeta.label}
                            </span>
                          </>
                        )}
                      </div>

                      <h2 className="mt-1.5 text-base font-semibold text-slate-900">
                        {task.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">{task.summary}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      {task.revenueImpactZar > 0 && (
                        <div className="mr-2 text-right">
                          <p className="text-xs text-slate-500">Daily Risk</p>
                          <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            {formatZar(task.revenueImpactZar)}
                          </p>
                        </div>
                      )}

                      {!task.resolved ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onNavigate(task.targetSection)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                          >
                            {task.actionLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveTask(task.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark Resolved
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReopenTask(task.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Compact Marketplace Health Snapshot */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Marketplace Health Summary
            </h2>
            <p className="text-xs text-slate-500">
              Channel health scores computed from listing suppression, inventory cover, and content gaps
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('marketplaces')}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
          >
            Inspect Channels →
          </button>
        </div>

        {marketplaces.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No channels connected
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Connect your Shopify store or Takealot account under Connect Channels, or switch Workspace Data to Use Demo in the sidebar.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('connect_channels')}
              className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
            >
              Connect Shopify or Takealot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            {marketplaces.slice(0, 2).map((mp) => (
              <div key={mp.id} className="border-b border-slate-200 p-5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{mp.name}</h3>
                  <span
                    className={`font-mono text-base font-bold tabular-nums ${scoreColorClass(
                      mp.healthScore
                    )}`}
                  >
                    {mp.healthScore}/100
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Active</p>
                    <p className="font-mono font-medium text-slate-900 tabular-nums">
                      {mp.activeListings}/{mp.totalListings}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Suppressed</p>
                    <p
                      className={`font-mono font-medium tabular-nums ${
                        mp.suppressedListings > 0 ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {mp.suppressedListings}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Issues</p>
                    <p className="font-mono font-medium text-slate-900 tabular-nums">
                      {mp.inventoryIssues + mp.contentIssues}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
