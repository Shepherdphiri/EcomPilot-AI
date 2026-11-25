import Stripe from 'stripe';
import { supabaseAdmin } from '../config/clients.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const PLAN_LIMITS = {
  starter: { maxMarketplaces: 3, maxSkus: 250, priceId: process.env.STRIPE_PRICE_STARTER || '' },
  growth: { maxMarketplaces: 6, maxSkus: 2500, priceId: process.env.STRIPE_PRICE_GROWTH || '' },
  enterprise: { maxMarketplaces: 20, maxSkus: 25000, priceId: process.env.STRIPE_PRICE_ENTERPRISE || '' },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export async function createCheckoutSession(params: {
  workspaceId: string;
  customerEmail: string;
  tier: PlanTier;
  successUrl: string;
  cancelUrl: string;
}) {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', params.workspaceId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.customerEmail,
      metadata: { workspaceId: params.workspaceId },
    });
    customerId = customer.id;
    await supabaseAdmin.from('subscriptions').upsert({
      workspace_id: params.workspaceId,
      stripe_customer_id: customerId,
      plan_tier: 'starter',
      status: 'incomplete',
    });
  }

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PLAN_LIMITS[params.tier].priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { workspaceId: params.workspaceId, tier: params.tier },
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = String(subscription.customer);
    const tier = ((subscription.metadata?.tier as PlanTier) || 'starter');
    const limits = PLAN_LIMITS[tier];

    await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        plan_tier: tier,
        max_marketplaces: limits.maxMarketplaces,
        max_skus: limits.maxSkus,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);
  }

  return { received: true, type: event.type };
}
