import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  NormalizedListing,
  NormalizedOrder,
  NormalizedReview,
} from '../base/MarketplaceAdapter.js';

async function takealotRequest<T>(
  path: string,
  creds: MarketplaceCredentials,
  init?: RequestInit,
  attempt = 1
): Promise<T> {
  if (!creds.apiKey) {
    throw new Error('Missing Takealot Seller API Key.');
  }

  const res = await fetch(`https://seller-api.takealot.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${creds.apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get('Retry-After') || 2);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return takealotRequest<T>(path, creds, init, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Takealot Seller API HTTP ${res.status}: ${await res.text()}`);
  }

  return (await res.json()) as T;
}

export class TakealotAdapter implements MarketplaceAdapter {
  readonly provider = 'takealot' as const;
  readonly displayName = 'Takealot Marketplace';

  async fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]> {
    const listings: NormalizedListing[] = [];
    let page = 1;
    const pageSize = 100;
    let totalResults = Infinity;

    while (listings.length < totalResults) {
      const data = await takealotRequest<{
        total_results?: number;
        offers?: Array<any>;
      }>(`/offers?page_number=${page}&page_size=${pageSize}`, creds);

      totalResults = data.total_results ?? 0;
      const offers = data.offers || [];
      if (offers.length === 0) break;

      for (const o of offers) {
        const statusText = String(o.status || '');
        const isBuyable = statusText === 'Buyable';
        const stockTotal =
          Number(o.stock_at_takealot_total || 0) + Number(o.stock_on_way_total || 0) ||
          Number(o.leadtime_stock?.[0]?.quantity_available || 0);

        listings.push({
          externalListingId: String(o.offer_id),
          sku: String(o.sku || o.tsin_id || o.offer_id).trim(),
          title: String(o.title || 'Untitled Takealot Offer'),
          priceCents: Math.round(Number(o.selling_price || 0) * 100),
          stockUnits: stockTotal,
          status: isBuyable ? 'active' : 'suppressed',
          suppressionReason: !isBuyable
            ? statusText || 'Offer not Buyable on Takealot'
            : undefined,
          hasBuyBox: isBuyable,
          bulletCount: 4,
          imageCount: 3,
          lifestyleImageCount: 0,
          hasBrand: true,
          categoryMapped: true,
          missingAttributes: !isBuyable ? ['buyable_status'] : [],
        });
      }

      page += 1;
      if (offers.length < pageSize) break;
    }

    return listings;
  }

  async fetchOrders(creds: MarketplaceCredentials, sinceIso: string): Promise<NormalizedOrder[]> {
    const ordersMap = new Map<string, NormalizedOrder>();
    let page = 1;
    const pageSize = 100;
    let totalResults = Infinity;
    const startDate = sinceIso.slice(0, 10);

    while (page <= 20) {
      const data = await takealotRequest<{
        total_results?: number;
        sales?: Array<any>;
      }>(
        `/sales?page_number=${page}&page_size=${pageSize}&filters=start_date:${startDate}`,
        creds
      );

      totalResults = data.total_results ?? 0;
      const sales = data.sales || [];
      if (sales.length === 0) break;

      for (const s of sales) {
        const orderId = String(s.order_id);
        const unitPriceCents = Math.round(Number(s.selling_price || 0) * 100);
        const qty = Number(s.quantity || 1);
        const existing = ordersMap.get(orderId);

        const item = {
          sku: String(s.sku || s.offer_id).trim(),
          quantity: qty,
          unitPriceCents,
        };

        if (existing) {
          existing.totalCents += unitPriceCents * qty;
          existing.items.push(item);
        } else {
          ordersMap.set(orderId, {
            orderNumber: orderId,
            waybillNumber: String(s.waybill || ''),
            courierName: 'Takealot Delivery',
            marketplaceStatus:
              s.sale_status === 'Shipped to Customer' || s.sale_status === 'Delivered'
                ? 'Delivered'
                : 'Awaiting dispatch',
            totalCents: unitPriceCents * qty,
            createdAt: String(s.order_date || new Date().toISOString()),
            items: [item],
          });
        }
      }

      if (page * pageSize >= totalResults || sales.length < pageSize) break;
      page += 1;
    }

    return Array.from(ordersMap.values());
  }

  async fetchReviews(): Promise<NormalizedReview[]> {
    return [];
  }

  async updatePrice(
    creds: MarketplaceCredentials,
    sku: string,
    priceCents: number
  ): Promise<void> {
    await takealotRequest('/offers/offer', creds, {
      method: 'PATCH',
      body: JSON.stringify({
        sku,
        selling_price: Math.round(priceCents / 100),
      }),
    });
  }

  async pushWaybillStatus(): Promise<void> {
    // Out of scope for paid beta
  }
}
