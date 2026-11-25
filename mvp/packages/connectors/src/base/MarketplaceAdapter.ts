export type MarketplaceProvider =
  | 'shopify'
  | 'amazon_seller'
  | 'amazon_vendor'
  | 'takealot'
  | 'makro'
  | 'leroy_merlin';

export interface MarketplaceCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  sellerId?: string;
  storeDomain?: string;
}

export interface NormalizedListing {
  externalListingId: string;
  sku: string;
  title: string;
  priceCents: number;
  stockUnits: number;
  status: 'active' | 'suppressed' | 'inactive';
  suppressionReason?: string;
  hasBuyBox: boolean;
  bulletCount: number;
  imageCount: number;
  lifestyleImageCount: number;
  hasBrand: boolean;
  categoryMapped: boolean;
  missingAttributes: string[];
}

export interface NormalizedOrderItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface NormalizedOrder {
  orderNumber: string;
  waybillNumber: string;
  courierName: string;
  marketplaceStatus: 'Delivered' | 'Still in transit' | 'Awaiting dispatch' | 'Delayed';
  totalCents: number;
  createdAt: string;
  items: NormalizedOrderItem[];
}

export interface NormalizedReview {
  sku: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface MarketplaceAdapter {
  readonly provider: MarketplaceProvider;
  readonly displayName: string;
  fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]>;
  fetchOrders(creds: MarketplaceCredentials, sinceIso: string): Promise<NormalizedOrder[]>;
  fetchReviews(creds: MarketplaceCredentials, sku: string): Promise<NormalizedReview[]>;
  updatePrice(creds: MarketplaceCredentials, sku: string, priceCents: number): Promise<void>;
  pushWaybillStatus(
    creds: MarketplaceCredentials,
    orderNumber: string,
    status: 'Delivered'
  ): Promise<void>;
}
