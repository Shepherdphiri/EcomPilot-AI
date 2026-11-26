-- Migration 0005: Backward-Compatible Operations OS Extensions
-- Extends channel alias coverage, adds warehouses, suppliers, POs, returns, courier reconciliation, stock transfers, and automation guardrails.

-- 1. Expand sku_aliases provider constraint to support all 6 active channels
alter table public.sku_aliases
  drop constraint if exists sku_aliases_provider_check;

alter table public.sku_aliases
  add constraint sku_aliases_provider_check
  check (provider in ('shopify', 'takealot', 'makro', 'amazon_sc', 'amazon_vc', 'woocommerce'));

-- 2. Warehouses & Stock Transfers
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text not null,
  city text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, code)
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  from_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  to_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity int not null check (quantity > 0),
  status text not null default 'planned' check (status in ('planned', 'in_transit', 'completed')),
  created_at timestamptz not null default now()
);

-- 3. Suppliers & Purchase Orders
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  country text not null default 'ZA',
  avg_lead_time_days int not null default 14,
  on_time_rate_pct numeric(5,2) not null default 95.0,
  moq_units int not null default 20,
  delay_risk text not null default 'low' check (delay_risk in ('low', 'medium', 'high')),
  delay_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  po_number text not null,
  quantity int not null check (quantity > 0),
  unit_cost_cents bigint not null,
  eta_days int not null default 7,
  status text not null default 'ordered' check (status in ('draft', 'ordered', 'in_transit', 'delayed', 'received')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, po_number)
);

-- 4. Returns & Courier Reconciliation
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  provider text not null,
  reason_code text not null,
  refund_cents bigint not null default 0,
  returned_at timestamptz not null default now()
);

create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  external_order_number text not null,
  waybill_number text not null,
  courier_name text not null,
  courier_status text not null,
  marketplace_status text not null,
  issue_flag text not null default 'nominal',
  synced boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 5. Operational Automation Guardrails
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rule_key text not null,
  title text not null,
  trigger_condition text not null,
  action_summary text not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  executions_count int not null default 0,
  unique (workspace_id, rule_key)
);

create index if not exists idx_po_workspace_status on public.purchase_orders (workspace_id, status);
create index if not exists idx_courier_workspace_synced on public.courier_shipments (workspace_id, synced);
create index if not exists idx_returns_workspace_time on public.returns (workspace_id, returned_at desc);

-- Enable RLS & apply existing helper policies
alter table public.warehouses enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.returns enable row level security;
alter table public.courier_shipments enable row level security;
alter table public.automation_rules enable row level security;

create policy "Members read warehouses" on public.warehouses for select using (public.is_workspace_member(workspace_id));
create policy "Members read suppliers" on public.suppliers for select using (public.is_workspace_member(workspace_id));
create policy "Members read purchase_orders" on public.purchase_orders for select using (public.is_workspace_member(workspace_id));
create policy "Members read returns" on public.returns for select using (public.is_workspace_member(workspace_id));
create policy "Members read courier_shipments" on public.courier_shipments for select using (public.is_workspace_member(workspace_id));
create policy "Members read automation_rules" on public.automation_rules for select using (public.is_workspace_member(workspace_id));
create policy "Members read stock_transfers" on public.stock_transfers for select using (public.is_workspace_member(workspace_id));

create policy "Managers write purchase_orders" on public.purchase_orders for all
  using (public.has_workspace_role(workspace_id, array['ecommerce_manager', 'inventory_manager', 'executive']::public.user_role[]));

create policy "Managers write automation_rules" on public.automation_rules for all
  using (public.has_workspace_role(workspace_id, array['ecommerce_manager', 'executive']::public.user_role[]));
