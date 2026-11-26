import React, { useMemo, useState } from 'react';
import { AlertCircle, Calculator, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import {
  InventoryItem,
  PriceComparisonRow,
  ProfitRecoveryPlaybook,
} from '../types/ecom';
import { postJson } from '../utils/api';
import { formatZar } from '../utils/formatters';

interface PricingEngineViewProps {
  pricing: PriceComparisonRow[];
  inventory?: InventoryItem[];
  activeCompanyId?: string;
  onSyncPriceParity: (sku: string) => void;
}

function computeRowUnitEconomics(row: PriceComparisonRow) {
  const channelPrices = Object.values(row.prices).filter(
    (v): v is number => typeof v === 'number' && v > 0
  );
  const lowestChannelPrice =
    channelPrices.length > 0 ? Math.min(...channelPrices) : row.recommendedPriceZar;
  const priceExVat = lowestChannelPrice / 1.15;
  const commission = lowestChannelPrice * (row.marketplaceFeePct / 100);
  const returnAllowance = lowestChannelPrice * 0.02;
  const netProfit =
    priceExVat - (row.costZar + commission + row.fulfilmentFeeZar + returnAllowance);
  const netMarginPct = priceExVat > 0 ? (netProfit / priceExVat) * 100 : 0;

  // Minimum safe selling price (incl. 15% VAT) to achieve 15% net margin on ex-VAT revenue
  const marginDenom = 0.85 / 1.15 - row.marketplaceFeePct / 100 - 0.02;
  const floorPriceZar =
    marginDenom > 0
      ? Math.ceil((row.costZar + row.fulfilmentFeeZar) / marginDenom)
      : row.recommendedPriceZar;

  return {
    lowestChannelPrice,
    netProfit,
    netMarginPct,
    floorPriceZar,
    belowFloor: lowestChannelPrice < floorPriceZar,
  };
}

export const PricingEngineView: React.FC<PricingEngineViewProps> = ({
  pricing,
  inventory = [],
  activeCompanyId,
  onSyncPriceParity,
}) => {
  const [selectedSku, setSelectedSku] = useState(pricing[0]?.sku || '');
  const selectedRow = pricing.find((p) => p.sku === selectedSku) || pricing[0];

  const [simSellingPrice, setSimSellingPrice] = useState<number>(
    selectedRow?.recommendedPriceZar || 1799
  );
  const [simCogs, setSimCogs] = useState<number>(selectedRow?.costZar || 940);
  const [simFeePct, setSimFeePct] = useState<number>(
    selectedRow?.marketplaceFeePct || 14
  );
  const [simFulfilment, setSimFulfilment] = useState<number>(
    selectedRow?.fulfilmentFeeZar || 75
  );

  const [playbook, setPlaybook] = useState<ProfitRecoveryPlaybook | null>(null);
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [playbookError, setPlaybookError] = useState<string | null>(null);

  const handleLoadSkuIntoCalc = (row: PriceComparisonRow) => {
    setSelectedSku(row.sku);
    setSimSellingPrice(row.recommendedPriceZar);
    setSimCogs(row.costZar);
    setSimFeePct(row.marketplaceFeePct);
    setSimFulfilment(row.fulfilmentFeeZar);
  };

  const handleGeneratePlaybook = async () => {
    setPlaybookLoading(true);
    setPlaybookError(null);
    try {
      const result = await postJson<ProfitRecoveryPlaybook>(
        '/api/ai/profit-recovery',
        { inventory, pricing },
        activeCompanyId
      );
      setPlaybook(result);
    } catch (err) {
      setPlaybookError(
        err instanceof Error
          ? err.message
          : 'Unable to generate AI profit recovery playbook.'
      );
    } finally {
      setPlaybookLoading(false);
    }
  };

  const simEconomics = useMemo(() => {
    const priceExVat = simSellingPrice / 1.15;
    const vatAmount = simSellingPrice - priceExVat;
    const commission = simSellingPrice * (simFeePct / 100);
    const returnAllowance = simSellingPrice * 0.02;
    const totalCosts = simCogs + commission + simFulfilment + returnAllowance;
    const netProfit = priceExVat - totalCosts;
    const netMarginPct = priceExVat > 0 ? (netProfit / priceExVat) * 100 : 0;
    return {
      priceExVat,
      vatAmount,
      commission,
      returnAllowance,
      netProfit,
      netMarginPct,
    };
  }, [simSellingPrice, simCogs, simFeePct, simFulfilment]);

  const alertCount = pricing.filter((p) => !p.resolved).length;
  const floorBreaches = pricing.filter((p) => computeRowUnitEconomics(p).belowFloor).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              AI Pricing &amp; Margin Engine
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Live unit net profitability, 15% margin floor protection (SA VAT, channel commission, fulfilment), and competitor Buy Box parity.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-[11px] text-slate-400">Pricing Alerts</p>
              <p className="text-lg font-bold text-amber-400 tabular-nums">{alertCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Floor Breaches</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  floorBreaches > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {floorBreaches}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Monitored SKUs</p>
              <p className="text-lg font-bold text-slate-100 tabular-nums">{pricing.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 8 cols: Cross-Channel Price & Net Margin Leaderboard */}
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620] xl:col-span-8">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-100">
              Cross-Channel Price Parity &amp; True Net Profit Monitor
            </h2>
            <p className="text-xs text-slate-400">
              Click any SKU row to load its cost structure into the SA Margin Simulator
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                  <th className="px-5 py-3">SKU &amp; Status</th>
                  <th className="px-3 py-3 text-right">Shopify</th>
                  <th className="px-3 py-3 text-right">Takealot</th>
                  <th className="px-3 py-3 text-right">Makro / AMZ</th>
                  <th className="px-3 py-3 text-right">True Net / Unit</th>
                  <th className="px-3 py-3 text-right">15% Floor</th>
                  <th className="px-3 py-3 text-right">Rec. Price</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {pricing.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                      No pricing comparisons loaded. Connect channels or load Demo Data in the sidebar.
                    </td>
                  </tr>
                ) : (
                  pricing.map((row) => {
                    const makroOrAmz = row.prices.makro ?? row.prices.amazon_sc;
                    const econ = computeRowUnitEconomics(row);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleLoadSkuIntoCalc(row)}
                        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-100">{row.productName}</p>
                          <p className="text-xs text-slate-400">
                            <span className="font-mono">{row.sku}</span> · Cost{' '}
                            <span className="tabular-nums">{formatZar(row.costZar)}</span> ·{' '}
                            <span
                              className={
                                row.issueType === 'aligned'
                                  ? 'text-emerald-400'
                                  : row.issueType === 'margin_risk'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }
                            >
                              {row.issueType.replace('_', ' ')}
                            </span>
                          </p>
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-slate-200">
                          {row.prices.shopify ? formatZar(row.prices.shopify) : '—'}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-slate-200">
                          {row.prices.takealot ? formatZar(row.prices.takealot) : '—'}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-slate-200">
                          {makroOrAmz ? formatZar(makroOrAmz) : '—'}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums">
                          <p
                            className={`font-semibold ${
                              econ.netMarginPct >= 18
                                ? 'text-emerald-400'
                                : econ.netMarginPct >= 10
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {formatZar(econ.netProfit)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {econ.netMarginPct.toFixed(1)}%
                          </p>
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums">
                          <span
                            className={
                              econ.belowFloor ? 'font-semibold text-rose-400' : 'text-slate-400'
                            }
                          >
                            {formatZar(econ.floorPriceZar)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-bold text-blue-400 tabular-nums">
                          {formatZar(row.recommendedPriceZar)}
                        </td>
                        <td
                          className="px-5 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.resolved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aligned
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSyncPriceParity(row.sku)}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap"
                            >
                              Sync {formatZar(row.recommendedPriceZar)}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right 4 cols: Interactive Margin & Marketplace Fee Calculator */}
        <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-4 self-start">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3.5">
            <Calculator className="h-4 w-4 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">
              SA Margin &amp; Fee Simulator
            </h2>
          </div>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Selling Price (ZAR incl. 15% VAT)
              </label>
              <input
                type="number"
                value={simSellingPrice}
                onChange={(e) => setSimSellingPrice(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm font-semibold text-slate-100 tabular-nums focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Landed COGS (ZAR)
                </label>
                <input
                  type="number"
                  value={simCogs}
                  onChange={(e) => setSimCogs(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 tabular-nums focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Channel Fee (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={simFeePct}
                  onChange={(e) => setSimFeePct(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 tabular-nums focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Fulfilment &amp; Courier Fee (ZAR)
              </label>
              <input
                type="number"
                value={simFulfilment}
                onChange={(e) => setSimFulfilment(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 tabular-nums focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Output VAT (15%)</span>
              <span className="tabular-nums">-{formatZar(simEconomics.vatAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Marketplace Commission ({simFeePct}%)</span>
              <span className="tabular-nums">-{formatZar(simEconomics.commission)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Return Allowance (2%)</span>
              <span className="tabular-nums">-{formatZar(simEconomics.returnAllowance)}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.08] pt-2.5 text-sm font-bold">
              <span className="text-slate-100">Net Profit / Unit</span>
              <span
                className={`tabular-nums ${
                  simEconomics.netMarginPct >= 18
                    ? 'text-emerald-400'
                    : simEconomics.netMarginPct >= 10
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {formatZar(simEconomics.netProfit)} ({simEconomics.netMarginPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* AI Profit & Dead-Stock Recovery Playbook */}
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              AI 30-Day Margin &amp; Dead-Stock Recovery Playbook
            </h2>
            <p className="text-xs text-slate-400">
              Analyze cross-channel margin leakage, floor breaches, and dormant inventory capital to generate concrete ZAR recovery plays.
            </p>
          </div>
          <button
            type="button"
            disabled={playbookLoading || (pricing.length === 0 && inventory.length === 0)}
            onClick={handleGeneratePlaybook}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {playbookLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing Catalog...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate Recovery Playbook
              </>
            )}
          </button>
        </div>

        {playbookError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{playbookError}</span>
          </div>
        )}

        {playbook && (
          <div className="mt-5 space-y-4 border-t border-white/[0.08] pt-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm font-semibold text-slate-100">{playbook.headline}</p>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-[11px] text-slate-400">Est. 30-Day Recovery</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">
                  +{formatZar(playbook.estimated30DayRecoveryZar)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {playbook.plays.map((play, idx) => (
                <div
                  key={`${play.sku}-${idx}`}
                  className="rounded-lg border border-white/[0.08] bg-[#0B0D12] p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-blue-400">{play.sku}</span>
                    <span className="font-semibold text-emerald-400 tabular-nums">
                      +{formatZar(play.expectedImpactZar)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">{play.playType}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-200">{play.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

