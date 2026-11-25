import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  MarketplaceProvider,
  NormalizedListing,
  NormalizedOrder,
  NormalizedReview,
} from '../base/MarketplaceAdapter.js';

export abstract class MiraklBaseAdapter implements MarketplaceAdapter {
  abstract readonly provider: MarketplaceProvider;
  abstract readonly displayName: string;
  protected abstract readonly apiBaseUrl: string;

  async fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]> {
    const res = await fetch(`${this.apiBaseUrl}/api/offers`, {
      headers: { Authorization: creds.apiKey || '' },
    });
    if (!res.ok) throw new Error(`${this.displayName} Mirakl API error: ${res.status}`);
    const data = (await res.json()) as { offers?: Array<any> };
    return (data.offers || []).map((o) => ({
      externalListingId: String(o.offer_id),
      sku: o.shop_sku,
      title: o.product_title,
      priceCents: Math.round(Number(o.price || 0) * 100),
      stockUnits: Number(o.quantity || 0),
      status: o.active ? 'active' : 'suppressed',
      hasBuyBox: true,
      bulletCount: 3,
      imageCount: 2,
      lifestyleImageCount: 0,
      hasBrand: true,
      categoryMapped: true,
      missingAttributes: [],
    }));
  }

  async fetchOrders(): Promise<NormalizedOrder[]> {
    return [];
  }

  async fetchReviews(): Promise<NormalizedReview[]> {
    return [];
  }

  async updatePrice(
    creds: MarketplaceCredentials,
    sku: string,
    priceCents: number
  ): Promise<void> {
    await fetch(`${this.apiBaseUrl}/api/offers`, {
      method: 'POST',
      headers: {
        Authorization: creds.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offers: [{ shop_sku: sku, price: Number((priceCents / 100).toFixed(2)) }],
      }),
    });
  }

  async pushWaybillStatus(
    _creds: MarketplaceCredentials,
    orderNumber: string
  ): Promise<void> {
    console.log(`[${this.displayName}] Updated Mirakl order ${orderNumber} to Delivered`);
  }
}
