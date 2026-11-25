import {
  MarketplaceAdapter,
  MarketplaceCredentials,
  NormalizedListing,
  NormalizedOrder,
  NormalizedReview,
} from '../base/MarketplaceAdapter.js';

async function shopifyGraphql<T>(
  creds: MarketplaceCredentials,
  query: string,
  variables?: Record<string, unknown>,
  attempt = 1
): Promise<T> {
  if (!creds.storeDomain || !creds.accessToken) {
    throw new Error('Missing Shopify storeDomain or accessToken.');
  }

  const endpoint = `https://${creds.storeDomain}/admin/api/2025-01/graphql.json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': creds.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get('Retry-After') || 2);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return shopifyGraphql<T>(creds, query, variables, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${await res.text()}`);
  }

  const payload = (await res.json()) as { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };
  if (payload.errors?.length) {
    const throttled = payload.errors.some((e) => e.extensions?.code === 'THROTTLED');
    if (throttled && attempt <= 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return shopifyGraphql<T>(creds, query, variables, attempt + 1);
    }
    throw new Error(`Shopify GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
  }

  if (!payload.data) {
    throw new Error('Shopify GraphQL returned empty data payload.');
  }

  return payload.data;
}

export class ShopifyAdapter implements MarketplaceAdapter {
  readonly provider = 'shopify' as const;
  readonly displayName = 'Shopify D2C Store';

  async fetchListings(creds: MarketplaceCredentials): Promise<NormalizedListing[]> {
    const results: NormalizedListing[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    const query = `
      query FetchProducts($cursor: String) {
        products(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              vendor
              status
              productType
              images(first: 10) { edges { node { url } } }
              variants(first: 20) {
                edges {
                  node {
                    id
                    sku
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    while (hasNextPage) {
      const data = await shopifyGraphql<{
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: any }>;
        };
      }>(creds, query, { cursor });

      for (const edge of data.products.edges) {
        const p = edge.node;
        const imageCount = p.images?.edges?.length || 0;
        for (const vEdge of p.variants?.edges || []) {
          const v = vEdge.node;
          results.push({
            externalListingId: String(v.id || p.id),
            sku: (v.sku || '').trim() || `SHOPIFY-${String(v.id).split('/').pop()}`,
            title: p.title,
            priceCents: Math.round(Number(v.price || 0) * 100),
            stockUnits: Number(v.inventoryQuantity || 0),
            status: p.status === 'ACTIVE' ? 'active' : 'inactive',
            hasBuyBox: true,
            bulletCount: 4,
            imageCount,
            lifestyleImageCount: imageCount > 1 ? 1 : 0,
            hasBrand: Boolean(p.vendor),
            categoryMapped: Boolean(p.productType),
            missingAttributes: !v.sku ? ['sku'] : [],
          });
        }
      }

      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
    }

    return results;
  }

  async fetchOrders(creds: MarketplaceCredentials, sinceIso: string): Promise<NormalizedOrder[]> {
    const results: NormalizedOrder[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    const searchQuery = `created_at:>=${sinceIso} financial_status:paid`;

    const query = `
      query FetchOrders($cursor: String, $q: String!) {
        orders(first: 100, after: $cursor, query: $q) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              name
              createdAt
              displayFulfillmentStatus
              totalPriceSet { shopMoney { amount } }
              fulfillments(first: 3) {
                trackingInfo { number company }
              }
              lineItems(first: 50) {
                edges {
                  node {
                    sku
                    quantity
                    originalUnitPriceSet { shopMoney { amount } }
                  }
                }
              }
            }
          }
        }
      }
    `;

    while (hasNextPage) {
      const data = await shopifyGraphql<{
        orders: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          edges: Array<{ node: any }>;
        };
      }>(creds, query, { cursor, q: searchQuery });

      for (const edge of data.orders.edges) {
        const o = edge.node;
        const tracking = o.fulfillments?.[0]?.trackingInfo?.[0];
        results.push({
          orderNumber: o.name,
          waybillNumber: tracking?.number || '',
          courierName: tracking?.company || 'Unassigned',
          marketplaceStatus:
            o.displayFulfillmentStatus === 'FULFILLED' ? 'Delivered' : 'Awaiting dispatch',
          totalCents: Math.round(Number(o.totalPriceSet?.shopMoney?.amount || 0) * 100),
          createdAt: o.createdAt,
          items: (o.lineItems?.edges || [])
            .filter((li: any) => li.node.sku)
            .map((li: any) => ({
              sku: String(li.node.sku).trim(),
              quantity: Number(li.node.quantity || 1),
              unitPriceCents: Math.round(
                Number(li.node.originalUnitPriceSet?.shopMoney?.amount || 0) * 100
              ),
            })),
        });
      }

      hasNextPage = data.orders.pageInfo.hasNextPage;
      cursor = data.orders.pageInfo.endCursor;
    }

    return results;
  }

  async fetchReviews(_creds: MarketplaceCredentials, _sku: string): Promise<NormalizedReview[]> {
    return [];
  }

  async updatePrice(
    creds: MarketplaceCredentials,
    sku: string,
    priceCents: number
  ): Promise<void> {
    const lookupQuery = `
      query FindVariant($q: String!) {
        productVariants(first: 1, query: $q) {
          edges { node { id product { id } } }
        }
      }
    `;
    const found = await shopifyGraphql<{
      productVariants: { edges: Array<{ node: { id: string; product: { id: string } } }> };
    }>(creds, lookupQuery, { q: `sku:${sku}` });

    const variant = found.productVariants.edges[0]?.node;
    if (!variant) {
      throw new Error(`Shopify variant not found for SKU ${sku}`);
    }

    const mutation = `
      mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }
    `;
    const res = await shopifyGraphql<{
      productVariantsBulkUpdate: { userErrors: Array<{ message: string }> };
    }>(creds, mutation, {
      productId: variant.product.id,
      variants: [{ id: variant.id, price: (priceCents / 100).toFixed(2) }],
    });

    const errors = res.productVariantsBulkUpdate.userErrors;
    if (errors.length > 0) {
      throw new Error(`Shopify price update failed: ${errors.map((e) => e.message).join('; ')}`);
    }
  }

  async pushWaybillStatus(): Promise<void> {
    // Out of scope for paid beta
  }
}
