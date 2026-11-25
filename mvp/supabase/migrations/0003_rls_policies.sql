-- EcomPilot Production Supabase Row Level Security (RLS) Policies

-- Helper: Check if current authenticated user belongs to workspace
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
  );
$$;

-- Helper: Check if current user holds one of the permitted roles in workspace
create or replace function public.has_workspace_role(ws_id uuid, allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

-- Enable RLS across all new production tables
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.product_economics enable row level security;
alter table public.competitor_prices enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Workspaces: Members can view their workspace
create policy "Members read own workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

-- Workspace Members: Members read directory; Executives manage team roles
create policy "Members read team roster"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "Executives manage team members"
  on public.workspace_members for all
  using (public.has_workspace_role(workspace_id, array['executive']::public.user_role[]));

-- Products & Listings: All members read; Content/Ecommerce Managers & Executives mutate
create policy "Members read products"
  on public.products for select
  using (public.is_workspace_member(workspace_id));

create policy "Authorized roles write products"
  on public.products for all
  using (
    public.has_workspace_role(
      workspace_id,
      array['ecommerce_manager', 'content_manager', 'executive']::public.user_role[]
    )
  );

-- Subscriptions: Only Executives and Ecommerce Managers read billing state (mutations via Stripe webhook service role only)
create policy "Managers read subscription"
  on public.subscriptions for select
  using (
    public.has_workspace_role(
      workspace_id,
      array['ecommerce_manager', 'executive']::public.user_role[]
    )
  );

-- Audit Logs: Read-only for Executives; append-only via backend service_role
create policy "Executives inspect audit logs"
  on public.audit_logs for select
  using (public.has_workspace_role(workspace_id, array['executive']::public.user_role[]));

-- Notifications & Preferences: Users manage own preferences and read own notifications
create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "Users read own notifications"
  on public.notifications for select
  using (
    public.is_workspace_member(workspace_id)
    and (user_id is null or user_id = auth.uid())
  );

-- Product Economics, Competitor Prices, AI Recommendations, Orders
create policy "Members read product economics"
  on public.product_economics for select
  using (public.is_workspace_member(workspace_id));

create policy "Managers update product economics"
  on public.product_economics for all
  using (
    public.has_workspace_role(
      workspace_id,
      array['ecommerce_manager', 'executive']::public.user_role[]
    )
  );

create policy "Members read competitor prices"
  on public.competitor_prices for select
  using (public.is_workspace_member(workspace_id));

create policy "Members read AI recommendations"
  on public.ai_recommendations for select
  using (public.is_workspace_member(workspace_id));

create policy "Members read orders"
  on public.orders for select
  using (public.is_workspace_member(workspace_id));

create policy "Members read order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_workspace_member(o.workspace_id)
    )
  );
