import { getMarketplaceAdapter, MarketplaceProvider, NormalizedListing } from '@ecompilot/connectors';
import { supabaseAdmin } from '../config/clients.js';
import { decryptCredentials } from '../config/crypto.js';
import { resolveOrCreateCanonicalProduct } from './skuAliasService.js';
import { evaluateOperationalPriorities } from './priorityEngine.js';
import { dispatchAlertNotification } from './notificationEngine.js';

export async function syncWorkspaceCatalogAndPriorities(workspaceId: string) {
  const { data: connections, error: connErr } = await supabaseAdmin
    .from('marketplace_connections')
    .select('id, provider, credentials_encrypted')
    .eq('workspace_id', workspaceId)
    .in('provider', ['shopify', 'takealot']);

  if (connErr) throw new Error(`Failed loading connections: ${connErr.message}`);
  if (!connections || connections.length === 0) {
    return { connectionsSynced: 0, listingsProcessed: 0, tasksGenerated: 0 };
  }

  const sinceIso = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const velocityByProduct = new Map<string, number>();
  const stockByProduct = new Map<string, number>();
  const evaluatedListings: Array<
    NormalizedListing & {
      provider: string;
      connectionId: string;
      productId: string;
      canonicalSku: string;
      targetPriceCents: number;
      channelRevenueShare: number;
    }
  > = [];

  for (const conn of connections) {
    const provider = conn.provider as 'shopify' | 'takealot';
    const adapter = getMarketplaceAdapter(provider as MarketplaceProvider);
    const creds = decryptCredentials(conn.credentials_encrypted);

    const [listings, orders] = await Promise.all([
      adapter.fetchListings(creds),
      adapter.fetchOrders(creds, sinceIso),
    ]);

    for (const lst of listings) {
      const productId = await resolveOrCreateCanonicalProduct({
        workspaceId,
        provider,
        externalSku: lst.sku,
        externalListingId: lst.externalListingId,
        title: lst.title,
        priceCents: lst.priceCents,
      });

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('sku, target_price_cents')
        .eq('id', productId)
        .single();

      await supabaseAdmin.from('marketplace_listings').upsert(
        {
          workspace_id: workspaceId,
          product_id: productId,
          connection_id: conn.id,
          external_listing_id: lst.externalListingId,
          channel_title: lst.title,
          channel_price_cents: lst.priceCents,
          has_buy_box: lst.hasBuyBox,
          status: lst.status,
          suppression_reason: lst.suppressionReason ?? null,
          listing_score: lst.status === 'active' ? 85 : 55,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'connection_id,external_listing_id' }
      );

      stockByProduct.set(
        productId,
        Math.max(stockByProduct.get(productId) || 0, lst.stockUnits)
      );

      evaluatedListings.push({
        ...lst,
        provider,
        connectionId: conn.id,
        productId,
        canonicalSku: product?.sku || lst.sku,
        targetPriceCents: product?.target_price_cents || lst.priceCents,
        channelRevenueShare: 1 / connections.length,
      });
    }

    for (const ord of orders) {
      const { data: orderRow } = await supabaseAdmin
        .from('orders')
        .upsert(
          {
            workspace_id: workspaceId,
            connection_id: conn.id,
            external_order_id: ord.orderNumber,
            order_status: ord.marketplaceStatus,
            gross_total_cents: ord.totalCents,
            ordered_at: ord.createdAt,
          },
          { onConflict: 'connection_id,external_order_id' }
        )
        .select('id')
        .single();

      for (const item of ord.items) {
        const productId = await resolveOrCreateCanonicalProduct({
          workspaceId,
          provider,
          externalSku: item.sku,
          externalListingId: item.sku,
          title: item.sku,
          priceCents: item.unitPriceCents,
        });

        velocityByProduct.set(
          productId,
          (velocityByProduct.get(productId) || 0) + item.quantity
        );

        if (orderRow?.id) {
          await supabaseAdmin.from('order_items').insert({
            order_id: orderRow.id,
            product_id: productId,
            sku: item.sku,
            quantity: item.quantity,
            unit_price_cents: item.unitPriceCents,
          });
        }
      }
    }

    const suppressedCount = listings.filter((l) => l.status === 'suppressed').length;
    const healthScore = Math.max(40, 100 - suppressedCount * 6);
    await supabaseAdmin
      .from('marketplace_connections')
      .update({
        sync_status: 'healthy',
        health_score: healthScore,
        last_synced_at: new Date().toISOString(),
        last_order_sync_at: new Date().toISOString(),
      })
      .eq('id', conn.id);
  }

  const { data: allProducts } = await supabaseAdmin
    .from('products')
    .select('id, sku, target_price_cents, lead_time_days')
    .eq('workspace_id', workspaceId);

  const inventoryInputs = [];
  for (const prod of allProducts || []) {
    const units14d = velocityByProduct.get(prod.id) || 0;
    const dailyVelocity = Math.round((units14d / 14) * 100) / 100;
    const availableUnits = stockByProduct.get(prod.id) ?? 0;

    await supabaseAdmin.from('inventory_snapshots').insert({
      workspace_id: workspaceId,
      product_id: prod.id,
      available_units: availableUnits,
      daily_sales_velocity: dailyVelocity,
      captured_at: new Date().toISOString(),
    });

    inventoryInputs.push({
      productId: prod.id,
      sku: prod.sku,
      availableUnits,
      dailyVelocity,
      priceCents: prod.target_price_cents,
      leadTimeDays: prod.lead_time_days || 14,
      channelRevenueShare: 0.5,
    });
  }

  const evaluatedTasks = evaluateOperationalPriorities({
    listings: evaluatedListings,
    inventory: inventoryInputs,
  });

  // Replace stale open tasks with fresh prioritized evaluation
  await supabaseAdmin
    .from('priority_tasks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('status', 'open');

  if (evaluatedTasks.length > 0) {
    await supabaseAdmin.from('priority_tasks').insert(
      evaluatedTasks.map((t) => ({
        workspace_id: workspaceId,
        product_id: t.productId ?? null,
        connection_id: t.connectionId ?? null,
        severity: t.severity,
        category: t.category,
        title: t.title,
        summary: t.summary,
        recommended_action: t.recommendedAction,
        estimated_revenue_impact_cents: t.estimatedRevenueImpactCents,
        target_roles: t.targetRoles,
        status: 'open',
      }))
    );
  }

  for (const t of evaluatedTasks.filter((x) => x.severity === 'critical' || x.severity === 'high')) {
    await dispatchAlertNotification({
      workspaceId,
      severity: t.severity,
      dedupKey: `${t.category}:${t.sku}`,
      title: t.title,
      body: `${t.summary} Recommended action: ${t.recommendedAction}`,
    });
  }

  return {
    connectionsSynced: connections.length,
    listingsProcessed: evaluatedListings.length,
    tasksGenerated: evaluatedTasks.length,
  };
}
