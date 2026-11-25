export const SUPABASE_POSTGRES_SCHEMA = `-- EcomPilot AI — Production Supabase PostgreSQL Schema
-- Modular multi-tenant ecommerce operations platform
-- Supports: Shopify, Amazon SC/VC, Takealot, Makro, Leroy Merlin + future channels

create extension if not exists "pgcrypto";

-- 1. WORKSPACES & RBAC
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'ZAR',
  timezone text not null default 'Africa/Johannesburg',
  daily_report_hour int not null default 6,
  created_at timestamptz not null default now()
);

create type public.user_role as enum (
  'ecommerce_manager',
  'content_manager',
  'inventory_manager',
  'executive'
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

-- 2. MODULAR MARKETPLACE CONNECTIONS
create table public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null, -- 'shopify' | 'amazon_seller' | 'amazon_vendor' | 'takealot' | 'makro' | 'leroy_merlin'
  account_label text not null,
  credentials_encrypted text not null, -- AES-256-GCM envelope
  sync_status text not null default 'healthy',
  health_score int not null default 100 check (health_score between 0 and 100),
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. MASTER PRODUCT CATALOG & CHANNEL LISTINGS
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
  primary_image_url text, -- Cloudinary secure URL
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
  has_buy_box boolean default true,
  status text not null check (status in ('active', 'suppressed', 'inactive')),
  suppression_reason text,
  listing_score int not null default 0 check (listing_score between 0 and 100),
  quality_breakdown jsonb not null default '{}'::jsonb,
  recommendations text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- 4. PRIORITY ACTION ENGINE ("What requires my attention today?")
create type public.task_severity as enum ('critical', 'high', 'medium', 'low');

create table public.priority_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  connection_id uuid references public.marketplace_connections(id) on delete set null,
  severity public.task_severity not null,
  category text not null, -- 'suppression' | 'stockout' | 'buy_box' | 'pricing' | 'shipping' | 'content' | 'reviews'
  title text not null,
  summary text not null,
  recommended_action text not null,
  estimated_revenue_impact_cents bigint not null default 0,
  target_roles public.user_role[] not null,
  status text not null default 'open' check (status in ('open', 'snoozed', 'resolved')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_priority_tasks_workspace_open
  on public.priority_tasks (workspace_id, status, severity);

-- 5. INVENTORY INTELLIGENCE & FORECASTING
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

-- 6. REVIEWS & SHIPPING INTELLIGENCE
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

-- 7. DAILY AI MORNING REPORTS & CONTENT JOBS
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

-- ROW LEVEL SECURITY (RLS)
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.priority_tasks enable row level security;
alter table public.products enable row level security;
alter table public.marketplace_listings enable row level security;

create policy "Members view own workspace tasks"
  on public.priority_tasks for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = priority_tasks.workspace_id
        and wm.user_id = auth.uid()
    )
  );`;

export const API_ENDPOINTS_SPEC = [
  {
    method: 'GET',
    path: '/api/v1/workspaces/:id/priority-center',
    auth: 'Bearer JWT + Role Filter',
    purpose: 'Returns prioritized Critical/High/Medium/Low tasks tailored to the active user role.',
    response: '{ critical: Task[], high: Task[], medium: Task[], low: Task[], roleFocus: string }',
  },
  {
    method: 'POST',
    path: '/api/v1/tasks/:taskId/resolve',
    auth: 'Bearer JWT',
    purpose: 'Marks operational issue resolved and triggers connector re-sync if applicable.',
    response: '{ resolved: true, updatedHealthScore: number }',
  },
  {
    method: 'GET',
    path: '/api/v1/marketplaces/health',
    auth: 'Bearer JWT',
    purpose: 'Aggregates total, active, suppressed, inventory, and content issues per channel.',
    response: '{ marketplaces: MarketplaceHealth[] }',
  },
  {
    method: 'POST',
    path: '/api/v1/ai/content-generate',
    auth: 'Bearer JWT + Rate Limit',
    purpose: 'Accepts product image (Cloudinary/base64), dimensions, and specs; calls Gemini to emit channel-ready copy.',
    response: '{ amazonTitle, takealotTitle, shopifyTitle, bulletPoints[], keywords[], productDescription, metaDescription }',
  },
  {
    method: 'GET',
    path: '/api/v1/inventory/cover',
    auth: 'Bearer JWT',
    purpose: 'Computes days of cover (currentStock / dailyVelocity) and stockout risk dates.',
    response: '{ items: InventoryCoverRow[], lowStockCount: number }',
  },
  {
    method: 'POST',
    path: '/api/v1/pricing/sync',
    auth: 'Bearer JWT (Ecommerce Manager / Exec)',
    purpose: 'Pushes target parity price to Takealot, Makro, Shopify, or Amazon connector.',
    response: '{ sku: string, syncedChannels: string[], updatedAt: string }',
  },
  {
    method: 'POST',
    path: '/api/v1/ai/analyze-reviews',
    auth: 'Bearer JWT',
    purpose: 'Runs Gemini sentiment clustering on recent marketplace reviews to surface packaging/product defects.',
    response: '{ sentimentScore, topComplaint, complaintMentions, recommendation }',
  },
  {
    method: 'POST',
    path: '/api/v1/shipping/reconcile/:orderId',
    auth: 'Bearer JWT',
    purpose: 'Compares courier tracking (Internet Express, TCG, RAM) with marketplace status and pushes POD.',
    response: '{ orderId, waybill, syncedStatus: "Delivered" }',
  },
  {
    method: 'GET',
    path: '/api/v1/reports/daily',
    auth: 'Bearer JWT',
    purpose: 'Fetches 06:00 SAST morning AI report with revenue loss risk and top 5 actions.',
    response: '{ revenueYesterdayZar, ordersCount, potentialRevenueLossZar, topActions[] }',
  },
  {
    method: 'POST',
    path: '/api/v1/ai/chat',
    auth: 'Bearer JWT',
    purpose: 'Conversational Gemini assistant grounded in live workspace inventory, listings, pricing, and orders.',
    response: '{ reply: string, referencedSkus: string[] }',
  },
];

