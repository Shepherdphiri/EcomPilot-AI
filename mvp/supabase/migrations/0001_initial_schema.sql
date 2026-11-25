-- EcomPilot AI — Production Supabase PostgreSQL Migration
-- Supports multi-tenant workspaces, 4-role RBAC, modular marketplaces, inventory, pricing, reviews, shipping, and daily AI reports.

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'ecommerce_manager',
  'content_manager',
  'inventory_manager',
  'executive'
);

create type public.task_severity as enum ('critical', 'high', 'medium', 'low');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'ZAR',
  timezone text not null default 'Africa/Johannesburg',
  daily_report_hour int not null default 6,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'ecommerce_manager',
  full_name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null, -- shopify | amazon_seller | amazon_vendor | takealot | makro | leroy_merlin
  account_label text not null,
  credentials_encrypted text not null,
  sync_status text not null default 'healthy',
  health_score int not null default 100 check (health_score between 0 and 100),
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sku text not null,
  brand text not null,
  title text not null,
  category text not null,
  dimensions_cm text,
  weight_kg numeric(8,2),
  specifications jsonb not null default '{}'::jsonb,
  unit_cost_cents bigint not null,
  target_price_cents bigint not null,
  primary_image_url text,
  lifestyle_image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (workspace_id, sku)
);

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  external_listing_id text not null,
  channel_title text not null,
  channel_price_cents bigint not null,
  has_buy_box boolean not null default true,
  status text not null check (status in ('active', 'suppressed', 'inactive')),
  suppression_reason text,
  listing_score int not null default 0 check (listing_score between 0 and 100),
  quality_breakdown jsonb not null default '{}'::jsonb,
  recommendations text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.priority_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  connection_id uuid references public.marketplace_connections(id) on delete set null,
  severity public.task_severity not null,
  category text not null,
  title text not null,
  summary text not null,
  recommended_action text not null,
  estimated_revenue_impact_cents bigint not null default 0,
  target_roles public.user_role[] not null,
  status text not null default 'open' check (status in ('open', 'snoozed', 'resolved')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_priority_tasks_open
  on public.priority_tasks (workspace_id, status, severity);

create table public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  available_units int not null,
  daily_sales_velocity numeric(10,2) not null,
  incoming_units int not null default 0,
  incoming_eta date,
  days_of_cover numeric(10,1) generated always as (
    case when daily_sales_velocity > 0 then round(available_units / daily_sales_velocity, 1) else 999 end
  ) stored,
  captured_at timestamptz not null default now()
);

create table public.review_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sentiment_score int not null check (sentiment_score between 0 and 100),
  top_complaints jsonb not null default '[]'::jsonb,
  top_positives jsonb not null default '[]'::jsonb,
  ai_recommendation text not null,
  analyzed_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  order_number text not null,
  waybill_number text not null,
  courier_name text not null,
  courier_status text not null,
  marketplace_status text not null,
  issue_flag text not null default 'nominal',
  dispatched_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.daily_ai_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  report_date date not null,
  revenue_yesterday_cents bigint not null,
  orders_count int not null,
  low_stock_count int not null,
  suppressed_count int not null,
  delayed_deliveries_count int not null,
  potential_loss_cents bigint not null,
  executive_summary text not null,
  top_actions jsonb not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, report_date)
);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.marketplace_connections enable row level security;
alter table public.products enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.priority_tasks enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.review_insights enable row level security;
alter table public.shipments enable row level security;
alter table public.daily_ai_reports enable row level security;

create policy "Workspace members can read tasks"
  on public.priority_tasks for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = priority_tasks.workspace_id
        and wm.user_id = auth.uid()
    )
  );
