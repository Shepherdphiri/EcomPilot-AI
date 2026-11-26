import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { MarketplaceHealth, MarketplaceId } from '../types/ecom';
import { formatZar, scoreColorClass } from '../utils/formatters';

interface MarketplaceHealthViewProps {
  marketplaces: MarketplaceHealth[];
  onSyncMarketplace: (id: MarketplaceId) => void;
  onSyncAll: () => void;
  onOpenConnect: () => void;
}

export const MarketplaceHealthView: React.FC<MarketplaceHealthViewProps> = ({
  marketplaces,
  onSyncMarketplace,
  onSyncAll,
  onOpenConnect,
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

  const totalRevenue = marketplaces.reduce((s, m) => s + m.revenueYesterdayZar, 0);
  const totalOrders = marketplaces.reduce((s, m) => s + m.ordersYesterday, 0);
  const totalReturns = marketplaces.reduce((s, m) => s + m.returnsCount, 0);
  const totalSuppressed = marketplaces.reduce((s, m) => s + m.suppressedListings, 0);
  const avgSla =
    marketplaces.length > 0
      ? (
          marketplaces.reduce((s, m) => s + m.fulfillmentSlaPercent, 0) /
          marketplaces.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Marketplace Command Centre
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Unified channel performance across Shopify, Takealot, Makro Marketplace, Amazon Seller &amp; Vendor Central, and WooCommerce.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenConnect}
              className="min-h-[38px] rounded-lg border border-white/[0.1] bg-[#171C28] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1E2536] whitespace-nowrap"
            >
              Manage API Keys
            </button>
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncingId !== null}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingId === 'all' ? 'animate-spin' : ''}`} />
              Sync All Channels
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-5">
          <div>
            <p className="text-xs text-slate-400">24h Gross Revenue</p>
            <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">
              {formatZar(totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Orders</p>
            <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">{totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Returns Flagged</p>
            <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">{totalReturns}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Suppressed Offers</p>
            <p className="mt-1 text-xl font-bold text-rose-400 tabular-nums">
              {totalSuppressed}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Avg Fulfillment SLA</p>
            <p className="mt-1 text-xl font-bold text-emerald-400 tabular-nums">{avgSla}%</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                <th className="px-5 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Returns / Cancels</th>
                <th className="px-4 py-3 text-right">SLA %</th>
                <th className="px-4 py-3 text-right">Active / Total</th>
                <th className="px-4 py-3 text-right">Suppressed</th>
                <th className="px-4 py-3 text-right">Health</th>
                <th className="px-5 py-3 text-right">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {marketplaces.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No marketplaces loaded. Connect Shopify or Takealot under Connect Channels, or switch Workspace Data to Use Demo in the sidebar.
                  </td>
                </tr>
              ) : (
                marketplaces.map((mp) => (
                  <tr key={mp.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-100">{mp.name}</p>
                      <p className="text-xs text-slate-400">
                        {mp.connectorType} · {mp.region} · Synced {mp.lastSynced}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-100 tabular-nums">
                      {mp.ordersYesterday}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-100 tabular-nums">
                      {formatZar(mp.revenueYesterdayZar)}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-300 tabular-nums">
                      {mp.returnsCount} ret / {mp.cancellationsCount} can
                    </td>
                    <td className="px-4 py-4 text-right text-xs font-medium text-emerald-400 tabular-nums">
                      {mp.fulfillmentSlaPercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-300 tabular-nums">
                      {mp.activeListings}/{mp.totalListings}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-semibold tabular-nums ${
                        mp.suppressedListings > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {mp.suppressedListings}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`text-sm font-bold tabular-nums ${scoreColorClass(
                          mp.healthScore
                        )}`}
                      >
                        {mp.healthScore}/100
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSyncOne(mp.id)}
                        disabled={syncingId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1E2536] disabled:opacity-50 whitespace-nowrap"
                      >
                        {syncingId === mp.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        Refresh
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
