import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react';
import {
  DailyReportData,
  ReportScheduleConfig,
  UserRole,
} from '../types/ecom';
import { postJson } from '../utils/api';
import { formatZar, severityClasses, severityLabel } from '../utils/formatters';

interface DailyReportViewProps {
  report: DailyReportData;
  activeRole: UserRole;
  storeSnapshot: unknown;
  schedule: ReportScheduleConfig;
  onUpdateSchedule: (next: ReportScheduleConfig) => void;
  onUpdateReport: (updated: Partial<DailyReportData>) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  report,
  activeRole,
  storeSnapshot,
  schedule,
  onUpdateSchedule,
  onUpdateReport,
}) => {
  const [cadenceTab, setCadenceTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const multiplier = cadenceTab === 'daily' ? 1 : cadenceTab === 'weekly' ? 7 : 30;

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      const data = await postJson<{
        executiveSummary: string;
        yesterdayNarrative: string;
        topActions: DailyReportData['topActions'];
      }>('/api/ai/daily-report', { role: activeRole, storeSnapshot });
      onUpdateReport({
        executiveSummary: data.executiveSummary,
        yesterdayNarrative: data.yesterdayNarrative,
        topActions: data.topActions,
        generatedAt: 'Updated just now via Gemini AI',
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to regenerate report.'
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-blue-400">{report.generatedAt}</p>
            <h1 className="mt-1 font-display text-xl font-bold text-slate-100">
              {cadenceTab === 'daily'
                ? 'AI Daily Morning Briefing'
                : cadenceTab === 'weekly'
                ? 'Weekly Operations Report'
                : 'Monthly Executive Profitability Digest'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCadenceTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    cadenceTab === tab
                      ? 'bg-[#1E2536] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap"
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate AI Briefing
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-slate-400">
              {cadenceTab === 'daily'
                ? 'Sales Yesterday'
                : cadenceTab === 'weekly'
                ? '7-Day Sales'
                : '30-Day Sales'}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">
              {formatZar(report.revenueYesterdayZar * multiplier)}
            </p>
            <p className="mt-0.5 text-xs text-rose-400 tabular-nums">
              {report.revenueDeltaPercent}% vs prior period
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Est. Net Profit</p>
            <p className="mt-1 text-xl font-bold text-emerald-400 tabular-nums">
              {formatZar(report.profitEstimateZar * multiplier)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Orders</p>
            <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">
              {report.ordersCount * multiplier}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Low Stock SKUs</p>
            <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">
              {report.lowStockProductsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Suppressed Listings</p>
            <p className="mt-1 text-xl font-bold text-rose-400 tabular-nums">
              {report.suppressedListingsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Recoverable Risk / Day</p>
            <p className="mt-1 text-xl font-bold text-rose-400 tabular-nums">
              {formatZar(report.potentialRevenueLossZar)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
            <h2 className="text-base font-semibold text-slate-100">Executive Summary</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {report.executiveSummary}
            </p>
            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Channel Variance Diagnosis
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {report.yesterdayNarrative}
              </p>
            </div>
          </section>

          {/* Scheduled Email Reports Configuration */}
          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Scheduled Email Delivery
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Automatically dispatch morning briefings, restock PO alerts, and listing health warnings.
            </p>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Cadence
                  </label>
                  <select
                    value={schedule.cadence}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...schedule,
                        cadence: e.target.value as ReportScheduleConfig['cadence'],
                      })
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="daily" className="bg-[#121620]">Daily Morning</option>
                    <option value="weekly" className="bg-[#121620]">Weekly (Monday)</option>
                    <option value="monthly" className="bg-[#121620]">Monthly (1st)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Delivery Time (SAST)
                  </label>
                  <input
                    type="time"
                    value={schedule.sendTimeSast}
                    onChange={(e) =>
                      onUpdateSchedule({ ...schedule, sendTimeSast: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Recipients (comma-separated)
                </label>
                <input
                  type="text"
                  value={schedule.recipients}
                  onChange={(e) =>
                    onUpdateSchedule({ ...schedule, recipients: e.target.value })
                  }
                  placeholder="ops@apexhome.co.za, shepherd@apexhome.co.za"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(e) =>
                      onUpdateSchedule({ ...schedule, enabled: e.target.checked })
                    }
                    className="rounded border-white/20 bg-[#0B0D12]"
                  />
                  Enable automated dispatch
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Save Schedule
                </button>
              </div>
              {scheduleSaved && (
                <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Report schedule saved ({schedule.sendTimeSast} SAST)
                </p>
              )}
            </form>
          </section>
        </div>

        <section className="rounded-xl border border-white/[0.08] bg-[#121620] lg:col-span-7">
          <div className="border-b border-white/[0.08] px-5 py-4 lg:px-6">
            <h2 className="text-base font-semibold text-slate-100">
              Top 5 Briefing Actions
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by recoverable daily revenue across stock, listings, pricing, and dispatch
            </p>
          </div>
          {report.topActions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No recommended actions yet. Connect Shopify or Takealot under Connect Channels, or load Demo Data.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {report.topActions.map((act) => (
                <li
                  key={act.rank}
                  className="flex items-center justify-between gap-4 px-5 py-4 lg:px-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-sm font-bold text-slate-500 tabular-nums">
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
                        <span className="text-slate-400">{act.channel}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-100">
                        {act.action}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-500">Est. Recovery</p>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">
                      +{formatZar(act.impactZar)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
