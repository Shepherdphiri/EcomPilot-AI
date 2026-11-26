import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Flame, PackagePlus, PauseCircle, Search } from 'lucide-react';
import { InventoryItem } from '../types/ecom';
import { channelShortName, formatZar } from '../utils/formatters';

interface InventoryCommandViewProps {
  inventory: InventoryItem[];
  onCreatePoFromInventory: (item: InventoryItem, quantity: number) => void;
}

type InventoryFilter = 'all' | 'low_stock' | 'overstock' | 'dead_stock';

export const InventoryCommandView: React.FC<InventoryCommandViewProps> = ({
  inventory,
  onCreatePoFromInventory,
}) => {
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [search, setSearch] = useState('');
  const [flaggedActions, setFlaggedActions] = useState<Record<string, 'promo_paused' | 'liquidation_queued'>>({});

  const enriched = useMemo(() => {
    return inventory.map((item) => {
      const daysCover =
        item.dailySalesVelocity > 0
          ? Math.round((item.availableStock / item.dailySalesVelocity) * 10) / 10
          : 999;
      const isDeadStock = item.daysSinceLastSale >= 60 || (item.dailySalesVelocity === 0 && item.availableStock > 0);
      const isOverstock = !isDeadStock && daysCover >= 90;
      const isLowStock = !isDeadStock && daysCover <= item.reorderPointDays;
      const isCritical = !isDeadStock && daysCover <= 5;
      const stockoutDate =
        item.dailySalesVelocity > 0
          ? new Date(Date.now() + Math.round(daysCover) * 86400000).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'short',
            })
          : '—';

      return {
        ...item,
        daysCover,
        isDeadStock,
        isOverstock,
        isLowStock,
        isCritical,
        stockoutDate,
      };
    });
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((i) => {
        if (filter === 'low_stock') return i.isLowStock;
        if (filter === 'overstock') return i.isOverstock;
        if (filter === 'dead_stock') return i.isDeadStock;
        return true;
      })
      .filter(
        (i) =>
          !q ||
          i.sku.toLowerCase().includes(q) ||
          i.productName.toLowerCase().includes(q) ||
          i.supplierName.toLowerCase().includes(q)
      );
  }, [enriched, filter, search]);

  const deadStockCapitalZar = enriched
    .filter((i) => i.isDeadStock)
    .reduce((sum, i) => sum + i.availableStock * i.unitCostZar, 0);
  const lowStockCount = enriched.filter((i) => i.isLowStock).length;
  const overstockCount = enriched.filter((i) => i.isOverstock).length;
  const deadStockCount = enriched.filter((i) => i.isDeadStock).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Inventory Command Centre
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Multi-channel available, reserved, and incoming stock with AI days-of-cover forecasting, dead stock detection, and supplier lead-time replenishment.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or supplier..."
              className="w-full rounded-lg border border-white/[0.08] bg-[#0B0D12] py-2 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Active Catalog SKUs</p>
            <p className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
              {inventory.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Low Stock / Urgent Reorder</p>
            <p className="mt-1 text-2xl font-bold text-rose-400 tabular-nums">
              {lowStockCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Overstock (&gt;90d Cover)</p>
            <p className="mt-1 text-2xl font-bold text-amber-400 tabular-nums">
              {overstockCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Dead Stock Capital Tied Up</p>
            <p className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
              {formatZar(deadStockCapitalZar)}
            </p>
          </div>
        </div>

        {(deadStockCount > 0 || lowStockCount > 0) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3.5 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              <ArrowLeftRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>
                Multi-DC Balance: <strong>JHB Midrand DC</strong> vs <strong>CPT Montague Gardens</strong>{' '}
                — rebalance fast-moving stock before air-freighting emergency Takealot CPT FBT replenishment.
              </span>
            </div>
            {deadStockCapitalZar > 0 && (
              <span className="text-amber-400 tabular-nums">
                Unlock up to {formatZar(Math.round(deadStockCapitalZar * 0.7))} via 20% clearance bundles
              </span>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 lg:px-6">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-1">
            {(
              [
                { id: 'all', label: 'All SKUs', count: enriched.length },
                { id: 'low_stock', label: 'Low Stock', count: lowStockCount },
                { id: 'overstock', label: 'Overstock', count: overstockCount },
                { id: 'dead_stock', label: 'Dead Stock', count: deadStockCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-[#1E2536] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label} <span className="ml-1 text-slate-400 tabular-nums">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                <th className="px-5 py-3">SKU & Warehouse</th>
                <th className="px-4 py-3 text-right">Avail / Resv</th>
                <th className="px-4 py-3 text-right">Incoming</th>
                <th className="px-4 py-3 text-right">Velocity</th>
                <th className="px-4 py-3 text-right">Cover / Stockout</th>
                <th className="px-4 py-3">Lead Time & Status</th>
                <th className="px-5 py-3 text-right">Replenishment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No matching inventory SKUs. Connect channels or switch Workspace Data to Use Demo in the sidebar.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-md border border-white/[0.08] object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100">{item.productName}</p>
                          <p className="text-xs text-slate-400">
                            <span className="font-mono">{item.sku}</span> · {item.warehouse} ·{' '}
                            {item.affectedChannels.map(channelShortName).join(', ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      <span className="font-semibold text-slate-100">{item.availableStock}</span>
                      <span className="text-xs text-slate-500"> / {item.reservedStock} res</span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs tabular-nums text-slate-300">
                      {item.incomingStock > 0
                        ? `+${item.incomingStock} (${item.incomingEtaDays}d)`
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">
                      {item.dailySalesVelocity}/day
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      <p
                        className={`font-bold ${
                          item.isDeadStock
                            ? 'text-slate-400'
                            : item.isCritical
                            ? 'text-rose-400'
                            : item.isLowStock
                            ? 'text-amber-400'
                            : item.isOverstock
                            ? 'text-blue-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.daysCover >= 900 ? 'No sales' : `${item.daysCover} days`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.daysCover >= 900 ? `${item.daysSinceLastSale}d idle` : `Est. out ${item.stockoutDate}`}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="text-slate-300">
                        {item.supplierName} ({item.leadTimeDays}d lead)
                      </p>
                      {item.isDeadStock ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          Dead stock ({item.daysSinceLastSale}d stagnant)
                        </span>
                      ) : item.isOverstock ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Overstock — run bundle promo
                        </span>
                      ) : item.isCritical ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          Critical stockout risk
                        </span>
                      ) : item.isLowStock ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Reorder threshold reached
                        </span>
                      ) : (
                        <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Optimal runway
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {item.isCritical && (
                          <button
                            type="button"
                            onClick={() =>
                              setFlaggedActions((prev) => ({
                                ...prev,
                                [item.sku]: 'promo_paused',
                              }))
                            }
                            className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                              flaggedActions[item.sku] === 'promo_paused'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                            }`}
                          >
                            <PauseCircle className="h-3.5 w-3.5" />
                            {flaggedActions[item.sku] === 'promo_paused'
                              ? 'Ads Shielded'
                              : 'Pause Promos'}
                          </button>
                        )}
                        {item.suggestedReorderQty > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onCreatePoFromInventory(item, item.suggestedReorderQty)
                            }
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Create PO (+{item.suggestedReorderQty})
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setFlaggedActions((prev) => ({
                                ...prev,
                                [item.sku]: 'liquidation_queued',
                              }))
                            }
                            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                              flaggedActions[item.sku] === 'liquidation_queued'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-white/[0.1] bg-[#171C28] text-slate-200 hover:bg-[#1E2536]'
                            }`}
                          >
                            <Flame className="h-3.5 w-3.5 text-amber-400" />
                            {flaggedActions[item.sku] === 'liquidation_queued'
                              ? 'Liquidation Queued'
                              : 'Queue Bundle Clearance'}
                          </button>
                        )}
                      </div>
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
