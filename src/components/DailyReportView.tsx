import React, { useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { DailyReportData, UserRole } from '../types/ecom';
import { formatZar, severityClasses, severityLabel } from '../utils/formatters';

interface DailyReportViewProps {
  report: DailyReportData;
  activeRole: UserRole;
  storeSnapshot: unknown;
  onUpdateReport: (updated: Partial<DailyReportData>) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  report,
  activeRole,
  storeSnapshot,
  onUpdateReport,
}) => {
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: activeRole, storeSnapshot }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate morning report.');
      }
      onUpdateReport({
        executiveSummary: data.executiveSummary,
        yesterdayNarrative: data.yesterdayNarrative,
        topActions: data.topActions,
        generatedAt: 'Updated just now via Gemini AI',
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to regenerate daily report.'
      );
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-blue-700">
              {report.generatedAt}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-slate-900">
              {report.dateLabel}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap self-start sm:self-auto"
          >
            {regenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing Report...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate Morning Brief
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-slate-500">Revenue Yesterday</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatZar(report.revenueYesterdayZar)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-red-700 tabular-nums">
              {report.revenueDeltaPercent}% vs 7d avg
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Orders</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
              {report.ordersCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Low Stock Products</p>
            <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
              {report.lowStockProductsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Suppressed Listings</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-700 tabular-nums">
              {report.suppressedListingsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Delayed Deliveries</p>
            <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
              {report.delayedDeliveriesCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Potential Revenue Loss</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-700 tabular-nums">
              {formatZar(report.potentialRevenueLossZar)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-slate-900">
            Executive Narrative
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {report.executiveSummary}
          </p>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Channel Variance Diagnosis
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {report.yesterdayNarrative}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-7">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Top 5 Recommended Actions
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by recoverable daily revenue in ZAR
            </p>
          </div>
          <ul className="divide-y divide-slate-200">
            {report.topActions.map((act) => (
              <li
                key={act.rank}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-sm font-bold text-slate-400 tabular-nums">
                    0{act.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`rounded px-2 py-0.5 font-medium ${severityClasses(
                          act.priority
                        )}`}
                      >
                        {severityLabel(act.priority)}
                      </span>
                      <span className="text-slate-500">{act.channel}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {act.action}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-slate-500">Est. Recovery</p>
                  <p className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                    +{formatZar(act.impactZar)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
