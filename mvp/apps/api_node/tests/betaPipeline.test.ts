import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShopifyAdapter } from '@ecompilot/connectors/src/adapters/ShopifyAdapter.js';
import { TakealotAdapter } from '@ecompilot/connectors/src/adapters/TakealotAdapter.js';
import { normalizeSkuKey } from '../src/services/skuAliasService.js';
import { evaluateOperationalPriorities } from '../src/services/priorityEngine.js';

describe('Paid Beta Pipeline (Shopify + Takealot + SKU Alias + Priority Scoring)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes mismatched Shopify and Takealot SKUs cleanly', () => {
    expect(normalizeSkuKey(' ap-fry-600 ')).toBe('APFRY600');
    expect(normalizeSkuKey('AP_FRY_600')).toBe('APFRY600');
  });

  it('paginates Shopify GraphQL listings and extracts variants', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              products: {
                pageInfo: { hasNextPage: false, endCursor: null },
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/1',
                      title: 'Apex 6L Air Fryer',
                      vendor: 'Apex',
                      status: 'ACTIVE',
                      productType: 'Appliances',
                      images: { edges: [{ node: { url: 'https://cdn/1.jpg' } }] },
                      variants: {
                        edges: [
                          {
                            node: {
                              id: 'gid://shopify/ProductVariant/11',
                              sku: 'AP-FRY-600',
                              price: '1799.00',
                              inventoryQuantity: 42,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          }),
          { status: 200 }
        )
      );

    const adapter = new ShopifyAdapter();
    const listings = await adapter.fetchListings({
      storeDomain: 'apex.myshopify.com',
      accessToken: 'shpat_test',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listings).toHaveLength(1);
    expect(listings[0].sku).toBe('AP-FRY-600');
    expect(listings[0].priceCents).toBe(179900);
  });

  it('maps Takealot non-buyable offers to suppressed status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total_results: 1,
          offers: [
            {
              offer_id: 99123,
              sku: 'AP_FRY_600',
              title: 'Apex 6L Air Fryer',
              selling_price: 1699,
              stock_at_takealot_total: 10,
              status: 'Disabled by Seller',
            },
          ],
        }),
        { status: 200 }
      )
    );

    const adapter = new TakealotAdapter();
    const listings = await adapter.fetchListings({ apiKey: 'tk_test_key' });

    expect(listings[0].status).toBe('suppressed');
    expect(listings[0].suppressionReason).toBe('Disabled by Seller');
  });

  it('ranks suppressed listings and imminent stockouts via priority scoring pipeline', () => {
    const tasks = evaluateOperationalPriorities({
      listings: [
        {
          externalListingId: '99123',
          sku: 'AP_FRY_600',
          canonicalSku: 'AP-FRY-600',
          title: 'Apex 6L Air Fryer',
          priceCents: 169900,
          targetPriceCents: 179900,
          stockUnits: 10,
          status: 'suppressed',
          suppressionReason: 'Disabled by Seller',
          hasBuyBox: false,
          bulletCount: 4,
          imageCount: 3,
          lifestyleImageCount: 0,
          hasBrand: true,
          categoryMapped: true,
          missingAttributes: ['buyable_status'],
          provider: 'takealot',
          connectionId: 'conn-1',
          productId: 'prod-1',
          channelRevenueShare: 0.6,
        },
      ],
      inventory: [
        {
          productId: 'prod-1',
          sku: 'AP-FRY-600',
          availableUnits: 20,
          dailyVelocity: 10,
          priceCents: 179900,
          leadTimeDays: 14,
          channelRevenueShare: 0.6,
        },
      ],
    });

    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks[0].severity).toBe('critical');
    expect(tasks[0].priorityScore).toBeGreaterThanOrEqual(tasks[1].priorityScore);
  });
});
