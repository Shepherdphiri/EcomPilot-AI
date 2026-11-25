import { supabaseAdmin } from '../config/clients.js';

export function normalizeSkuKey(rawSku: string): string {
  return rawSku.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function resolveOrCreateCanonicalProduct(params: {
  workspaceId: string;
  provider: 'shopify' | 'takealot';
  externalSku: string;
  externalListingId: string;
  title: string;
  priceCents: number;
}): Promise<string> {
  const trimmedSku = params.externalSku.trim();

  // 1. Exact alias lookup
  const { data: existingAlias } = await supabaseAdmin
    .from('sku_aliases')
    .select('product_id')
    .eq('workspace_id', params.workspaceId)
    .eq('provider', params.provider)
    .eq('external_sku', trimmedSku)
    .maybeSingle();

  if (existingAlias?.product_id) {
    return existingAlias.product_id;
  }

  // 2. Match against existing canonical product (exact or normalized alphanumeric match)
  const { data: workspaceProducts } = await supabaseAdmin
    .from('products')
    .select('id, sku')
    .eq('workspace_id', params.workspaceId);

  const targetNorm = normalizeSkuKey(trimmedSku);
  const exactProd = (workspaceProducts || []).find((p) => p.sku.trim() === trimmedSku);
  const normProd =
    exactProd ||
    (workspaceProducts || []).find((p) => normalizeSkuKey(p.sku) === targetNorm);

  let productId = normProd?.id;
  let matchConfidence: 'exact' | 'normalized' = exactProd ? 'exact' : 'normalized';

  // 3. Create canonical product if none matched
  if (!productId) {
    const { data: created, error } = await supabaseAdmin
      .from('products')
      .insert({
        workspace_id: params.workspaceId,
        sku: trimmedSku,
        brand: 'Unassigned',
        title: params.title,
        category: 'General',
        unit_cost_cents: Math.round(params.priceCents * 0.55),
        target_price_cents: params.priceCents,
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(`Failed creating canonical product for ${trimmedSku}: ${error?.message}`);
    }
    productId = created.id;
    matchConfidence = 'exact';
  }

  await supabaseAdmin.from('sku_aliases').upsert(
    {
      workspace_id: params.workspaceId,
      product_id: productId,
      provider: params.provider,
      external_sku: trimmedSku,
      external_listing_id: params.externalListingId,
      match_confidence: matchConfidence,
    },
    { onConflict: 'workspace_id,provider,external_sku' }
  );

  return productId;
}

export async function linkManualSkuAlias(params: {
  workspaceId: string;
  productId: string;
  provider: 'shopify' | 'takealot';
  externalSku: string;
  externalListingId?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('sku_aliases')
    .upsert(
      {
        workspace_id: params.workspaceId,
        product_id: params.productId,
        provider: params.provider,
        external_sku: params.externalSku.trim(),
        external_listing_id: params.externalListingId ?? null,
        match_confidence: 'manual',
      },
      { onConflict: 'workspace_id,provider,external_sku' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed linking manual SKU alias: ${error.message}`);
  return data;
}
