-- EcomPilot Production SaaS Schema v2 (Extensions for Billing, Audit, Alerts, Profitability, Competitor Tracking, AI Recommendations)

-- 1. STRIPE SUBSCRIPTION BILLING
create type public.plan_tier as enum ('starter', 'growth', 'enterprise');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  plan_tier public.plan_tier not null default 'starter',
  status public.subscription_status not null default 'trialing',
  max_marketplaces int not null default 3,
  max_skus int not null default 250,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. IMMUTABLE AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role public.user_role,
  action text not null, -- e.g. 'price.synced', 'task.resolved', 'subscription.upgraded'
  resource_type text not null,
  resource_id text not null,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_workspace_time on public.audit_logs (workspace_id, created_at desc);

-- 3. NOTIFICATION ENGINE (IN-APP, EMAIL, WHATSAPP)
create type public.notification_channel as enum ('in_app', 'email', 'whatsapp', 'push');

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  whatsapp_phone_e164 text,
  min_severity public.task_severity not null default 'high',
  daily_digest_time time not null default '06:00:00',
  unique (workspace_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  channel public.notification_channel not null,
  severity public.task_severity not null,
  dedup_key text not null,
  title text not null,
  body text not null,
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed', 'read')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_dedup on public.notifications (workspace_id, dedup_key, created_at desc);

-- 4. PRODUCT PROFITABILITY ECONOMICS
create table public.product_economics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null,
  cogs_cents bigint not null,
  packaging_cents bigint not null default 0,
  commission_bps int not null, -- basis points (e.g. 1500 = 15.00%)
  fulfillment_fee_cents bigint not null default 0,
  shipping_cost_cents bigint not null default 0,
  vat_rate_bps int not null default 1500, -- 15% ZA VAT
  expected_return_rate_bps int not null default 300, -- 3.00%
  ad_spend_per_unit_cents bigint not null default 0,
  min_net_margin_bps int not null default 1500, -- 15% floor
  updated_at timestamptz not null default now(),
  unique (workspace_id, product_id, provider)
);

-- 5. COMPETITOR PRICE TRACKING
create table public.competitor_prices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null,
  competitor_seller_name text not null,
  competitor_price_cents bigint not null,
  our_price_cents bigint not null,
  is_buy_box_winner boolean not null default false,
  undercut_percent numeric(6,2) not null default 0,
  captured_at timestamptz not null default now()
);

create index idx_competitor_prices_latest on public.competitor_prices (workspace_id, product_id, captured_at desc);

-- 6. AI RECOMMENDATIONS & PRIORITY SCORE HISTORY
create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  domain text not null check (domain in ('content', 'pricing', 'inventory', 'packaging', 'shipping')),
  priority_score numeric(6,2) not null,
  confidence numeric(4,2) not null check (confidence between 0 and 1),
  estimated_monthly_roi_cents bigint not null default 0,
  recommendation_text text not null,
  action_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  created_at timestamptz not null default now()
);

-- 7. ORDERS & LINE ITEMS FOR REAL PROFITABILITY + VELOCITY
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  external_order_id text not null,
  order_status text not null,
  gross_total_cents bigint not null,
  marketplace_fees_cents bigint not null default 0,
  ordered_at timestamptz not null,
  unique (connection_id, external_order_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  quantity int not null,
  unit_price_cents bigint not null
);
