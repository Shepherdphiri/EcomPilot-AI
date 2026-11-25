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
import { scoreColorClass } from '../utils/formatters';

interface ReviewsShippingViewProps {
  reviews: ReviewCluster[];
  shipments: ShipmentRecord[];
  onSyncShipment: (orderNumber: string) => void;
  onUpdateReviewCluster: (sku: string, updated: Partial<ReviewCluster>) => void;
}

export const ReviewsShippingView: React.FC<ReviewsShippingViewProps> = ({
  reviews,
  shipments,
  onSyncShipment,
  onUpdateReviewCluster,
}) => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'shipping'>('reviews');
  const [selectedSku, setSelectedSku] = useState(reviews[0]?.sku || '');
  const [customReviewInput, setCustomReviewInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleAnalyzeCustomReviews = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCluster = reviews.find((r) => r.sku === selectedSku) || reviews[0];
    const lines = customReviewInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const reviewsToAnalyze =
      lines.length > 0 ? lines : targetCluster.sampleReviews;

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch('/api/ai/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: targetCluster.sku,
          productName: targetCluster.productName,
          reviews: reviewsToAnalyze,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze reviews.');
      }
      onUpdateReviewCluster(targetCluster.sku, {
        sentimentScore: data.sentimentScore,
        topComplaint: data.topComplaint,
        complaintMentions: data.complaintMentions,
        topPositive: data.topPositive,
        positiveMentions: data.positiveMentions,
        recommendation: data.recommendation,
      });
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
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Reviews & Shipping Intelligence
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Automated customer complaint clustering and courier-to-marketplace waybill reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reviews Sentiment ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'shipping'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shipping & Waybills ({shipments.filter((s) => !s.synced).length} Flagged)
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'reviews' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            {reviews.map((cluster) => (
              <article
                key={cluster.id}
                className="rounded-lg border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {cluster.productName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      SKU {cluster.sku} · {cluster.marketplace} ·{' '}
                      <span className="font-mono tabular-nums">
                        {cluster.totalReviews} reviews
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Sentiment Score </span>
                    <span
                      className={`font-mono text-lg font-bold tabular-nums ${scoreColorClass(
                        cluster.sentimentScore
                      )}`}
                    >
                      {cluster.sentimentScore}/100
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-red-200 bg-red-50/50 p-3.5">
                    <p className="text-xs font-medium text-red-700">Top Complaint</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {cluster.topComplaint}
                    </p>
                    <p className="mt-1 font-mono text-xs text-red-700 tabular-nums">
                      Mentions: {cluster.complaintMentions}
                    </p>
                  </div>

                  <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3.5">
                    <p className="text-xs font-medium text-emerald-700">
                      Top Positive Feedback
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {cluster.topPositive}
                    </p>
                    <p className="mt-1 font-mono text-xs text-emerald-700 tabular-nums">
                      Mentions: {cluster.positiveMentions}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500">
                    Recommended Operational Action
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">
                    {cluster.recommendation}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-4 self-start">
            <h2 className="text-base font-semibold text-slate-900">
              Analyze Review Batch
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a SKU and paste new marketplace customer reviews (one per line) or re-run sentiment clustering on existing samples.
            </p>

            <form onSubmit={handleAnalyzeCustomReviews} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="review-sku"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Target SKU
                </label>
                <select
                  id="review-sku"
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                >
                  {reviews.map((r) => (
                    <option key={r.sku} value={r.sku}>
                      {r.sku} — {r.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="review-lines"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Customer Reviews (Optional override)
                </label>
                <textarea
                  id="review-lines"
                  rows={5}
                  value={customReviewInput}
                  onChange={(e) => setCustomReviewInput(e.target.value)}
                  placeholder="Paste customer review comments here, one per line..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              {analyzeError && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{analyzeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
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
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Order & Waybill</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Courier Status</th>
                  <th className="px-4 py-3">Marketplace Status</th>
                  <th className="px-4 py-3">Issue Flag</th>
                  <th className="px-4 py-3">Recommended Fix</th>
                  <th className="px-6 py-3 text-right">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {s.orderNumber}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {s.waybill} · {s.marketplaceLabel}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        {s.courier}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {s.courierStatus}
                    </td>
                    <td
                      className={`px-4 py-4 font-medium ${
                        s.issueFlag !== 'nominal' && !s.synced
                          ? 'text-red-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {s.marketplaceStatus}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {s.synced || s.issueFlag === 'nominal' ? (
                        <span className="font-medium text-emerald-700">Synced</span>
                      ) : s.issueFlag === 'status_mismatch' ? (
                        <span className="font-semibold text-red-700">
                          Status Mismatch
                        </span>
                      ) : s.issueFlag === 'failed_delivery' ? (
                        <span className="font-semibold text-red-700">
                          Delivery Failed
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          Delayed ({s.daysElapsed}d)
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-xs text-slate-600">
                      {s.recommendedAction}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.synced ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reconciled
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncShipment(s.orderNumber)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Push Status Sync
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
