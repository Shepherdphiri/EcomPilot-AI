import { MarketplaceAdapter, MarketplaceProvider } from './base/MarketplaceAdapter.js';
import { ShopifyAdapter } from './adapters/ShopifyAdapter.js';
import { AmazonSellerAdapter } from './adapters/AmazonSellerAdapter.js';
import { AmazonVendorAdapter } from './adapters/AmazonVendorAdapter.js';
import { TakealotAdapter } from './adapters/TakealotAdapter.js';
import { MakroAdapter } from './adapters/MakroAdapter.js';
import { LeroyMerlinAdapter } from './adapters/LeroyMerlinAdapter.js';

const ADAPTER_REGISTRY: Record<MarketplaceProvider, MarketplaceAdapter> = {
  shopify: new ShopifyAdapter(),
  amazon_seller: new AmazonSellerAdapter(),
  amazon_vendor: new AmazonVendorAdapter(),
  takealot: new TakealotAdapter(),
  makro: new MakroAdapter(),
  leroy_merlin: new LeroyMerlinAdapter(),
};

export function getMarketplaceAdapter(provider: MarketplaceProvider): MarketplaceAdapter {
  const adapter = ADAPTER_REGISTRY[provider];
  if (!adapter) {
    throw new Error(`Unsupported marketplace provider: ${provider}`);
  }
  return adapter;
}

export * from './base/MarketplaceAdapter.js';
export * from './couriers/InternetExpressTracker.js';
