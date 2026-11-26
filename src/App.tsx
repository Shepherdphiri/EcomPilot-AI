import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import {
  EMPTY_DAILY_REPORT,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_COMPANIES,
  INITIAL_DAILY_REPORT,
  INITIAL_INVENTORY,
  INITIAL_LISTING_AUDITS,
  INITIAL_MARKETPLACES,
  INITIAL_PRICING,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_SHIPMENTS,
  INITIAL_SUPPLIERS,
  INITIAL_TASKS,
  INITIAL_TEAM_MEMBERS,
  ROLE_META,
} from './data/initialStoreData';
import {
  ActivityLogEntry,
  AutomationRule,
  CompanyWorkspace,
  DailyReportData,
  InventoryItem,
  MarketplaceHealth,
  MarketplaceId,
  NavSection,
  PlanTier,
  PriceComparisonRow,
  PriorityTask,
  ProductListingAudit,
  PurchaseOrderRecord,
  ReportScheduleConfig,
  ReviewCluster,
  ShipmentRecord,
  SupplierRecord,
  TeamMemberRecord,
  UserRole,
} from './types/ecom';
import { MobileBottomNav, Sidebar } from './components/Sidebar';
import { PriorityCenterView } from './components/PriorityCenterView';
import { InventoryCommandView } from './components/InventoryCommandView';
import { PurchasingView } from './components/PurchasingView';
import { MarketplaceHealthView } from './components/MarketplaceHealthView';
import { ListingContentView } from './components/ListingContentView';
import { PricingEngineView } from './components/PricingEngineView';
import { OrderExceptionView } from './components/OrderExceptionView';
import { DailyReportView } from './components/DailyReportView';
import { AiAssistantView } from './components/AiAssistantView';
import {
  ConnectChannelsView,
  LiveSyncPayload,
} from './components/ConnectChannelsView';
import { WorkspaceAdminView } from './components/WorkspaceAdminView';

