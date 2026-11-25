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

      const data = await postJson<LiveSyncPayload>('/api/connectors/sync', body);

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

  const handleDisconnectAndRestoreDemo = async () => {
    await fetch('/api/connectors/disconnect', { method: 'POST' });
    setStoreDomain('');
    setShopifyToken('');
    setTakealotKey('');
    setErrorMsg(null);
    onUseDemoData();
  };

  const handleDisconnectAndClear = async () => {
    await fetch('/api/connectors/disconnect', { method: 'POST' });
    setStoreDomain('');
    setShopifyToken('');
    setTakealotKey('');
    setErrorMsg(null);
    onClearDemoData();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Connect Channels
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Connect your live Shopify store and Takealot Seller account to replace sample data with real listings, stock cover, price gaps, and priority tasks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {isLiveMode ? (
              <>
                <button
                  type="button"
                  onClick={handleDisconnectAndClear}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  Disconnect & Clear Data
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectAndRestoreDemo}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Demo Data
                </button>
              </>
            ) : dataMode === 'demo' ? (
              <button
                type="button"
                onClick={onClearDemoData}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Remove Demo Data
              </button>
            ) : (
              <button
                type="button"
                onClick={onUseDemoData}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Load Demo Data
              </button>
            )}
          </div>
        </div>

        {lastSyncSummary && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Shopify Variants</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                {lastSyncSummary.shopifyListings}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Takealot Offers</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                {lastSyncSummary.takealotListings}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Matched Cross-Channel SKUs</p>
              <p className="mt-1 text-xl font-semibold text-blue-700 tabular-nums">
                {lastSyncSummary.matchedAliases}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Priority Issues Flagged</p>
              <p className="mt-1 text-xl font-semibold text-amber-700 tabular-nums">
                {lastSyncSummary.tasksDetected}
              </p>
            </div>
          </div>
        )}
      </section>

      <form onSubmit={handleConnectAndSync} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Shopify Card */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Shopify D2C Store
                </h2>
                <p className="text-xs text-slate-500">
                  Admin GraphQL API · Products, inventory & 14-day orders
                </p>
              </div>
              {shopifyConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-slate-500">Not connected</span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="shopify-domain"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Shopify Store Domain
                </label>
                <input
                  id="shopify-domain"
                  type="text"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="shopify-token"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Admin API Access Token
                </label>
                <input
                  id="shopify-token"
                  type="password"
                  value={shopifyToken}
                  onChange={(e) => setShopifyToken(e.target.value)}
                  placeholder={shopifyConnected ? 'Token active in session (enter new to replace)' : 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx'}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                Shopify Admin → Settings → Apps and sales channels → Develop apps → Create app → Enable <span className="font-medium text-slate-800">read_products, write_products, read_orders, read_inventory</span> → Install app and copy the Admin API token.
              </div>
            </div>
          </section>

          {/* Takealot Card */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Takealot Marketplace
                </h2>
                <p className="text-xs text-slate-500">
                  Takealot Seller API v2 · Offers, buyable status & 14-day sales
                </p>
              </div>
              {takealotConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-slate-500">Not connected</span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="takealot-key"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Takealot Seller API Key
                </label>
                <input
                  id="takealot-key"
                  type="password"
                  value={takealotKey}
                  onChange={(e) => setTakealotKey(e.target.value)}
                  placeholder={takealotConnected ? 'Key active in session (enter new to replace)' : 'Paste your Takealot Seller API key'}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                Takealot Seller Portal → Profile / Settings → API Integrations → Generate Seller API Key. Credentials remain in server session memory only and are never saved in browser storage.
              </div>
            </div>
          </section>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            You can connect either Shopify alone, Takealot alone, or both together for cross-channel SKU matching.
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
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing Live Store Data...
              </>
            ) : isLiveMode ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Live Sync
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Connect & Sync Live Data
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
