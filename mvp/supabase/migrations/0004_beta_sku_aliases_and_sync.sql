-- Migration 0004: Paid Beta SKU Alias Mapping & Sync Metadata

create table if not exists public.sku_aliases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null check (provider in ('shopify', 'takealot')),
  external_sku text not null,
  external_listing_id text,
  match_confidence text not null default 'exact' check (match_confidence in ('exact', 'normalized', 'manual')),
  created_at timestamptz not null default now(),
  unique (workspace_id, provider, external_sku)
);

create index if not exists idx_sku_aliases_lookup
  on public.sku_aliases (workspace_id, provider, external_sku);

alter table public.products
  add column if not exists lead_time_days int not null default 14;

alter table public.marketplace_connections
  add column if not exists last_order_sync_at timestamptz;

alter table public.marketplace_listings
  add constraint uq_marketplace_listings_conn_ext unique (connection_id, external_listing_id);

-- RLS for sku_aliases
alter table public.sku_aliases enable row level security;

create policy "Members read sku aliases"
  on public.sku_aliases for select
  using (public.is_workspace_member(workspace_id));

create policy "Managers edit sku aliases"
  on public.sku_aliases for all
  using (
    public.has_workspace_role(
      workspace_id,
      array['ecommerce_manager', 'content_manager', 'inventory_manager', 'executive']::public.user_role[]
    )
  );
