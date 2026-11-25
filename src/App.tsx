import { useMemo, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import {
  INITIAL_DAILY_REPORT,
  INITIAL_INVENTORY,
  INITIAL_LISTING_AUDITS,
  INITIAL_MARKETPLACES,
  INITIAL_PRICING,
  INITIAL_REVIEWS,
  INITIAL_SHIPMENTS,
  INITIAL_TASKS,
} from './data/initialStoreData';
import {
  DailyReportData,
  InventoryItem,
  MarketplaceHealth,
  MarketplaceId,
  NavSection,
  PriceComparisonRow,
  PriorityTask,
  ProductListingAudit,
  ReviewCluster,
  ShipmentRecord,
  UserRole,
} from './types/ecom';
import { Sidebar } from './components/Sidebar';
import { PriorityCenterView } from './components/PriorityCenterView';
import { MarketplaceHealthView } from './components/MarketplaceHealthView';
import { ListingContentView } from './components/ListingContentView';
import { InventoryPricingView } from './components/InventoryPricingView';
import { ReviewsShippingView } from './components/ReviewsShippingView';
import { DailyReportView } from './components/DailyReportView';
import { AiAssistantView } from './components/AiAssistantView';
import { SystemBlueprintView } from './components/SystemBlueprintView';

const SECTION_TITLES: Record<NavSection, string> = {
  priority: 'Priority Center',
  marketplaces: 'Marketplace Health',
  listings: 'Listing & Content',
  inventory_pricing: 'Inventory & Pricing',
  reviews_shipping: 'Reviews & Shipping',
  daily_report: 'Morning Report',
  assistant: 'Operations Chat',
  blueprint: 'System Blueprint',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('priority');
  const [activeRole, setActiveRole] = useState<UserRole>('ecommerce_manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queuedAssistantPrompt, setQueuedAssistantPrompt] = useState<string | null>(
    null
  );

  const [tasks, setTasks] = useState<PriorityTask[]>(INITIAL_TASKS);
  const [marketplaces, setMarketplaces] = useState<MarketplaceHealth[]>(
    INITIAL_MARKETPLACES
  );
  const [listings, setListings] = useState<ProductListingAudit[]>(
    INITIAL_LISTING_AUDITS
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [pricing, setPricing] = useState<PriceComparisonRow[]>(INITIAL_PRICING);
  const [reviews, setReviews] = useState<ReviewCluster[]>(INITIAL_REVIEWS);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(INITIAL_SHIPMENTS);
  const [dailyReport, setDailyReport] = useState<DailyReportData>(
    INITIAL_DAILY_REPORT
  );

  const openTasks = useMemo(() => tasks.filter((t) => !t.resolved), [tasks]);
  const criticalCount = useMemo(
    () => openTasks.filter((t) => t.severity === 'critical').length,
    [openTasks]
  );

  const storeContextForAi = useMemo(
    () => ({
      yesterdayMetrics: {
        revenueZar: dailyReport.revenueYesterdayZar,
        deltaPercent: dailyReport.revenueDeltaPercent,
        orders: dailyReport.ordersCount,
        lowStockCount: dailyReport.lowStockProductsCount,
        suppressedCount: dailyReport.suppressedListingsCount,
        delayedDeliveriesCount: dailyReport.delayedDeliveriesCount,
        potentialRevenueLossZar: dailyReport.potentialRevenueLossZar,
      },
      openPriorityTasks: openTasks.map((t) => ({
        severity: t.severity,
        title: t.title,
        marketplace: t.marketplaceLabel,
        sku: t.sku,
        revenueImpactZar: t.revenueImpactZar,
      })),
      marketplaces: marketplaces.map((m) => ({
        name: m.name,
        healthScore: m.healthScore,
        suppressedListings: m.suppressedListings,
        inventoryIssues: m.inventoryIssues,
        contentIssues: m.contentIssues,
      })),
      inventoryCover: inventory.map((i) => ({
        sku: i.sku,
        product: i.productName,
        stock: i.currentStock,
        dailySales: i.dailySalesVelocity,
        daysOfCover:
          i.dailySalesVelocity > 0
            ? Math.round((i.currentStock / i.dailySalesVelocity) * 10) / 10
            : 999,
        incomingStock: i.incomingStock,
        incomingEtaDays: i.incomingEtaDays,
      })),
      pricingAlerts: pricing.filter((p) => !p.resolved),
      reviewInsights: reviews.map((r) => ({
        sku: r.sku,
        sentimentScore: r.sentimentScore,
        topComplaint: r.topComplaint,
        mentions: r.complaintMentions,
        recommendation: r.recommendation,
      })),
      flaggedShipments: shipments.filter((s) => !s.synced),
    }),
    [
      dailyReport,
      openTasks,
      marketplaces,
      inventory,
      pricing,
      reviews,
      shipments,
    ]
  );

  const handleResolveTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, resolved: true } : t))
    );
  };

  const handleReopenTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, resolved: false } : t))
    );
  };

  const handleSyncMarketplace = (id: MarketplaceId) => {
    setMarketplaces((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, lastSynced: 'Just now' } : m
      )
    );
  };

  const handleSyncAllMarketplaces = () => {
    setMarketplaces((prev) => prev.map((m) => ({ ...m, lastSynced: 'Just now' })));
  };

  const handleApplyGeneratedContent = (sku: string, newScore: number) => {
    setListings((prev) =>
      prev.map((l) =>
        l.sku === sku
          ? {
              ...l,
              listingScore: newScore,
              status: 'active',
              checks: {
                ...l.checks,
                titleQuality: Math.max(l.checks.titleQuality, 94),
                keywords: Math.max(l.checks.keywords, 92),
                descriptionQuality: Math.max(l.checks.descriptionQuality, 93),
                attributes: Math.max(l.checks.attributes, 94),
              },
            }
          : l
      )
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.sku === sku && t.targetSection === 'listings'
          ? { ...t, resolved: true }
          : t
      )
    );
  };

  const handleOrderRestock = (sku: string, units: number) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.sku === sku
          ? {
              ...i,
              incomingStock: i.incomingStock + units,
              incomingEtaDays: i.incomingEtaDays ?? 7,
            }
          : i
      )
    );
  };

  const handleSyncPriceParity = (sku: string) => {
    setPricing((prev) =>
      prev.map((p) => {
        if (p.sku !== sku) return p;
        const alignedPrices: PriceComparisonRow['prices'] = {};
        for (const ch of Object.keys(p.prices) as MarketplaceId[]) {
          alignedPrices[ch] = p.targetPriceZar;
        }
        return {
          ...p,
          prices: alignedPrices,
          issueType: 'aligned',
          variancePercent: 0,
          recommendation: `All channels synced to R${p.targetPriceZar} parity.`,
          resolved: true,
        };
      })
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.sku === sku && t.id === 'tsk-4' ? { ...t, resolved: true } : t
      )
    );
  };

  const handleSyncShipment = (orderNumber: string) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.orderNumber === orderNumber
          ? {
              ...s,
              marketplaceStatus:
                s.courierStatus === 'Delivered' ? 'Delivered' : s.marketplaceStatus,
              synced: true,
            }
          : s
      )
    );
  };

  const handleUpdateReviewCluster = (
    sku: string,
    updated: Partial<ReviewCluster>
  ) => {
    setReviews((prev) =>
      prev.map((r) => (r.sku === sku ? { ...r, ...updated } : r))
    );
  };

  const handleAskAiAboutTask = (prompt: string) => {
    setQueuedAssistantPrompt(prompt);
    setActiveSection('assistant');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        openTaskCount={openTasks.length}
        criticalCount={criticalCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 3-Zone Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 whitespace-nowrap">EcomPilot AI</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeSection !== 'priority' && e.target.value.trim()) {
                    setActiveSection('priority');
                  }
                }}
                placeholder="Filter SKUs or issues..."
                className="w-56 rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('assistant')}
              className="rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              Operations Chat
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 lg:p-8">
          {activeSection === 'priority' && (
            <PriorityCenterView
              tasks={tasks}
              marketplaces={marketplaces}
              activeRole={activeRole}
              searchQuery={searchQuery}
              onResolveTask={handleResolveTask}
              onReopenTask={handleReopenTask}
              onNavigate={setActiveSection}
              onAskAiAboutTask={handleAskAiAboutTask}
            />
          )}

          {activeSection === 'marketplaces' && (
            <MarketplaceHealthView
              marketplaces={marketplaces}
              onSyncMarketplace={handleSyncMarketplace}
              onSyncAll={handleSyncAllMarketplaces}
            />
          )}

          {activeSection === 'listings' && (
            <ListingContentView
              listings={listings}
              onApplyGeneratedContent={handleApplyGeneratedContent}
            />
          )}

          {activeSection === 'inventory_pricing' && (
            <InventoryPricingView
              inventory={inventory}
              pricing={pricing}
              onOrderRestock={handleOrderRestock}
              onSyncPriceParity={handleSyncPriceParity}
            />
          )}

          {activeSection === 'reviews_shipping' && (
            <ReviewsShippingView
              reviews={reviews}
              shipments={shipments}
              onSyncShipment={handleSyncShipment}
              onUpdateReviewCluster={handleUpdateReviewCluster}
            />
          )}

          {activeSection === 'daily_report' && (
            <DailyReportView
              report={dailyReport}
              activeRole={activeRole}
              storeSnapshot={storeContextForAi}
              onUpdateReport={(upd) =>
                setDailyReport((prev) => ({ ...prev, ...upd }))
              }
            />
          )}

          {activeSection === 'assistant' && (
            <AiAssistantView
              activeRole={activeRole}
              storeContext={storeContextForAi}
              initialPrompt={queuedAssistantPrompt}
              onConsumeInitialPrompt={() => setQueuedAssistantPrompt(null)}
            />
          )}

          {activeSection === 'blueprint' && <SystemBlueprintView />}
        </main>
      </div>
    </div>
  );
}
