export interface ProductionModuleSpec {
  id: string;
  number: string;
  title: string;
  filePath: string;
  summary: string;
  snippet: string;
}

export const PRODUCTION_MODULES: ProductionModuleSpec[] = [
  {
    id: 'erd',
    number: '01',
    title: 'Database ERD & Complete SQL Schema',
    filePath: 'mvp/supabase/migrations/0002_production_saas.sql',
    summary:
      'Multi-tenant ERD linking workspaces, subscriptions, audit_logs, notifications, product_economics, competitor_prices, ai_recommendations, orders, and order_items.',
    snippet: `workspaces 1──1 subscriptions (Stripe)
workspaces 1──* workspace_members (4 RBAC roles)
workspaces 1──* audit_logs (immutable actor/diff log)
workspaces 1──* notifications (in_app, email, whatsapp)
products   1──* product_economics (COGS, VAT, fees, floor)
products   1──* competitor_prices (Buy Box & undercut %)`,
  },
  {
    id: 'rls',
    number: '02',
    title: 'Supabase RLS Policies & Auth Flow',
    filePath: 'mvp/supabase/migrations/0003_rls_policies.sql',
    summary:
      'Helper functions is_workspace_member() and has_workspace_role() enforce tenant isolation and restrict billing/audit tables to Executive and Ecommerce Manager roles.',
    snippet: `create policy "Executives inspect audit logs"
  on public.audit_logs for select
  using (public.has_workspace_role(workspace_id, array['executive']::public.user_role[]));`,
  },
  {
    id: 'stripe',
    number: '03',
    title: 'Stripe Subscription Billing & Audit Logging',
    filePath: 'mvp/apps/api_node/src/services/stripeBillingService.ts',
    summary:
      'Starter (3 channels / 250 SKUs), Growth (6 channels / 2,500 SKUs), and Enterprise tiers synced via signed Stripe webhooks and logged to audit_logs.',
    snippet: `export const PLAN_LIMITS = {
  starter: { maxMarketplaces: 3, maxSkus: 250 },
  growth: { maxMarketplaces: 6, maxSkus: 2500 },
  enterprise: { maxMarketplaces: 20, maxSkus: 25000 },
};`,
  },
  {
    id: 'notifications',
    number: '04',
    title: 'Notification, Email & WhatsApp Alert Engines',
    filePath: 'mvp/apps/api_node/src/services/notificationEngine.ts',
    summary:
      '6-hour dedup window routes Critical alerts to WhatsApp Cloud API + Resend Email and High/Medium alerts based on per-user severity preferences.',
    snippet: `if (pref.whatsapp_enabled && params.severity === 'critical') {
  await sendWhatsAppAlert({ toPhoneE164: pref.whatsapp_phone_e164, ... });
}`,
  },
  {
    id: 'profitability',
    number: '05',
    title: 'Product Profitability & Competitor Price Engines',
    filePath: 'mvp/apps/api_node/src/services/profitabilityEngine.ts',
    summary:
      'Calculates net margin after 15% VAT, COGS, packaging, marketplace commission, fulfillment, courier cost, and return allowance—plus minimum safe Buy Box floor price.',
    snippet: `netProfitCents = grossExVatCents - (cogs + packaging + commission + fulfillment + shipping + returns + ads);`,
  },
  {
    id: 'scoring',
    number: '06',
    title: 'Daily Priority Scoring & Recommendation Engines',
    filePath: 'mvp/apps/api_node/src/services/priorityScoringAlgorithm.ts',
    summary:
      'Weighted formula: Score = (RevenueAtRisk * 0.40) + (UrgencyDecay * 0.25) + (MarginImpact * 0.20) + (ChannelWeight * 0.15), paired with structured Gemini ROI recommendations.',
    snippet: `const score = revenueNorm * 0.4 + urgencyDecay * 0.25 + marginNorm * 0.2 + channelNorm * 0.15;
// >=75 Critical | >=50 High | >=25 Medium | <25 Low`,
  },
  {
    id: 'cicd',
    number: '07',
    title: 'OpenAPI Docs, Vitest Suite, Sentry & GitHub Actions -> Railway',
    filePath: 'mvp/.github/workflows/ci-cd.yml',
    summary:
      'Automated Vitest unit tests, Flutter analyze/test, OpenAPI 3.1.0 contract, Sentry Express instrumentation, and zero-downtime Railway API + Worker deployment.',
    snippet: `railway up --service ecompilot-api --detach
railway up --service ecompilot-worker --detach`,
  },
];
