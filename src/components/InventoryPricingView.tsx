import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, PackagePlus } from 'lucide-react';
import { InventoryItem, PriceComparisonRow } from '../types/ecom';
import { formatZar } from '../utils/formatters';

interface InventoryPricingViewProps {
  inventory: InventoryItem[];
  pricing: PriceComparisonRow[];
  onOrderRestock: (sku: string, units: number) => void;
  onSyncPriceParity: (sku: string) => void;
}

export const InventoryPricingView: React.FC<InventoryPricingViewProps> = ({
  inventory,
  pricing,
  onOrderRestock,
  onSyncPriceParity,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'pricing'>('inventory');

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Inventory & Pricing Intelligence
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Real-time days-of-cover forecasting paired with cross-channel price parity monitoring.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inventory Cover ({inventory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'pricing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Channel Pricing ({pricing.filter((p) => !p.resolved).length} Alerts)
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'inventory' ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Product & SKU</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Daily Velocity</th>
                  <th className="px-4 py-3 text-right">Stock Cover</th>
                  <th className="px-4 py-3 text-right">Incoming</th>
                  <th className="px-4 py-3">Stockout Risk</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inventory.map((item) => {
                  const daysCover =
                    item.dailySalesVelocity > 0
                      ? Math.round((item.currentStock / item.dailySalesVelocity) * 10) / 10
                      : 999;
                  const isCritical = daysCover <= 5;
                  const isWarning = daysCover > 5 && daysCover <= item.reorderPointDays;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded border border-slate-200 object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              SKU {item.sku} · {formatZar(item.sellingPriceZar)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                        {item.currentStock} units
                      </td>
                      <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-700">
                        {item.dailySalesVelocity}/day
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono font-bold tabular-nums ${
                          isCritical
                            ? 'text-red-700'
                            : isWarning
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {daysCover} days
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs tabular-nums text-slate-600">
                        {item.incomingStock > 0
                          ? `+${item.incomingStock} (${item.incomingEtaDays}d ETA)`
                          : 'None scheduled'}
                      </td>
                      <td className="px-4 py-4">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Stockout predicted in {Math.round(daysCover)} days
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Below {item.reorderPointDays}d cover threshold
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Healthy runway
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOrderRestock(item.sku, 120)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Log +120 PO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">SKU & Product</th>
                  <th className="px-4 py-3 text-right">Shopify</th>
                  <th className="px-4 py-3 text-right">Amazon</th>
                  <th className="px-4 py-3 text-right">Takealot</th>
                  <th className="px-4 py-3 text-right">Makro</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3">AI Recommendation</th>
                  <th className="px-6 py-3 text-right">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pricing.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{row.productName}</p>
                      <p className="font-mono text-xs text-slate-500">
                        SKU {row.sku} · Cost {formatZar(row.costZar)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                      {row.prices.shopify ? formatZar(row.prices.shopify) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                      {row.prices.amazon_seller ? formatZar(row.prices.amazon_seller) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-slate-900">
                      {row.prices.takealot ? formatZar(row.prices.takealot) : '—'}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-mono font-semibold tabular-nums ${
                        !row.resolved && row.prices.makro && row.prices.makro < row.targetPriceZar
                          ? 'text-red-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {row.prices.makro ? formatZar(row.prices.makro) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums">
                      {row.variancePercent > 0 ? (
                        <span className="font-semibold text-amber-700">
                          -{row.variancePercent}%
                        </span>
                      ) : (
                        <span className="text-emerald-700">0%</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-4 text-xs text-slate-600">
                      {row.recommendation}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.resolved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aligned
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncPriceParity(row.sku)}
                          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                        >
                          Sync to {formatZar(row.targetPriceZar)}
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
