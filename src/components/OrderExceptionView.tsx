import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ListFilter,
  Loader2,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { ReviewCluster, ShipmentRecord } from '../types/ecom';
import { postJson } from '../utils/api';
import { scoreColorClass } from '../utils/formatters';

interface OrderExceptionViewProps {
  reviews: ReviewCluster[];
  shipments: ShipmentRecord[];
  onSyncShipment: (orderNumber: string) => void;
  onUpdateReviewCluster: (sku: string, updated: Partial<ReviewCluster>) => void;
}

export const OrderExceptionView: React.FC<OrderExceptionViewProps> = ({
  reviews,
  shipments,
  onSyncShipment,
  onUpdateReviewCluster,
}) => {
  const [activeTab, setActiveTab] = useState<'exceptions' | 'reviews'>('exceptions');
  const [selectedSku, setSelectedSku] = useState(reviews[0]?.sku || '');
  const [customReviewInput, setCustomReviewInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const openExceptionsCount = shipments.filter((s) => !s.synced).length;

  const handleAnalyzeCustomReviews = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCluster = reviews.find((r) => r.sku === selectedSku) || reviews[0];
    const lines = customReviewInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const reviewsToAnalyze =
      lines.length > 0 ? lines : targetCluster?.sampleReviews || [];

    if (reviewsToAnalyze.length === 0) {
      setAnalyzeError('Paste at least one customer review line above to analyze.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const data = await postJson<{
        sentimentScore: number;
        topComplaint: string;
        complaintMentions: number;
        topPositive: string;
        positiveMentions: number;
        recommendation: string;
      }>('/api/ai/analyze-reviews', {
        sku: targetCluster?.sku || 'CUSTOM-SKU',
        productName: targetCluster?.productName || 'Custom Product Batch',
        reviews: reviewsToAnalyze,
      });
      if (targetCluster) {
        onUpdateReviewCluster(targetCluster.sku, {
          sentimentScore: data.sentimentScore,
          topComplaint: data.topComplaint,
          complaintMentions: data.complaintMentions,
          topPositive: data.topPositive,
          positiveMentions: data.positiveMentions,
          recommendation: data.recommendation,
        });
      }
      setCustomReviewInput('');
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : 'Unable to reach review analysis service.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Order Exception &amp; Refund Center
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Automated detection of missing waybills, failed courier tracking, dispatch SLA risks, and customer refund/review clusters.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('exceptions')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'exceptions'
                  ? 'bg-[#1E2536] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Order Exceptions ({openExceptionsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-[#1E2536] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Refund &amp; Review Trends ({reviews.length})
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'exceptions' ? (
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                  <th className="px-5 py-3">Order &amp; Waybill</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Courier Status</th>
                  <th className="px-4 py-3">Channel Status</th>
                  <th className="px-4 py-3">Exception</th>
                  <th className="px-4 py-3">Automated Action</th>
                  <th className="px-5 py-3 text-right">Resolve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {shipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      No order exceptions loaded. Switch Workspace Data to Use Demo in the sidebar to inspect sample courier reconciliations.
                    </td>
                  </tr>
                ) : (
                  shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-100">
                          {s.orderNumber}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {s.waybill} · {s.marketplaceLabel}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-400" />
                          {s.courier}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-200">{s.courierStatus}</td>
                      <td
                        className={`px-4 py-4 font-medium ${
                          s.issueFlag !== 'nominal' && !s.synced
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {s.marketplaceStatus}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {s.synced || s.issueFlag === 'nominal' ? (
                          <span className="font-medium text-emerald-400">Resolved</span>
                        ) : s.issueFlag === 'missing_waybill' ? (
                          <span className="font-semibold text-rose-400">Missing Waybill</span>
                        ) : s.issueFlag === 'sla_risk' ? (
                          <span className="font-semibold text-rose-400">
                            Dispatch SLA Risk ({s.daysElapsed}d)
                          </span>
                        ) : s.issueFlag === 'status_mismatch' ? (
                          <span className="font-semibold text-amber-400">Status Mismatch</span>
                        ) : s.issueFlag === 'failed_delivery' ? (
                          <span className="font-semibold text-rose-400">Failed Tracking</span>
                        ) : (
                          <span className="font-semibold text-amber-400">
                            Delayed ({s.daysElapsed}d)
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-xs text-slate-400">
                        {s.recommendedAction}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.synced ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Synced
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSyncShipment(s.orderNumber)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Resolve Exception
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#121620] px-6 py-12 text-center text-sm text-slate-400">
                No review clusters loaded. Paste customer reviews on the right to analyze sentiment, or load Demo Data.
              </div>
            ) : (
              reviews.map((cluster) => (
                <article
                  key={cluster.id}
                  className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-100">
                        {cluster.productName}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {cluster.sku} · {cluster.marketplace} ·{' '}
                        <span className="tabular-nums">{cluster.totalReviews} reviews</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Sentiment </span>
                      <span
                        className={`text-lg font-bold tabular-nums ${scoreColorClass(
                          cluster.sentimentScore
                        )}`}
                      >
                        {cluster.sentimentScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3.5">
                      <p className="text-xs font-medium text-rose-300">Top Complaint Driver</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {cluster.topComplaint}
                      </p>
                      <p className="mt-1 text-xs text-rose-300 tabular-nums">
                        Mentions: {cluster.complaintMentions}
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3.5">
                      <p className="text-xs font-medium text-emerald-300">
                        Top Positive Theme
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {cluster.topPositive}
                      </p>
                      <p className="mt-1 text-xs text-emerald-300 tabular-nums">
                        Mentions: {cluster.positiveMentions}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <p className="text-xs font-medium text-slate-400">
                      Recommended Operational Action
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-100">
                      {cluster.recommendation}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-4 self-start">
            <h2 className="text-base font-semibold text-slate-100">Analyze Review Batch</h2>
            <p className="mt-1 text-xs text-slate-400">
              Select a SKU and paste customer reviews (one per line) to cluster return &amp; quality issues via Gemini AI.
            </p>

            <form onSubmit={handleAnalyzeCustomReviews} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="review-sku"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Target SKU
                </label>
                <select
                  id="review-sku"
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  disabled={reviews.length === 0}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                >
                  {reviews.length === 0 ? (
                    <option value="">Custom review batch</option>
                  ) : (
                    reviews.map((r) => (
                      <option key={r.sku} value={r.sku} className="bg-[#121620]">
                        {r.sku} — {r.productName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="review-lines"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Customer Reviews (Optional override)
                </label>
                <textarea
                  id="review-lines"
                  rows={5}
                  value={customReviewInput}
                  onChange={(e) => setCustomReviewInput(e.target.value)}
                  placeholder="Paste customer comments here, one per line..."
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {analyzeError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{analyzeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={analyzing}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Clustering Reviews...
                  </>
                ) : (
                  <>
                    <ListFilter className="h-4 w-4" />
                    Run Sentiment Analysis
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