export const FLUTTER_PAGE_STRUCTURE = `lib/
├── main.dart
├── app/
│   ├── router.dart                 # GoRouter with role-aware guards & shell route
│   ├── theme.dart                  # Daylight slate palette + JetBrains Mono tabular text styles
│   └── providers/
│       ├── auth_provider.dart      # Supabase Auth session & active workspace role
│       └── api_client.dart         # Dio HTTP client with JWT interceptor
├── core/
│   ├── widgets/
│   │   ├── app_shell.dart          # Responsive Rail (Tablet/Desktop) + BottomNav (Mobile)
│   │   ├── priority_tile.dart      # Critical/High/Medium/Low action row
│   │   └── metric_cell.dart        # Tabular-nums KPI block
│   └── utils/
│       └── currency_formatter.dart # ZAR (R82,300) formatting
└── features/
    ├── priority_center/
    │   ├── priority_center_page.dart
    │   └── priority_controller.dart
    ├── marketplace_health/
    │   ├── marketplace_health_page.dart
    │   └── connector_detail_sheet.dart
    ├── listing_quality/
    │   ├── listing_audit_page.dart
    │   └── ai_content_generator_page.dart  # Image picker -> Cloudinary -> Gemini output
    ├── inventory_pricing/
    │   ├── inventory_intelligence_page.dart
    │   └── pricing_comparison_page.dart
    ├── reviews_shipping/
    │   ├── reviews_intelligence_page.dart
    │   └── shipping_waybill_page.dart
    ├── daily_report/
    │   └── daily_ai_report_page.dart
    └── ai_assistant/
        └── assistant_chat_page.dart`;

export const MONOREPO_FOLDER_STRUCTURE = `ecompilot-ai/
├── apps/
│   ├── mobile_flutter/             # Cross-platform Flutter app (iOS, Android, Web)
│   │   ├── lib/
│   │   └── pubspec.yaml
│   └── api_node/                   # Node.js + Express TypeScript API & Workers
│       ├── src/
│       │   ├── config/             # env, supabase, cloudinary, gemini client
│       │   ├── middleware/         # supabaseAuth.ts, roleGuard.ts, rateLimit.ts
│       │   ├── routes/             # priority, marketplaces, listings, inventory, pricing, ai
│       │   ├── services/
│       │   │   ├── geminiService.ts
│       │   │   ├── priorityEngine.ts
│       │   │   ├── inventoryForecaster.ts
│       │   │   └── dailyReportCron.ts
│       │   └── workers/            # BullMQ queue consumers (05:30 sync, 06:00 brief)
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── connectors/                 # Modular Marketplace Adapter SDK
│       ├── src/
│       │   ├── base/MarketplaceAdapter.ts
│       │   ├── shopify/ShopifyAdapter.ts
│       │   ├── amazon/AmazonSellerAdapter.ts
│       │   ├── amazon/AmazonVendorAdapter.ts
│       │   ├── takealot/TakealotAdapter.ts
│       │   ├── mirakl/MakroAdapter.ts
│       │   ├── mirakl/LeroyMerlinAdapter.ts
│       │   └── couriers/InternetExpressTracker.ts
│       └── package.json
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql
└── railway.toml                    # Multi-service API + Worker deployment config`;