const SECTION_TITLES: Record<NavSection, string> = {
  priority: 'AI Task Centre',
  inventory: 'Inventory Command',
  purchasing: 'Purchasing & Suppliers',
  marketplaces: 'Marketplace Command',
  listings: 'AI Listing Optimizer',
  pricing: 'AI Pricing Engine',
  orders_reviews: 'Order Exception Center',
  reports: 'Reports & Briefings',
  assistant: 'AI Business Analyst',
  connect_channels: 'Connect Channels',
  workspace: 'Workspace & Plans',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('priority');
  const [activeRole, setActiveRole] = useState<UserRole>('ecommerce_manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queuedAssistantPrompt, setQueuedAssistantPrompt] = useState<string | null>(
    null
  );

  const [dataMode, setDataMode] = useState<'demo' | 'clean'>(() => {
    try {
      return localStorage.getItem('ecompilot_data_mode') === 'clean' ? 'clean' : 'demo';
    } catch {
      return 'demo';
    }
  });

  const [companies, setCompanies] = useState<CompanyWorkspace[]>(() => {
    try {
      const raw = localStorage.getItem('ecompilot_companies_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as CompanyWorkspace[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_COMPANIES;
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ecompilot_active_company_v1');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return INITIAL_COMPANIES[0].id;
  });

  const readSavedWorkspace = (companyId: string) => {
    try {
      const raw = localStorage.getItem(`ecompilot_ws_v1_${companyId}`);
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // ignore
    }
    return null;
  };

  const initialSaved = readSavedWorkspace(activeCompanyId);

  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>(() => {
    try {
      const raw = localStorage.getItem('ecompilot_team_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as TeamMemberRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_TEAM_MEMBERS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() =>
    Array.isArray(initialSaved?.activityLogs)
      ? (initialSaved.activityLogs as ActivityLogEntry[])
      : INITIAL_ACTIVITY_LOGS
  );
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() =>
    Array.isArray(initialSaved?.automationRules)
      ? (initialSaved.automationRules as AutomationRule[])
      : INITIAL_AUTOMATION_RULES
  );

  const [reportSchedule, setReportSchedule] = useState<ReportScheduleConfig>(() => {
    try {
      const raw = localStorage.getItem('ecompilot_report_schedule');
      if (raw) return JSON.parse(raw) as ReportScheduleConfig;
    } catch {
      // fallback
    }
    return {
      enabled: true,
      cadence: 'daily',
      sendTimeSast: '06:00',
      recipients: 'shepherd@apexhome.co.za, ops@apexhome.co.za',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('ecompilot_report_schedule', JSON.stringify(reportSchedule));
    } catch {
      // ignore storage errors
    }
  }, [reportSchedule]);

  const [tasks, setTasks] = useState<PriorityTask[]>(() =>
    Array.isArray(initialSaved?.tasks)
      ? (initialSaved.tasks as PriorityTask[])
      : dataMode === 'demo'
      ? INITIAL_TASKS
      : []
  );
  const [marketplaces, setMarketplaces] = useState<MarketplaceHealth[]>(() =>
    Array.isArray(initialSaved?.marketplaces)
      ? (initialSaved.marketplaces as MarketplaceHealth[])
      : dataMode === 'demo'
      ? INITIAL_MARKETPLACES
      : []
  );
  const [listings, setListings] = useState<ProductListingAudit[]>(() =>
    Array.isArray(initialSaved?.listings)
      ? (initialSaved.listings as ProductListingAudit[])
      : dataMode === 'demo'
      ? INITIAL_LISTING_AUDITS
      : []
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    Array.isArray(initialSaved?.inventory)
      ? (initialSaved.inventory as InventoryItem[])
      : dataMode === 'demo'
      ? INITIAL_INVENTORY
      : []
  );
  const [suppliers] = useState<SupplierRecord[]>(INITIAL_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>(() =>
    Array.isArray(initialSaved?.purchaseOrders)
      ? (initialSaved.purchaseOrders as PurchaseOrderRecord[])
      : dataMode === 'demo'
      ? INITIAL_PURCHASE_ORDERS
      : []
  );
  const [pricing, setPricing] = useState<PriceComparisonRow[]>(() =>
    Array.isArray(initialSaved?.pricing)
      ? (initialSaved.pricing as PriceComparisonRow[])
      : dataMode === 'demo'
      ? INITIAL_PRICING
      : []
  );
  const [reviews, setReviews] = useState<ReviewCluster[]>(() =>
    Array.isArray(initialSaved?.reviews)
      ? (initialSaved.reviews as ReviewCluster[])
      : dataMode === 'demo'
      ? INITIAL_REVIEWS
      : []
  );
  const [shipments, setShipments] = useState<ShipmentRecord[]>(() =>
    Array.isArray(initialSaved?.shipments)
      ? (initialSaved.shipments as ShipmentRecord[])
      : dataMode === 'demo'
      ? INITIAL_SHIPMENTS
      : []
  );
  const [dailyReport, setDailyReport] = useState<DailyReportData>(() =>
    initialSaved?.dailyReport
      ? (initialSaved.dailyReport as DailyReportData)
      : dataMode === 'demo'
      ? INITIAL_DAILY_REPORT
      : EMPTY_DAILY_REPORT
  );

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState<string | null>(null);
  const [takealotConnected, setTakealotConnected] = useState(false);
  const [lastSyncSummary, setLastSyncSummary] = useState<
    LiveSyncPayload['summary'] | null
  >(null);

  const hydratedCompanyRef = useRef<string>(activeCompanyId);

  useEffect(() => {
    try {
      localStorage.setItem('ecompilot_companies_v1', JSON.stringify(companies));
    } catch {
      // ignore
    }
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem('ecompilot_team_v1', JSON.stringify(teamMembers));
    } catch {
      // ignore
    }
  }, [teamMembers]);

  useEffect(() => {
    if (hydratedCompanyRef.current !== activeCompanyId) return;
    try {
      localStorage.setItem('ecompilot_active_company_v1', activeCompanyId);
      localStorage.setItem(
        `ecompilot_ws_v1_${activeCompanyId}`,
        JSON.stringify({
          tasks,
          marketplaces,
          listings,
          inventory,
          purchaseOrders,
          pricing,
          reviews,
          shipments,
          dailyReport,
          automationRules,
          activityLogs,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    activeCompanyId,
    tasks,
    marketplaces,
    listings,
    inventory,
    purchaseOrders,
    pricing,
    reviews,
    shipments,
    dailyReport,
    automationRules,
    activityLogs,
  ]);

  const appendActivityLog = (action: string, target: string) => {
    setActivityLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor: 'Shepherd',
        role: activeRole,
        action,
        target,
        timestamp: 'Just now',
      },
      ...prev.slice(0, 29),
    ]);
  };

  const openTasks = useMemo(() => tasks.filter((t) => !t.resolved), [tasks]);
  const criticalCount = useMemo(
    () => openTasks.filter((t) => t.severity === 'critical').length,
    [openTasks]
  );

  const storeContextForAi = useMemo(
    () => ({
      activeCompany: companies.find((c) => c.id === activeCompanyId)?.name,
      yesterdayMetrics: {
        revenueZar: dailyReport.revenueYesterdayZar,
        profitEstimateZar: dailyReport.profitEstimateZar,
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
        recommendedAction: t.recommendedAction,
      })),
      marketplaces: marketplaces.map((m) => ({
        name: m.name,
        revenueZar: m.revenueYesterdayZar,
        orders: m.ordersYesterday,
        returns: m.returnsCount,
        healthScore: m.healthScore,
        suppressedListings: m.suppressedListings,
        fulfillmentSlaPercent: m.fulfillmentSlaPercent,
      })),
      inventoryCover: inventory.map((i) => ({
        sku: i.sku,
        product: i.productName,
        availableStock: i.availableStock,
        reservedStock: i.reservedStock,
        dailySales: i.dailySalesVelocity,
        daysSinceLastSale: i.daysSinceLastSale,
        daysOfCover:
          i.dailySalesVelocity > 0
            ? Math.round((i.availableStock / i.dailySalesVelocity) * 10) / 10
            : 999,
        incomingStock: i.incomingStock,
        leadTimeDays: i.leadTimeDays,
      })),
      pricingAlerts: pricing.filter((p) => !p.resolved),
      listingsLowScore: listings.filter((l) => l.listingScore < 85),
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
      companies,
      activeCompanyId,
      dailyReport,
      openTasks,
      marketplaces,
      inventory,
      pricing,
      listings,
      reviews,
      shipments,
    ]
  );

  const handleResolveTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, resolved: true } : t))
    );
    appendActivityLog('Marked operational task resolved', taskId);
  };

  const handleReopenTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, resolved: false } : t))
    );
  };

  const handleCreatePo = (item: InventoryItem, quantity: number) => {
    const newPo: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      sku: item.sku,
      productName: item.productName,
      quantity,
      unitCostZar: item.unitCostZar,
      totalCostZar: quantity * item.unitCostZar,
      etaDays: item.leadTimeDays,
      status: 'ordered',
      createdAt: 'Just now',
    };
    setPurchaseOrders((prev) => [newPo, ...prev]);
    setInventory((prev) =>
      prev.map((i) =>
        i.sku === item.sku
          ? {
              ...i,
              incomingStock: i.incomingStock + quantity,
              incomingEtaDays: i.incomingEtaDays ?? i.leadTimeDays,
            }
          : i
      )
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.sku === item.sku && t.category === 'stock' ? { ...t, resolved: true } : t
      )
    );
    appendActivityLog(`Issued ${newPo.poNumber} (+${quantity} units)`, item.sku);
  };

  const handleMarkPoReceived = (poId: string) => {
    const target = purchaseOrders.find((p) => p.id === poId);
    if (!target || target.status === 'received') return;
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: 'received', etaDays: 0 } : po))
    );
    setInventory((prev) =>
      prev.map((i) =>
        i.sku === target.sku
          ? {
              ...i,
              availableStock: i.availableStock + target.quantity,
              currentStock: i.currentStock + target.quantity,
              incomingStock: Math.max(0, i.incomingStock - target.quantity),
              incomingEtaDays: null,
            }
          : i
      )
    );
    appendActivityLog(`Received ${target.poNumber} into warehouse`, target.sku);
  };

  const handleSyncMarketplace = (id: MarketplaceId) => {
    setMarketplaces((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lastSynced: 'Just now' } : m))
    );
    appendActivityLog('Refreshed channel telemetry', id);
  };

  const handleSyncAllMarketplaces = () => {
    setMarketplaces((prev) => prev.map((m) => ({ ...m, lastSynced: 'Just now' })));
    appendActivityLog('Synced all connected channels', 'All Marketplaces');
  };

  const handleApplyGeneratedContent = (sku: string, newScore: number) => {
    setListings((prev) =>
      prev.map((l) =>
        l.sku === sku
          ? {
              ...l,
              listingScore: newScore,
              seoScore: Math.max(l.seoScore, 92),
              contentCompletenessScore: Math.max(l.contentCompletenessScore, 94),
              conversionScore: Math.max(l.conversionScore, 90),
              missingAttributes: [],
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
        t.sku === sku && t.category === 'listing' ? { ...t, resolved: true } : t
      )
    );
    appendActivityLog(`Applied AI copy upgrade (score ${newScore}/100)`, sku);
  };

  const handleSyncPriceParity = (sku: string) => {
    setPricing((prev) =>
      prev.map((p) => {
        if (p.sku !== sku) return p;
        const alignedPrices: PriceComparisonRow['prices'] = {};
        for (const ch of Object.keys(p.prices) as MarketplaceId[]) {
          alignedPrices[ch] = p.recommendedPriceZar;
        }
        return {
          ...p,
          prices: alignedPrices,
          issueType: 'aligned',
          variancePercent: 0,
          recommendation: `All channels synced to R${p.recommendedPriceZar} target price.`,
          resolved: true,
        };
      })
    );
    setTasks((prev) =>
      prev.map((t) =>
        t.sku === sku && (t.category === 'pricing' || t.category === 'opportunity')
          ? { ...t, resolved: true }
          : t
      )
    );
    appendActivityLog('Aligned cross-channel pricing parity', sku);
  };

  const handleSyncShipment = (orderNumber: string) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.orderNumber === orderNumber
          ? {
              ...s,
              marketplaceStatus:
                s.courierStatus === 'Delivered' ? 'Delivered' : 'Still in transit',
              synced: true,
            }
          : s
      )
    );
    appendActivityLog('Resolved order dispatch exception', orderNumber);
  };

  const handleOneClickFix = (task: PriorityTask) => {
    if (task.oneClickActionType === 'create_po' && task.sku) {
      const invItem = inventory.find((i) => i.sku === task.sku);
      if (invItem) {
        handleCreatePo(invItem, invItem.suggestedReorderQty || 120);
        return;
      }
    }
    if (task.oneClickActionType === 'sync_price' && task.sku) {
      handleSyncPriceParity(task.sku);
      return;
    }
    if (task.oneClickActionType === 'sync_waybill') {
      setShipments((prev) =>
        prev.map((s) =>
          s.marketplace === task.marketplace || s.sku === task.sku
            ? { ...s, synced: true, marketplaceStatus: 'Delivered' }
            : s
        )
      );
      handleResolveTask(task.id);
      return;
    }
    if (task.oneClickActionType === 'restore_listing' && task.sku) {
      handleApplyGeneratedContent(task.sku, 91);
      return;
    }
    handleResolveTask(task.id);
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

  const handleLiveSyncSuccess = (
    payload: LiveSyncPayload,
    status: {
      shopifyConnected: boolean;
      shopifyDomain: string | null;
      takealotConnected: boolean;
    }
  ) => {
    setMarketplaces(payload.marketplaces);
    setTasks(payload.tasks);
    setInventory(payload.inventory);
    setPricing(payload.pricing);
    setDailyReport(payload.dailyReport);
    setListings([]);
    setReviews([]);
    setShipments([]);
    setPurchaseOrders([]);
    setDataMode('clean');
    try {
      localStorage.setItem('ecompilot_data_mode', 'clean');
    } catch {
      // ignore storage errors
    }
    setIsLiveMode(true);
    setShopifyConnected(status.shopifyConnected);
    setShopifyDomain(status.shopifyDomain);
    setTakealotConnected(status.takealotConnected);
    setLastSyncSummary(payload.summary);
    appendActivityLog('Completed live marketplace API sync', 'Shopify & Takealot');
  };

  const handleUseDemoData = () => {
    setMarketplaces(INITIAL_MARKETPLACES);
    setTasks(INITIAL_TASKS);
    setListings(INITIAL_LISTING_AUDITS);
    setInventory(INITIAL_INVENTORY);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setPricing(INITIAL_PRICING);
    setReviews(INITIAL_REVIEWS);
    setShipments(INITIAL_SHIPMENTS);
    setDailyReport(INITIAL_DAILY_REPORT);
    setDataMode('demo');
    try {
      localStorage.setItem('ecompilot_data_mode', 'demo');
    } catch {
      // ignore storage errors
    }
    setIsLiveMode(false);
    setShopifyConnected(false);
    setShopifyDomain(null);
    setTakealotConnected(false);
    setLastSyncSummary(null);
  };

  const handleClearDemoData = () => {
    fetch('/api/connectors/disconnect', {
      method: 'POST',
      headers: { 'x-company-id': activeCompanyId },
    }).catch(() => {});
    setMarketplaces([]);
    setTasks([]);
    setListings([]);
    setInventory([]);
    setPurchaseOrders([]);
    setPricing([]);
    setReviews([]);
    setShipments([]);
    setDailyReport(EMPTY_DAILY_REPORT);
    setDataMode('clean');
    try {
      localStorage.setItem('ecompilot_data_mode', 'clean');
    } catch {
      // ignore storage errors
    }
    setIsLiveMode(false);
    setShopifyConnected(false);
    setShopifyDomain(null);
    setTakealotConnected(false);
    setLastSyncSummary(null);
  };

  const handleToggleAutomationRule = (ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleRunAutomationSweep = (): string => {
    let poCount = 0;
    let priceCount = 0;
    let podCount = 0;
    let promoShieldCount = 0;

    const poRule = automationRules.find((r) => r.ruleKey === 'auto_draft_po' && r.enabled);
    const marginRule = automationRules.find((r) => r.ruleKey === 'margin_floor_guard' && r.enabled);
    const podRule = automationRules.find((r) => r.ruleKey === 'pod_auto_sync' && r.enabled);
    const promoRule = automationRules.find((r) => r.ruleKey === 'promo_shield' && r.enabled);

    const newPos: PurchaseOrderRecord[] = [];
    const poSkuSet = new Set<string>();

    if (poRule) {
      const candidates = inventory.filter((item) => {
        if (item.dailySalesVelocity <= 0 || item.incomingStock > 0) return false;
        const cover = item.availableStock / item.dailySalesVelocity;
        return cover <= item.leadTimeDays && item.suggestedReorderQty > 0;
      });
      for (const item of candidates) {
        poCount += 1;
        poSkuSet.add(item.sku);
        newPos.push({
          id: `po-auto-${Date.now()}-${poCount}`,
          poNumber: `PO-AUTO-${Math.floor(1000 + Math.random() * 8999)}`,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          sku: item.sku,
          productName: item.productName,
          quantity: item.suggestedReorderQty,
          unitCostZar: item.unitCostZar,
          totalCostZar: item.suggestedReorderQty * item.unitCostZar,
          etaDays: item.leadTimeDays,
          status: 'draft',
          createdAt: 'Auto-sweep',
        });
      }
      if (newPos.length > 0) {
        setPurchaseOrders((prev) => [...newPos, ...prev]);
        setInventory((prev) =>
          prev.map((i) =>
            poSkuSet.has(i.sku)
              ? {
                  ...i,
                  incomingStock: i.incomingStock + i.suggestedReorderQty,
                  incomingEtaDays: i.incomingEtaDays ?? i.leadTimeDays,
                }
              : i
          )
        );
      }
    }

    const alignedSkus = new Set<string>();
    if (marginRule) {
      setPricing((prev) =>
        prev.map((p) => {
          if (p.resolved || p.issueType === 'aligned') return p;
          priceCount += 1;
          alignedSkus.add(p.sku);
          const alignedPrices: PriceComparisonRow['prices'] = {};
          for (const ch of Object.keys(p.prices) as MarketplaceId[]) {
            alignedPrices[ch] = p.recommendedPriceZar;
          }
          return {
            ...p,
            prices: alignedPrices,
            issueType: 'aligned',
            variancePercent: 0,
            recommendation: `Auto-aligned to R${p.recommendedPriceZar} margin floor parity.`,
            resolved: true,
          };
        })
      );
    }

    if (podRule) {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.synced || s.courierStatus !== 'Delivered') return s;
          podCount += 1;
          return {
            ...s,
            marketplaceStatus: 'Delivered',
            synced: true,
          };
        })
      );
    }

    if (promoRule) {
      promoShieldCount = inventory.filter(
        (i) => i.dailySalesVelocity > 0 && i.availableStock / i.dailySalesVelocity < 5
      ).length;
    }

    if (poSkuSet.size > 0 || alignedSkus.size > 0 || podCount > 0) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.sku && poSkuSet.has(t.sku) && t.category === 'stock') {
            return { ...t, resolved: true };
          }
          if (
            t.sku &&
            alignedSkus.has(t.sku) &&
            (t.category === 'pricing' || t.category === 'opportunity')
          ) {
            return { ...t, resolved: true };
          }
          if (podCount > 0 && t.oneClickActionType === 'sync_waybill') {
            return { ...t, resolved: true };
          }
          return t;
        })
      );
    }

    setAutomationRules((prev) =>
      prev.map((r) => {
        if (!r.enabled) return r;
        const delta =
          r.ruleKey === 'auto_draft_po'
            ? poCount
            : r.ruleKey === 'margin_floor_guard'
            ? priceCount
            : r.ruleKey === 'pod_auto_sync'
            ? podCount
            : promoShieldCount;
        return {
          ...r,
          executionsCount: r.executionsCount + delta,
          lastRunAt: 'Just now',
        };
      })
    );

    const summary = `Automation sweep: ${poCount} PO drafted, ${priceCount} prices aligned, ${podCount} PODs synced, ${promoShieldCount} sub-5d promo shields flagged.`;
    appendActivityLog('Executed operational automation sweep', summary);
    return summary;
  };

  const handleSelectCompany = (companyId: string) => {
    if (companyId === activeCompanyId) return;
    const saved = readSavedWorkspace(companyId);
    hydratedCompanyRef.current = companyId;
    setActiveCompanyId(companyId);

    if (saved) {
      setTasks(Array.isArray(saved.tasks) ? (saved.tasks as PriorityTask[]) : []);
      setMarketplaces(
        Array.isArray(saved.marketplaces)
          ? (saved.marketplaces as MarketplaceHealth[])
          : []
      );
      setListings(
        Array.isArray(saved.listings)
          ? (saved.listings as ProductListingAudit[])
          : []
      );
      setInventory(
        Array.isArray(saved.inventory) ? (saved.inventory as InventoryItem[]) : []
      );
      setPurchaseOrders(
        Array.isArray(saved.purchaseOrders)
          ? (saved.purchaseOrders as PurchaseOrderRecord[])
          : []
      );
      setPricing(
        Array.isArray(saved.pricing) ? (saved.pricing as PriceComparisonRow[]) : []
      );
      setReviews(
        Array.isArray(saved.reviews) ? (saved.reviews as ReviewCluster[]) : []
      );
      setShipments(
        Array.isArray(saved.shipments) ? (saved.shipments as ShipmentRecord[]) : []
      );
      setDailyReport(
        saved.dailyReport ? (saved.dailyReport as DailyReportData) : EMPTY_DAILY_REPORT
      );
      setAutomationRules(
        Array.isArray(saved.automationRules)
          ? (saved.automationRules as AutomationRule[])
          : INITIAL_AUTOMATION_RULES
      );
      setActivityLogs(
        Array.isArray(saved.activityLogs)
          ? (saved.activityLogs as ActivityLogEntry[])
          : INITIAL_ACTIVITY_LOGS
      );
    } else if (dataMode === 'demo' && companyId === INITIAL_COMPANIES[0].id) {
      setTasks(INITIAL_TASKS);
      setMarketplaces(INITIAL_MARKETPLACES);
      setListings(INITIAL_LISTING_AUDITS);
      setInventory(INITIAL_INVENTORY);
      setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
      setPricing(INITIAL_PRICING);
      setReviews(INITIAL_REVIEWS);
      setShipments(INITIAL_SHIPMENTS);
      setDailyReport(INITIAL_DAILY_REPORT);
      setAutomationRules(INITIAL_AUTOMATION_RULES);
      setActivityLogs(INITIAL_ACTIVITY_LOGS);
    } else {
      setTasks([]);
      setMarketplaces([]);
      setListings([]);
      setInventory([]);
      setPurchaseOrders([]);
      setPricing([]);
      setReviews([]);
      setShipments([]);
      setDailyReport(EMPTY_DAILY_REPORT);
      setAutomationRules(INITIAL_AUTOMATION_RULES);
      setActivityLogs([]);
    }
    setIsLiveMode(false);
    setShopifyConnected(false);
    setShopifyDomain(null);
    setTakealotConnected(false);
    setLastSyncSummary(null);
  };

  const handleCreateCompany = (name: string, region: string) => {
    const newId = `co-${Date.now()}`;
    setCompanies((prev) => [
      ...prev,
      {
        id: newId,
        name,
        region,
        currency: 'ZAR',
        plan: 'starter',
        trialDaysLeft: 14,
        activeSkusCount: 0,
        connectedChannelsCount: 0,
      },
    ]);
    handleSelectCompany(newId);
    appendActivityLog('Created trial company workspace', name);
  };

  const handleChangePlan = (plan: PlanTier) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === activeCompanyId ? { ...c, plan, trialDaysLeft: null } : c
      )
    );
    appendActivityLog(`Updated subscription plan to ${plan}`, activeCompanyId);
  };

  const handleInviteMember = (name: string, email: string, role: UserRole) => {
    setTeamMembers((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        name,
        email,
        role,
        status: 'invited',
        lastActive: 'Invite sent',
      },
    ]);
    appendActivityLog(`Invited ${name} (${ROLE_META[role].label})`, email);
  };

  const handleUpdateMemberRole = (memberId: string, role: UserRole) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m))
    );
    appendActivityLog(`Updated member role to ${ROLE_META[role].label}`, memberId);
  };

  return (
    <div className="flex min-h-screen bg-[#0B0D12] text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onChangeCompany={handleSelectCompany}
        dataMode={dataMode}
        isLiveMode={isLiveMode}
        onUseDemoData={handleUseDemoData}
        onClearDemoData={handleClearDemoData}
        openTaskCount={openTasks.length}
        criticalCount={criticalCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Top Command Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0E1118]/90 px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-300 hover:bg-white/[0.06] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 truncate text-sm">
              <span className="text-slate-400 whitespace-nowrap">EcomPilot</span>
              <span className="text-slate-600" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-100">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeSection !== 'priority' && e.target.value.trim()) {
                    setActiveSection('priority');
                  }
                }}
                placeholder="Search SKUs, tasks, channels..."
                className="w-56 rounded-lg border border-white/[0.08] bg-[#161B26] py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('assistant')}
              className="min-h-[36px] rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              AI Analyst
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 pb-20 lg:p-8 lg:pb-8">
          {activeSection === 'priority' && (
            <PriorityCenterView
              tasks={tasks}
              marketplaces={marketplaces}
              inventory={inventory}
              listings={listings}
              dailyReport={dailyReport}
              activeRole={activeRole}
              searchQuery={searchQuery}
              automationRules={automationRules}
              onToggleAutomationRule={handleToggleAutomationRule}
              onRunAutomationSweep={handleRunAutomationSweep}
              onResolveTask={handleResolveTask}
              onOneClickFix={handleOneClickFix}
              onReopenTask={handleReopenTask}
              onNavigate={setActiveSection}
              onAskAiAboutTask={handleAskAiAboutTask}
            />
          )}

          {activeSection === 'inventory' && (
            <InventoryCommandView
              inventory={inventory}
              onCreatePoFromInventory={handleCreatePo}
            />
          )}

          {activeSection === 'purchasing' && (
            <PurchasingView
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              inventory={inventory}
              onCreatePo={handleCreatePo}
              onMarkPoReceived={handleMarkPoReceived}
            />
          )}

          {activeSection === 'marketplaces' && (
            <MarketplaceHealthView
              marketplaces={marketplaces}
              onSyncMarketplace={handleSyncMarketplace}
              onSyncAll={handleSyncAllMarketplaces}
              onOpenConnect={() => setActiveSection('connect_channels')}
            />
          )}

          {activeSection === 'connect_channels' && (
            <ConnectChannelsView
              activeCompanyId={activeCompanyId}
              dataMode={dataMode}
              isLiveMode={isLiveMode}
              shopifyConnected={shopifyConnected}
              shopifyDomain={shopifyDomain}
              takealotConnected={takealotConnected}
              lastSyncSummary={lastSyncSummary}
              onSyncSuccess={handleLiveSyncSuccess}
              onUseDemoData={handleUseDemoData}
              onClearDemoData={handleClearDemoData}
            />
          )}

          {activeSection === 'listings' && (
            <ListingContentView
              listings={listings}
              onApplyGeneratedContent={handleApplyGeneratedContent}
            />
          )}

          {activeSection === 'pricing' && (
            <PricingEngineView
              pricing={pricing}
              inventory={inventory}
              activeCompanyId={activeCompanyId}
              onSyncPriceParity={handleSyncPriceParity}
            />
          )}

          {activeSection === 'orders_reviews' && (
            <OrderExceptionView
              reviews={reviews}
              shipments={shipments}
              onSyncShipment={handleSyncShipment}
              onUpdateReviewCluster={handleUpdateReviewCluster}
            />
          )}

          {activeSection === 'reports' && (
            <DailyReportView
              report={dailyReport}
              activeRole={activeRole}
              storeSnapshot={storeContextForAi}
              schedule={reportSchedule}
              onUpdateSchedule={setReportSchedule}
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

          {activeSection === 'workspace' && (
            <WorkspaceAdminView
              companies={companies}
              activeCompanyId={activeCompanyId}
              onSelectCompany={handleSelectCompany}
              onCreateCompany={handleCreateCompany}
              onChangePlan={handleChangePlan}
              teamMembers={teamMembers}
              onInviteMember={handleInviteMember}
              onUpdateMemberRole={handleUpdateMemberRole}
              activityLogs={activityLogs}
            />
          )}
        </main>

        <footer className="hidden border-t border-white/[0.08] bg-[#0E1118] px-4 py-3 lg:block lg:px-8">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between text-xs text-slate-500">
            <span>EcomPilot</span>
            <span>Developed by Shepherd Zisper Phiri</span>
          </div>
        </footer>
      </div>

      <MobileBottomNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        openTaskCount={openTasks.length}
      />
    </div>
  );
}
