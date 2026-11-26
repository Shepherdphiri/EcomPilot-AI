import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ROLE_META } from '../data/initialStoreData';
import {
  AutomationRule,
  DailyReportData,
  InventoryItem,
  MarketplaceHealth,
  NavSection,
  PrioritySeverity,
  PriorityTask,
  ProductListingAudit,
  UserRole,
} from '../types/ecom';
import {
  formatZar,
  scoreColorClass,
  severityClasses,
  severityDotClass,
  severityLabel,
} from '../utils/formatters';

interface PriorityCenterViewProps {
  tasks: PriorityTask[];
  marketplaces: MarketplaceHealth[];
  inventory: InventoryItem[];
  listings: ProductListingAudit[];
  dailyReport: DailyReportData;
  activeRole: UserRole;
  searchQuery: string;
  automationRules?: AutomationRule[];
  onToggleAutomationRule?: (ruleId: string) => void;
  onRunAutomationSweep?: () => string | void;
  onResolveTask: (taskId: string) => void;
  onOneClickFix: (task: PriorityTask) => void;
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
  inventory,
  listings,
  dailyReport,
  activeRole,
  searchQuery,
  automationRules = [],
  onToggleAutomationRule,
  onRunAutomationSweep,
  onResolveTask,
  onOneClickFix,
  onReopenTask,
  onNavigate,
  onAskAiAboutTask,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | PrioritySeverity>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);
  const [sweepNotice, setSweepNotice] = useState<string | null>(null);

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
          t.recommendedAction.toLowerCase().includes(q) ||
          t.marketplaceLabel.toLowerCase().includes(q) ||
          (t.sku && t.sku.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDiff !== 0) return sevDiff;
        const aRelevant = a.relevantRoles.includes(activeRole) ? 0 : 1;
        const bRelevant = b.relevantRoles.includes(activeRole) ? 0 : 1;
        return aRelevant - bRelevant;
      });
  }, [tasks, showResolved, severityFilter, searchQuery, activeRole]);

  const openTasks = tasks.filter((t) => !t.resolved);
  const atRiskZar = openTasks.reduce((sum, t) => sum + t.revenueImpactZar, 0);

  const outOfStockCount = inventory.filter((i) => i.availableStock <= 0).length;
  const lowStockCount = inventory.filter((i) => {
    const cover = i.dailySalesVelocity > 0 ? i.availableStock / i.dailySalesVelocity : 999;
    return i.availableStock > 0 && cover <= i.reorderPointDays;
  }).length;
  const activeRunRateSkus = inventory.filter((i) => i.dailySalesVelocity > 0);
  const avgInventoryCover =
    activeRunRateSkus.length > 0
      ? Math.round(
          activeRunRateSkus.reduce(
            (sum, i) => sum + i.availableStock / i.dailySalesVelocity,
            0
          ) / activeRunRateSkus.length
        )
      : 0;
  const avgListingHealth =
    listings.length > 0
      ? Math.round(listings.reduce((sum, l) => sum + l.listingScore, 0) / listings.length)
      : marketplaces.length > 0
      ? Math.round(
          marketplaces.reduce((sum, m) => sum + m.healthScore, 0) / marketplaces.length
        )
      : 0;

  const ordersRequiringAction = openTasks.filter((t) => t.category === 'order').length;
  const estNetMarginPct =
    dailyReport.revenueYesterdayZar > 0
      ? ((dailyReport.profitEstimateZar / dailyReport.revenueYesterdayZar) * 100).toFixed(1)
      : '0.0';
  const deadStockCapitalZar = inventory
    .filter((i) => i.daysSinceLastSale >= 60 || (i.dailySalesVelocity === 0 && i.availableStock > 0))
    .reduce((sum, i) => sum + i.availableStock * i.unitCostZar, 0);
  const activeGuardrailsCount = automationRules.filter((r) => r.enabled).length;

  const handleRunSweepClick = () => {
    if (!onRunAutomationSweep) return;
    const summary = onRunAutomationSweep();
    setSweepNotice(
      typeof summary === 'string' && summary.trim()
        ? summary
        : 'Automation sweep completed against active workspace guardrails.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Operations Pulse */}
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-blue-400">
              {roleMeta.label} · AI Operations Command
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-100">
              What needs my attention today?
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {roleMeta.focusDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="min-h-[40px] rounded-lg border border-white/[0.1] bg-[#171C28] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1E2536] whitespace-nowrap"
            >
              Morning Brief
            </button>
            <button
              type="button"
              onClick={() =>
                onAskAiAboutTask(
                  'What needs attention today across stock, listings, pricing, and dispatches?'
                )
              }
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI Analyst
            </button>
          </div>
        </div>

        {/* 8-Metric Executive & Operations Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-4 lg:grid-cols-8">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Today&apos;s Sales</p>
            <p className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
              {formatZar(dailyReport.revenueYesterdayZar)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Profit Estimate</p>
            <p className="mt-1 text-lg font-bold text-emerald-400 tabular-nums">
              {formatZar(dailyReport.profitEstimateZar)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Orders Action</p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                ordersRequiringAction > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {ordersRequiringAction}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Low Stock SKUs</p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                lowStockCount > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {lowStockCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Out of Stock</p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                outOfStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {outOfStockCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Avg Coverage</p>
            <p className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
              {avgInventoryCover}d
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Listing Health</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${scoreColorClass(avgListingHealth)}`}>
              {avgListingHealth}/100
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Revenue at Risk</p>
            <p className="mt-1 text-lg font-bold text-rose-400 tabular-nums">
              {formatZar(atRiskZar)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Est. True Net Margin:{' '}
              <strong className="text-emerald-400 tabular-nums">{estNetMarginPct}%</strong>
            </span>
            <span>
              Locked Dead-Stock Capital:{' '}
              <strong className="text-amber-400 tabular-nums">
                {formatZar(deadStockCapitalZar)}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pricing')}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Inspect Unit Margin &amp; Recovery →
          </button>
        </div>
      </section>

      {/* Collapsible Automation Guardrails Engine */}
      {automationRules.length > 0 && (
        <section className="rounded-xl border border-white/[0.08] bg-[#121620]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 lg:px-6">
            <button
              type="button"
              onClick={() => setGuardrailsOpen((prev) => !prev)}
              className="flex items-center gap-2.5 text-left"
            >
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Operational Automation Guardrails{' '}
                  <span className="ml-1.5 font-mono text-xs font-normal text-blue-400 tabular-nums">
                    {activeGuardrailsCount}/{automationRules.length} active
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Auto-draft POs, enforce 15% margin floors, reconcile courier PODs, and shield low-cover ad spend
                </p>
              </div>
              {guardrailsOpen ? (
                <ChevronUp className="ml-1 h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4 text-slate-400" />
              )}
            </button>

            {onRunAutomationSweep && (
              <button
                type="button"
                onClick={handleRunSweepClick}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/15 px-3.5 py-1.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-600/25 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                Run Automation Sweep
              </button>
            )}
          </div>

          {sweepNotice && (
            <div className="border-t border-white/[0.06] bg-emerald-500/10 px-5 py-2.5 text-xs text-emerald-300 lg:px-6">
              {sweepNotice}
            </div>
          )}

          {guardrailsOpen && (
            <div className="grid grid-cols-1 gap-3 border-t border-white/[0.08] p-5 md:grid-cols-2 lg:px-6">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100">{rule.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Trigger: {rule.triggerCondition}
                    </p>
                    <p className="mt-1 text-[11px] text-blue-300">{rule.actionSummary}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
                      Runs: {rule.executionsCount} · Last: {rule.lastRunAt || 'Never'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    onClick={() => onToggleAutomationRule?.(rule.id)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      rule.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#171C28] text-slate-400 border border-white/[0.08]'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Paused'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* AI Task Centre Queue */}
      <section className="rounded-xl border border-white/[0.08] bg-[#121620]">
        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center lg:px-6">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-1">
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
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#1E2536] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {level === 'all' ? 'All Open' : severityLabel(level)}{' '}
                  <span className="ml-1 text-slate-400 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowResolved((prev) => !prev)}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap"
          >
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </button>
        </div>

        {sortedAndFilteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold text-slate-100">
              All operational tasks clear
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Adjust filters above or connect live channels to ingest fresh store anomalies.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {sortedAndFilteredTasks.map((task) => {
              const isRoleMatch = task.relevantRoles.includes(activeRole);
              return (
                <li
                  key={task.id}
                  className={`px-5 py-4 transition-colors hover:bg-white/[0.02] lg:px-6 ${
                    task.resolved ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-medium ${severityClasses(
                            task.severity
                          )}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${severityDotClass(task.severity)}`}
                          />
                          {severityLabel(task.severity)}
                        </span>
                        <span className="font-medium text-slate-200">
                          {task.marketplaceLabel}
                        </span>
                        {task.sku && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="font-mono text-slate-300 tabular-nums">
                              {task.sku}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          Due {task.dueDate}
                        </span>
                        {isRoleMatch && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="font-medium text-blue-400">
                              Assigned: {roleMeta.label}
                            </span>
                          </>
                        )}
                      </div>

                      <h2 className="mt-1.5 text-base font-semibold text-slate-100">
                        {task.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">{task.summary}</p>
                      <p className="mt-1.5 text-xs font-medium text-blue-300">
                        Recommended Action: {task.recommendedAction}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                      {task.revenueImpactZar > 0 && (
                        <div className="mr-2 text-right">
                          <p className="text-[11px] text-slate-500">Impact / day</p>
                          <p className="text-sm font-bold text-slate-100 tabular-nums">
                            {formatZar(task.revenueImpactZar)}
                          </p>
                        </div>
                      )}

                      {!task.resolved ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onNavigate(task.targetSection)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1E2536] whitespace-nowrap"
                          >
                            Inspect
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOneClickFix(task)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {task.actionLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveTask(task.id)}
                            title="Dismiss / Mark done"
                            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReopenTask(task.id)}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#1E2536] whitespace-nowrap"
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

      {/* Unified Marketplace Performance Strip */}
      <section className="rounded-xl border border-white/[0.08] bg-[#121620]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 lg:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Marketplace Performance Snapshot
            </h2>
            <p className="text-xs text-slate-400">
              Live revenue, orders, returns, and channel health across connected stores
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('marketplaces')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap"
          >
            Command Centre →
          </button>
        </div>

        {marketplaces.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-100">No channels connected</p>
            <p className="mt-1 text-xs text-slate-400">
              Connect Shopify or Takealot under Connect Channels, or switch Workspace Data to Use Demo in the sidebar.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('connect_channels')}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Connect Channels
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {marketplaces.map((mp) => (
              <div key={mp.id} className="border-b border-white/[0.06] p-5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{mp.shortName}</h3>
                    <p className="text-[11px] text-slate-500">{mp.connectorType}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${scoreColorClass(mp.healthScore)}`}>
                    {mp.healthScore}/100
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Revenue</p>
                    <p className="font-semibold text-slate-100 tabular-nums">
                      {formatZar(mp.revenueYesterdayZar)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Orders</p>
                    <p className="font-semibold text-slate-100 tabular-nums">
                      {mp.ordersYesterday}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Suppressed</p>
                    <p
                      className={`font-semibold tabular-nums ${
                        mp.suppressedListings > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {mp.suppressedListings}
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
