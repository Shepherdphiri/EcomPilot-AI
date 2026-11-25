import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { MarketplaceHealth, MarketplaceId } from '../types/ecom';
import { formatZar, scoreColorClass } from '../utils/formatters';

interface MarketplaceHealthViewProps {
  marketplaces: MarketplaceHealth[];
  onSyncMarketplace: (id: MarketplaceId) => void;
  onSyncAll: () => void;
}

export const MarketplaceHealthView: React.FC<MarketplaceHealthViewProps> = ({
  marketplaces,
  onSyncMarketplace,
  onSyncAll,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSyncOne = (id: MarketplaceId) => {
    setSyncingId(id);
    setTimeout(() => {
      onSyncMarketplace(id);
      setSyncingId(null);
    }, 350);
  };

  const handleSyncAll = () => {
    setSyncingId('all');
    setTimeout(() => {
      onSyncAll();
      setSyncingId(null);
    }, 450);
  };

  const totalListings = marketplaces.reduce((s, m) => s + m.totalListings, 0);
  const totalSuppressed = marketplaces.reduce((s, m) => s + m.suppressedListings, 0);
  const avgScore = Math.round(
    marketplaces.reduce((s, m) => s + m.healthScore, 0) / marketplaces.length
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Marketplace Health Monitor
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Modular connector telemetry across Shopify, Amazon Seller & Vendor Central, Takealot, Makro, and Leroy Merlin.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncingId !== null}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${syncingId === 'all' ? 'animate-spin' : ''}`} />
            Sync All Connectors
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Connected Channels</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {marketplaces.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Catalog Listings</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalListings}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Suppressed Listings</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-red-700 tabular-nums">
              {totalSuppressed}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Average Health Score</p>
            <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${scoreColorClass(avgScore)}`}>
              {avgScore}/100
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Marketplace</th>
                <th className="px-4 py-3">Adapter</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Active</th>
                <th className="px-4 py-3 text-right">Suppressed</th>
                <th className="px-4 py-3 text-right">Inventory Issues</th>
                <th className="px-4 py-3 text-right">Content Issues</th>
                <th className="px-4 py-3 text-right">Yesterday Rev</th>
                <th className="px-4 py-3 text-right">Health Score</th>
                <th className="px-6 py-3 text-right">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {marketplaces.map((mp) => (
                <tr key={mp.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{mp.name}</p>
                    <p className="text-xs text-slate-500">
                      {mp.region} · Synced {mp.lastSynced}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600">
                    {mp.connectorType}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                    {mp.totalListings}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                    {mp.activeListings}
                  </td>
                  <td
                    className={`px-4 py-4 text-right font-mono font-semibold tabular-nums ${
                      mp.suppressedListings > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {mp.suppressedListings}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-700">
                    {mp.inventoryIssues}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-700">
                    {mp.contentIssues}
                  </td>
                  <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                    {formatZar(mp.revenueYesterdayZar)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${scoreColorClass(
                        mp.healthScore
                      )}`}
                    >
                      {mp.healthScore}/100
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSyncOne(mp.id)}
                      disabled={syncingId !== null}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      {syncingId === mp.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      Refresh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
