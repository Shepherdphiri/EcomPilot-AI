export type UserRole =
  | 'owner'
  | 'ecommerce_manager'
  | 'inventory_manager'
  | 'content_manager'
  | 'marketing_manager'
  | 'analyst';

export type MarketplaceId =
  | 'shopify'
  | 'takealot'
  | 'makro'
  | 'amazon_sc'
  | 'amazon_vc'
  | 'woocommerce';

export type PrioritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type NavSection =
  | 'priority'
  | 'inventory'
  | 'marketplaces'
  | 'listings'
  | 'pricing'
  | 'orders_reviews'
  | 'purchasing'
  | 'assistant'
  | 'reports'
  | 'connect_channels'
  | 'workspace';

export interface PriorityTask {
  id: string;
  severity: PrioritySeverity;
  category: 'stock' | 'listing' | 'order' | 'pricing' | 'supplier' | 'opportunity';
  title: string;
  summary: string;
  recommendedAction: string;
  dueDate: string;
  marketplace: MarketplaceId;
  marketplaceLabel: string;
  sku?: string;
  revenueImpactZar: number;
  relevantRoles: UserRole[];
  targetSection: NavSection;
  actionLabel: string;
  oneClickActionType?: 'create_po' | 'sync_price' | 'sync_waybill' | 'restore_listing' | 'resolve';
  detectedAt: string;
  resolved: boolean;
}

export interface MarketplaceHealth {
  id: MarketplaceId;
  name: string;
  shortName: string;
  region: string;
  connectorType: string;
  connected: boolean;
  totalListings: number;
  activeListings: number;
  suppressedListings: number;
  inventoryIssues: number;
  contentIssues: number;
  healthScore: number;
  revenueYesterdayZar: number;
  ordersYesterday: number;
  returnsCount: number;
  cancellationsCount: number;
  fulfillmentSlaPercent: number;
  lastSynced: string;
}

export interface ListingQualityCheck {
  titleQuality: number;
  bulletPoints: number;
  descriptionQuality: number;
  images: number;
  lifestyleImages: number;
  keywords: number;
  attributes: number;
  brandInfo: number;
  categoryCorrectness: number;
}

export interface ProductListingAudit {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  imageUrl: string;
  dimensions: string;
  specifications: string;
  marketplaces: MarketplaceId[];
  listingScore: number;
  seoScore: number;
  imageQualityScore: number;
  contentCompletenessScore: number;
  conversionScore: number;
  missingAttributes: string[];
  missingImagesCount: number;
  competitorBenchmarkScore: number;
  status: 'active' | 'suppressed' | 'needs_optimization';
  checks: ListingQualityCheck;
  recommendations: string[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  imageUrl: string;
  warehouse: string;
  availableStock: number;
  reservedStock: number;
  currentStock: number;
  dailySalesVelocity: number;
  daysSinceLastSale: number;
  incomingStock: number;
  incomingEtaDays: number | null;
  reorderPointDays: number;
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  suggestedReorderQty: number;
  unitCostZar: number;
  sellingPriceZar: number;
  affectedChannels: MarketplaceId[];
}

export interface SupplierRecord {
  id: string;
  name: string;
  country: string;
  avgLeadTimeDays: number;
  onTimeRatePercent: number;
  moqUnits: number;
  activeSkusCount: number;
  delayRisk: 'low' | 'medium' | 'high';
  delayNote?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  productName: string;
  quantity: number;
  unitCostZar: number;
  totalCostZar: number;
  etaDays: number;
  status: 'draft' | 'ordered' | 'in_transit' | 'delayed' | 'received';
  createdAt: string;
}

export interface PriceComparisonRow {
  id: string;
  sku: string;
  productName: string;
  costZar: number;
  targetPriceZar: number;
  competitorPriceZar: number;
  recommendedPriceZar: number;
  marketplaceFeePct: number;
  fulfilmentFeeZar: number;
  prices: Partial<Record<MarketplaceId, number>>;
  issueType: 'mismatch' | 'undercutting' | 'margin_risk' | 'underpriced' | 'overpriced' | 'aligned';
  variancePercent: number;
  recommendation: string;
  resolved: boolean;
}

export interface ReviewCluster {
  id: string;
  sku: string;
  productName: string;
  marketplace: string;
  totalReviews: number;
  sentimentScore: number;
  topComplaint: string;
  complaintMentions: number;
  topPositive: string;
  positiveMentions: number;
  recommendation: string;
  sampleReviews: string[];
}

export interface ShipmentRecord {
  id: string;
  orderNumber: string;
  waybill: string;
  sku: string;
  courier: string;
  marketplace: MarketplaceId;
  marketplaceLabel: string;
  courierStatus:
    | 'Delivered'
    | 'In Transit'
    | 'Delivery Failed'
    | 'Out for Delivery'
    | 'Waybill Missing';
  marketplaceStatus:
    | 'Delivered'
    | 'Still in transit'
    | 'Awaiting dispatch'
    | 'Delayed'
    | 'Dispatch Overdue';
  daysElapsed: number;
  issueFlag:
    | 'status_mismatch'
    | 'delayed'
    | 'failed_delivery'
    | 'missing_waybill'
    | 'sla_risk'
    | 'nominal';
  recommendedAction: string;
  synced: boolean;
}

export interface DailyReportAction {
  rank: number;
  priority: PrioritySeverity;
  action: string;
  channel: string;
  impactZar: number;
}

export interface DailyReportData {
  generatedAt: string;
  dateLabel: string;
  revenueYesterdayZar: number;
  revenueDeltaPercent: number;
  profitEstimateZar: number;
  ordersCount: number;
  lowStockProductsCount: number;
  outOfStockCount: number;
  suppressedListingsCount: number;
  delayedDeliveriesCount: number;
  potentialRevenueLossZar: number;
  executiveSummary: string;
  yesterdayNarrative: string;
  topActions: DailyReportAction[];
}

export interface ReportScheduleConfig {
  enabled: boolean;
  cadence: 'daily' | 'weekly' | 'monthly';
  sendTimeSast: string;
  recipients: string;
}

export interface GeneratedListingContent {
  takealotTitle: string;
  shopifyTitle: string;
  bulletPoints: string[];
  keywords: string[];
  productDescription: string;
  metaDescription: string;
  projectedScore: number;
  rationale: string;
}

export interface ChatChartBar {
  label: string;
  value: number;
  formattedValue: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  chartTitle?: string;
  chartBars?: ChatChartBar[];
}

export type PlanTier = 'starter' | 'growth' | 'professional' | 'enterprise';

export interface CompanyWorkspace {
  id: string;
  name: string;
  region: string;
  currency: 'ZAR' | 'USD';
  plan: PlanTier;
  trialDaysLeft: number | null;
  activeSkusCount: number;
  connectedChannelsCount: number;
}

export interface TeamMemberRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
  lastActive: string;
}

export interface ActivityLogEntry {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  ruleKey: 'auto_draft_po' | 'margin_floor_guard' | 'pod_auto_sync' | 'promo_shield';
  title: string;
  triggerCondition: string;
  actionSummary: string;
  enabled: boolean;
  executionsCount: number;
  lastRunAt: string | null;
}

export interface ProfitRecoveryPlaybook {
  headline: string;
  estimated30DayRecoveryZar: number;
  plays: Array<{
    sku: string;
    playType: string;
    action: string;
    expectedImpactZar: number;
  }>;
}

