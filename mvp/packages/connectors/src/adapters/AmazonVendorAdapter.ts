import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  NormalizedListing,
  NormalizedOrder,
  NormalizedReview,
} from '../base/MarketplaceAdapter.js';

export class AmazonVendorAdapter implements MarketplaceAdapter {
  readonly provider = 'amazon_vendor' as const;
  readonly displayName = 'Amazon Vendor Central';

  async fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]> {
    if (!creds.accessToken) throw new Error('Missing Amazon Vendor Direct/PO token.');
    return [];
  }

  async fetchOrders(): Promise<NormalizedOrder[]> {
    return [];
  }

  async fetchReviews(): Promise<NormalizedReview[]> {
    return [];
  }

  async updatePrice(_creds: MarketplaceCredentials, sku: string, priceCents: number): Promise<void> {
    console.log(`[Amazon Vendor] Submitting wholesale cost/price update for ${sku}: ${priceCents}`);
  }

  async pushWaybillStatus(_creds: MarketplaceCredentials, orderNumber: string): Promise<void> {
    console.log(`[Amazon Vendor] Transmitting ASN confirmation for PO ${orderNumber}`);
  }
}
