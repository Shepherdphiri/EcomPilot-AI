import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  NormalizedListing,
  NormalizedOrder,
  NormalizedReview,
} from '../base/MarketplaceAdapter.js';

export class AmazonSellerAdapter implements MarketplaceAdapter {
  readonly provider = 'amazon_seller' as const;
  readonly displayName = 'Amazon Seller Central';

  async fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]> {
    if (!creds.accessToken || !creds.sellerId) {
      throw new Error('Missing Amazon SP-API LWA access token or sellerId.');
    }
    const res = await fetch(
      `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${creds.sellerId}`,
      {
        headers: {
          'x-amz-access-token': creds.accessToken,
        },
      }
    );
    if (!res.ok) throw new Error(`Amazon SP-API error: ${res.status}`);
    return [];
  }

  async fetchOrders(): Promise<NormalizedOrder[]> {
    return [];
  }

  async fetchReviews(): Promise<NormalizedReview[]> {
    return [];
  }

  async updatePrice(
    _creds: MarketplaceCredentials,
    sku: string,
    priceCents: number
  ): Promise<void> {
    console.log(`[Amazon SP-API] Patching offer price for ${sku}: ${(priceCents / 100).toFixed(2)}`);
  }

  async pushWaybillStatus(
    _creds: MarketplaceCredentials,
    orderNumber: string
  ): Promise<void> {
    console.log(`[Amazon SP-API] Confirming shipment status for order ${orderNumber}`);
  }
}
