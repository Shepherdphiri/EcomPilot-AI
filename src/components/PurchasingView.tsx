import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import {
  InventoryItem,
  PurchaseOrderRecord,
  SupplierRecord,
} from '../types/ecom';
import { formatZar } from '../utils/formatters';

interface PurchasingViewProps {
  suppliers: SupplierRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  inventory: InventoryItem[];
  onCreatePo: (item: InventoryItem, quantity: number) => void;
  onMarkPoReceived: (poId: string) => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  suppliers,
  purchaseOrders,
  inventory,
  onCreatePo,
  onMarkPoReceived,
}) => {
  const aiSuggestions = inventory
    .filter((i) => {
      const cover = i.dailySalesVelocity > 0 ? i.availableStock / i.dailySalesVelocity : 999;
      return cover <= i.reorderPointDays && i.suggestedReorderQty > 0;
    })
    .slice(0, 4);

  const openPoValue = purchaseOrders
    .filter((po) => po.status !== 'received')
    .reduce((sum, po) => sum + po.totalCostZar, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Purchasing &amp; Suppliers
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Supplier lead-time tracking, purchase order automation, cost monitoring, and AI replenishment recommendations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right sm:flex sm:gap-6">
            <div>
              <p className="text-[11px] text-slate-400">Active Suppliers</p>
              <p className="text-lg font-bold text-slate-100 tabular-nums">
                {suppliers.length}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Open PO Value</p>
              <p className="text-lg font-bold text-blue-400 tabular-nums">
                {formatZar(openPoValue)}
              </p>
            </div>
          </div>
        </div>

        {/* AI Purchasing Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="mt-5 border-t border-white/[0.08] pt-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              AI Replenishment Recommendations
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {aiSuggestions.map((item) => {
                const daysCover =
                  item.dailySalesVelocity > 0
                    ? Math.round((item.availableStock / item.dailySalesVelocity) * 10) / 10
                    : 0;
                const supplier = suppliers.find((s) => s.id === item.supplierId);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#0E1118] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">
                        Create PO for {item.sku} ({item.suggestedReorderQty} units)
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.productName} · {daysCover}d cover · Lead time {item.leadTimeDays}d
                        {supplier?.delayRisk === 'high' ? ' · Supplier delay risk detected' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreatePo(item, item.suggestedReorderQty)}
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
                    >
                      Issue PO
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Purchase Orders Table */}
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620] xl:col-span-7">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100">Purchase Orders</h2>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {purchaseOrders.length} orders
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                  <th className="px-5 py-3">PO &amp; SKU</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-4 py-3">Status &amp; ETA</th>
                  <th className="px-5 py-3 text-right">Receive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                      No purchase orders issued yet. Use AI Replenishment Recommendations above to issue your first PO.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold text-slate-100">
                          {po.poNumber} · {po.sku}
                        </p>
                        <p className="text-xs text-slate-400">{po.supplierName}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-100 tabular-nums">
                        {po.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-200 tabular-nums">
                        {formatZar(po.totalCostZar)}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {po.status === 'received' ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Received into DC
                          </span>
                        ) : po.status === 'delayed' ? (
                          <span className="inline-flex items-center gap-1 font-medium text-rose-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Delayed ({po.etaDays}d ETA)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            In Transit ({po.etaDays}d ETA)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {po.status !== 'received' ? (
                          <button
                            type="button"
                            onClick={() => onMarkPoReceived(po.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1E2536] whitespace-nowrap"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            Receive Stock
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Supplier Directory */}
        <section className="rounded-xl border border-white/[0.08] bg-[#121620] xl:col-span-5">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-100">
              Supplier Directory &amp; Risk
            </h2>
            <p className="text-xs text-slate-400">Lead times, MOQs, and port congestion alerts</p>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {suppliers.map((sup) => (
              <li key={sup.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{sup.name}</p>
                    <p className="text-xs text-slate-400">
                      {sup.country} · MOQ {sup.moqUnits} units · {sup.activeSkusCount} SKUs
                    </p>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <p className="font-semibold text-slate-100">{sup.avgLeadTimeDays}d lead</p>
                    <p
                      className={
                        sup.onTimeRatePercent >= 95
                          ? 'text-emerald-400'
                          : sup.onTimeRatePercent >= 88
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {sup.onTimeRatePercent}% on-time
                    </p>
                  </div>
                </div>
                {sup.delayNote && (
                  <p className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300">
                    {sup.delayNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
