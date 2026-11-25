export type UserRole =
  | 'ecommerce_manager'
  | 'content_manager'
  | 'inventory_manager'
  | 'executive';

export type MarketplaceId =
  | 'shopify'
  | 'amazon_seller'
  | 'amazon_vendor'
  | 'takealot'
  | 'makro'
  | 'leroy_merlin';

export type PrioritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type NavSection =
  | 'priority'
  | 'marketplaces'
  | 'listings'
  | 'inventory_pricing'
  | 'reviews_shipping'
  | 'daily_report'
  | 'assistant'
  | 'blueprint';

export interface PriorityTask {
  id: string;
  severity: PrioritySeverity;
  title: string;
  summary: string;
  marketplace: MarketplaceId;
  marketplaceLabel: string;
  sku?: string;
  revenueImpactZar: number;
  relevantRoles: UserRole[];
  targetSection: NavSection;
  actionLabel: string;
  detectedAt: string;
  resolved: boolean;
}

export interface MarketplaceHealth {
  id: MarketplaceId;
  name: string;
  shortName: string;
  region: string;
  connectorType: string;
  totalListings: number;
  activeListings: number;
  suppressedListings: number;
  inventoryIssues: number;
  contentIssues: number;
  healthScore: number;
  revenueYesterdayZar: number;
  ordersYesterday: number;
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
  status: 'active' | 'suppressed' | 'needs_optimization';
  checks: ListingQualityCheck;
  recommendations: string[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  imageUrl: string;
  currentStock: number;
  dailySalesVelocity: number;
  incomingStock: number;
  incomingEtaDays: number | null;
  reorderPointDays: number;
  unitCostZar: number;
  sellingPriceZar: number;
  affectedChannels: MarketplaceId[];
}

export interface PriceComparisonRow {
  id: string;
  sku: string;
  productName: string;
  costZar: number;
  targetPriceZar: number;
  prices: Partial<Record<MarketplaceId, number>>;
  issueType: 'mismatch' | 'undercutting' | 'margin_risk' | 'aligned';
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
  courierStatus: 'Delivered' | 'In Transit' | 'Delivery Failed' | 'Out for Delivery';
  marketplaceStatus: 'Delivered' | 'Still in transit' | 'Awaiting dispatch' | 'Delayed';
  daysElapsed: number;
  issueFlag: 'status_mismatch' | 'delayed' | 'failed_delivery' | 'nominal';
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
  ordersCount: number;
  lowStockProductsCount: number;
  suppressedListingsCount: number;
  delayedDeliveriesCount: number;
  potentialRevenueLossZar: number;
  executiveSummary: string;
  yesterdayNarrative: string;
  topActions: DailyReportAction[];
}

export interface GeneratedListingContent {
  amazonTitle: string;
  takealotTitle: string;
  shopifyTitle: string;
  bulletPoints: string[];
  keywords: string[];
  productDescription: string;
  metaDescription: string;
  projectedScore: number;
  rationale: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
