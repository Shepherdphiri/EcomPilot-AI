import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  DailyReportData,
  InventoryItem,
  MarketplaceHealth,
  PriceComparisonRow,
  PriorityTask,
} from '../types/ecom';
import { postJson } from '../utils/api';

export interface LiveSyncPayload {
  summary: {
    shopifyListings: number;
    takealotListings: number;
    matchedAliases: number;
    tasksDetected: number;
  };
  marketplaces: MarketplaceHealth[];
  tasks: PriorityTask[];
  inventory: InventoryItem[];
  pricing: PriceComparisonRow[];
  dailyReport: DailyReportData;
}

interface ConnectChannelsViewProps {
  activeCompanyId?: string;
  dataMode: 'demo' | 'clean';
  isLiveMode: boolean;
  shopifyConnected: boolean;
  shopifyDomain: string | null;
  takealotConnected: boolean;
  lastSyncSummary: LiveSyncPayload['summary'] | null;
  onSyncSuccess: (
    payload: LiveSyncPayload,
    status: {
      shopifyConnected: boolean;
      shopifyDomain: string | null;
      takealotConnected: boolean;
    }
  ) => void;
  onUseDemoData: () => void;
  onClearDemoData: () => void;
}

export const ConnectChannelsView: React.FC<ConnectChannelsViewProps> = ({
  activeCompanyId,
  dataMode,
  isLiveMode,
  shopifyConnected,
  shopifyDomain,
  takealotConnected,
  lastSyncSummary,
  onSyncSuccess,
  onUseDemoData,
  onClearDemoData,
}) => {
  const [storeDomain, setStoreDomain] = useState(shopifyDomain || '');
  const [shopifyToken, setShopifyToken] = useState('');
  const [takealotKey, setTakealotKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setErrorMsg(null);

    try {
      const body: Record<string, unknown> = {};
      if (storeDomain.trim() && shopifyToken.trim()) {
        body.shopify = {
          storeDomain: storeDomain.trim(),
          accessToken: shopifyToken.trim(),
        };
      }
      if (takealotKey.trim()) {
        body.takealot = { apiKey: takealotKey.trim() };
      }

      const data = await postJson<LiveSyncPayload>(
        '/api/connectors/sync',
        body,
        activeCompanyId
      );

      const nextShopifyConnected =
        shopifyConnected || Boolean(storeDomain.trim() && shopifyToken.trim());
      const nextTakealotConnected = takealotConnected || Boolean(takealotKey.trim());

      onSyncSuccess(data, {
        shopifyConnected: nextShopifyConnected,
        shopifyDomain: storeDomain.trim() || shopifyDomain,
        takealotConnected: nextTakealotConnected,
      });

      setShopifyToken('');
      setTakealotKey('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach marketplace sync server.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const tenantHeaders = activeCompanyId
    ? { 'x-company-id': activeCompanyId }
    : undefined;

  const handleDisconnectAndRestoreDemo = async () => {
    await fetch('/api/connectors/disconnect', {
      method: 'POST',
      headers: tenantHeaders,
    });
    setStoreDomain('');
    setShopifyToken('');
    setTakealotKey('');
    setErrorMsg(null);
    onUseDemoData();
  };

  const handleDisconnectAndClear = async () => {
    await fetch('/api/connectors/disconnect', {
      method: 'POST',
      headers: tenantHeaders,
    });
    setStoreDomain('');
    setShopifyToken('');
    setTakealotKey('');
    setErrorMsg(null);
    onClearDemoData();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              Connect Channels &amp; Workspace Data
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Connect live Shopify and Takealot Seller API credentials, or toggle between Demo Data and a Clean Workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {isLiveMode ? (
              <>
                <button
                  type="button"
                  onClick={handleDisconnectAndClear}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#171C28] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2536] whitespace-nowrap"
                >
                  Disconnect &amp; Clear Data
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectAndRestoreDemo}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#171C28] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2536] whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Use Demo Data
                </button>
              </>
            ) : dataMode === 'demo' ? (
              <button
                type="button"
                onClick={onClearDemoData}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#171C28] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2536] whitespace-nowrap"
              >
                Remove Demo Data
              </button>
            ) : (
              <button
                type="button"
                onClick={onUseDemoData}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#171C28] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2536] whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Use Demo Data
              </button>
            )}
          </div>
        </div>

        {lastSyncSummary && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Shopify Variants</p>
              <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">
                {lastSyncSummary.shopifyListings}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Takealot Offers</p>
              <p className="mt-1 text-xl font-bold text-slate-100 tabular-nums">
                {lastSyncSummary.takealotListings}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Matched Cross-Channel SKUs</p>
              <p className="mt-1 text-xl font-bold text-blue-400 tabular-nums">
                {lastSyncSummary.matchedAliases}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Priority Issues Flagged</p>
              <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">
                {lastSyncSummary.tasksDetected}
              </p>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={handleConnectAndSync} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Shopify D2C Store</h2>
                <p className="text-xs text-slate-400">
                  Admin GraphQL API · Products, inventory &amp; 14-day orders
                </p>
              </div>
              {shopifyConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-slate-500">Ready</span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="shopify-domain"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Shopify Store Domain
                </label>
                <input
                  id="shopify-domain"
                  type="text"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="shopify-token"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Admin API Access Token
                </label>
                <input
                  id="shopify-token"
                  type="password"
                  value={shopifyToken}
                  onChange={(e) => setShopifyToken(e.target.value)}
                  placeholder={
                    shopifyConnected
                      ? 'Token active in session (enter new to replace)'
                      : 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx'
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Takealot Marketplace
                </h2>
                <p className="text-xs text-slate-400">
                  Takealot Seller API v2 · Offers, buyable status &amp; 14-day sales
                </p>
              </div>
              {takealotConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-slate-500">Ready</span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="takealot-key"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Takealot Seller API Key
                </label>
                <input
                  id="takealot-key"
                  type="password"
                  value={takealotKey}
                  onChange={(e) => setTakealotKey(e.target.value)}
                  placeholder={
                    takealotConnected
                      ? 'Key active in session (enter new to replace)'
                      : 'Paste your Takealot Seller API key'
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <p className="rounded-lg border border-white/[0.06] bg-[#0E1118] p-3 text-xs leading-relaxed text-slate-400">
                Additional adapters configured in Workspace: Makro Mirakl Seller API, Amazon SP-API (Seller &amp; Vendor Central), and WooCommerce REST v3.
              </p>
            </div>
          </section>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#121620] px-5 py-4 lg:px-6">
          <p className="text-xs text-slate-400">
            Connect Shopify alone, Takealot alone, or both for live cross-channel SKU alias matching.
          </p>
          <button
            type="submit"
            disabled={
              syncing ||
              (!(storeDomain.trim() && shopifyToken.trim()) &&
                !takealotKey.trim() &&
                !shopifyConnected &&
                !takealotConnected)
            }
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing Live Data...
              </>
            ) : isLiveMode ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Live Sync
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Connect &amp; Sync Live Data
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