export const MVP_ROADMAP_PHASES = [
  {
    phase: 'Phase 1 · Weeks 1–3',
    title: 'Foundation, Auth & Modular Connector Core',
    deliverables: [
      'Supabase PostgreSQL schema, RLS policies, and multi-role auth (4 roles)',
      'Node.js Express API gateway on Railway with encrypted credential vault',
      'MarketplaceAdapter interface + Shopify GraphQL & Takealot Seller API v2 adapters',
      'Cloudinary signed upload pipeline for product and lifestyle imagery',
    ],
    exitCriteria: 'Users sign in, connect Shopify + Takealot, and view unified product catalog.',
  },
  {
    phase: 'Phase 2 · Weeks 4–6',
    title: 'Priority Engine, Inventory & Price Parity',
    deliverables: [
      'Rule + AI Priority Center scoring Critical / High / Medium / Low issues',
      'Amazon Seller Central SP-API + Makro & Leroy Merlin Mirakl adapters',
      'Inventory Days-of-Cover calculator & 14-day stockout alerting',
      'Cross-channel Price Mismatch & margin risk detector with parity sync',
    ],
    exitCriteria: 'Daily priority list surfaces suppressed listings, stockouts, and price gaps automatically.',
  },
  {
    phase: 'Phase 3 · Weeks 7–9',
    title: 'Gemini AI Content, Reviews & Shipping Intelligence',
    deliverables: [
      'AI Content Generator (multimodal Gemini image + specs -> channel titles, bullets, SEO)',
      'Listing Quality 9-point auditor (score 0–100 + concrete fix checklist)',
      'Reviews Intelligence clustering (top complaint frequency + packaging/product fixes)',
      'Shipping Intelligence courier-vs-marketplace reconciliation (Internet Express, TCG, RAM)',
    ],
    exitCriteria: 'Content and Operations teams resolve listing, review, and waybill anomalies in 1 click.',
  },
  {
    phase: 'Phase 4 · Weeks 10–12',
    title: 'Daily Morning Report, AI Assistant & Production Launch',
    deliverables: [
      'Automated 06:00 SAST Daily AI Report worker + email/push digest',
      'Conversational AI Assistant grounded in live store SQL state',
      'Amazon Vendor Central EDI / ASN integration + Flutter Web/iOS/Android polish',
      'Load testing, observability (Sentry + OpenTelemetry), and onboarding wizard',
    ],
    exitCriteria: 'Startup-ready SaaS open for paying beta merchants at R2,499–R7,999/mo.',
  },
];

export const COST_ESTIMATES = [
  {
    service: 'Railway (Express API + BullMQ Worker + Redis)',
    mvpMonthlyUsd: '$25',
    mvpMonthlyZar: 'R460',
    scaleMonthlyUsd: '$140',
    scaleMonthlyZar: 'R2,580',
    notes: '2 containers + managed Redis for hourly marketplace sync jobs',
  },
  {
    service: 'Supabase (PostgreSQL + Auth + RLS)',
    mvpMonthlyUsd: '$25',
    mvpMonthlyZar: 'R460',
    scaleMonthlyUsd: '$99',
    scaleMonthlyZar: 'R1,820',
    notes: 'Pro plan (8GB DB, daily backups, 100k MAU auth included)',
  },
  {
    service: 'Google Gemini API (gemini-4-hydrogen)',
    mvpMonthlyUsd: '$18',
    mvpMonthlyZar: 'R330',
    scaleMonthlyUsd: '$160',
    scaleMonthlyZar: 'R2,940',
    notes: 'Content gen, daily reports, review clustering, and live Q&A chat',
  },
  {
    service: 'Cloudinary (Product & Lifestyle Image CDN)',
    mvpMonthlyUsd: '$0',
    mvpMonthlyZar: 'R0',
    scaleMonthlyUsd: '$89',
    scaleMonthlyZar: 'R1,640',
    notes: 'Free tier covers 25 credits/mo; Plus plan for 50+ merchant catalogs',
  },
  {
    service: 'Monitoring & Transactional Email (Sentry + Resend)',
    mvpMonthlyUsd: '$0',
    mvpMonthlyZar: 'R0',
    scaleMonthlyUsd: '$46',
    scaleMonthlyZar: 'R850',
    notes: '06:00 SAST morning report emails + API error alerting',
  },
];

export const DEPLOYMENT_PLAN_STEPS = [
  {
    step: '01',
    title: 'Database & Auth Provisioning (Supabase)',
    detail:
      'Run supabase db push for 0001_initial_schema.sql, enable email/magic-link + OAuth providers, and configure Row Level Security policies per workspace_id.',
  },
  {
    step: '02',
    title: 'Backend & Worker Services (Railway)',
    detail:
      'Deploy apps/api_node as two Railway services from one repo: (1) web HTTP server exposing /api/v1/* on port 3000, and (2) worker running BullMQ cron schedules (15-min inventory/waybill sync, 05:30 priority rebuild, 06:00 Daily AI Report).',
  },
  {
    step: '03',
    title: 'Marketplace Secrets & Rate-Limit Resilience',
    detail:
      'Store Amazon SP-API LWA keys, Takealot Seller tokens, Shopify client secrets, and GEMINI_API_KEY in Railway Secrets. Wrap each adapter in token-bucket rate limiters with exponential backoff.',
  },
  {
    step: '04',
    title: 'Flutter Multi-Platform Release',
    detail:
      'Build Flutter Web (hosted on Cloudflare Pages/Railway) and iOS/Android binaries via Fastlane + Codemagic CI, pointing to the production Railway API domain over HTTPS.',
  },
];
