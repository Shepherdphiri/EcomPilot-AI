import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  API_ENDPOINTS_SPEC,
  COST_ESTIMATES,
  DEPLOYMENT_PLAN_STEPS,
  FLUTTER_PAGE_STRUCTURE,
  MONOREPO_FOLDER_STRUCTURE,
  MVP_ROADMAP_PHASES,
  SUPABASE_POSTGRES_SCHEMA,
} from '../data/architectureDocs';

import { PRODUCTION_MODULES } from '../data/productionSaasDocs';

type BlueprintTab =
  | 'architecture'
  | 'production_18'
  | 'database'
  | 'api'
  | 'flutter_folders'
  | 'wireframes'
  | 'roadmap'
  | 'costs_deploy';

const TABS: Array<{ id: BlueprintTab; label: string }> = [
  { id: 'architecture', label: 'Architecture Diagram' },
  { id: 'production_18', label: 'Production SaaS (18)' },
  { id: 'database', label: 'Database Schema' },
  { id: 'api', label: 'API Structure' },
  { id: 'flutter_folders', label: 'Flutter & Folders' },
  { id: 'wireframes', label: 'UI Wireframes' },
  { id: 'roadmap', label: 'MVP Roadmap' },
  { id: 'costs_deploy', label: 'Costs & Deployment' },
];

export const SystemBlueprintView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BlueprintTab>('architecture');
  const [wireframeScreen, setWireframeScreen] = useState<
    'priority' | 'content' | 'inventory' | 'assistant'
  >('priority');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-medium text-blue-700">
              Startup Technical Specification
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-slate-900">
              EcomPilot AI — System Architecture & Implementation Blueprint
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Modular architecture for Flutter, Node.js Express, Supabase PostgreSQL/Auth, Cloudinary, Google Gemini API, and Railway hosting.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'architecture' && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Modular Multi-Marketplace System Architecture
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Decoupled MarketplaceAdapter interface enables new channels (e.g., Woolworths, Bash, eBay) without changing core priority or AI engines.
          </p>

          <div className="mt-5 overflow-x-auto">
            <svg
              viewBox="0 0 980 460"
              className="w-full min-w-[780px] rounded-lg border border-slate-200 bg-slate-50"
              role="img"
              aria-label="EcomPilot AI System Architecture Diagram"
            >
              {/* Layer 1: Client Apps */}
              <rect x="30" y="30" width="210" height="120" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
              <text x="50" y="58" fill="#1D4ED8" fontSize="11" fontWeight="600">CLIENT LAYER</text>
              <text x="50" y="80" fill="#0F172A" fontSize="14" fontWeight="700">Flutter Application</text>
              <text x="50" y="100" fill="#475569" fontSize="11">iOS · Android · Web</text>
              <text x="50" y="118" fill="#475569" fontSize="11">Riverpod + GoRouter</text>
              <text x="50" y="136" fill="#475569" fontSize="11">Role-Aware Views (4 Roles)</text>

              {/* Layer 2: Auth & Media */}
              <rect x="30" y="180" width="210" height="110" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
              <text x="50" y="206" fill="#1D4ED8" fontSize="11" fontWeight="600">IDENTITY & MEDIA</text>
              <text x="50" y="228" fill="#0F172A" fontSize="14" fontWeight="700">Supabase Auth + Cloudinary</text>
              <text x="50" y="248" fill="#475569" fontSize="11">JWT Session + Workspace RBAC</text>
              <text x="50" y="266" fill="#475569" fontSize="11">Signed Product Image CDN</text>

              {/* Layer 3: Express API Gateway & Workers (Railway) */}
              <rect x="310" y="30" width="320" height="260" rx="8" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="1.5" />
              <text x="330" y="58" fill="#1D4ED8" fontSize="11" fontWeight="600">RAILWAY CORE SERVICES</text>
              <text x="330" y="80" fill="#0F172A" fontSize="15" fontWeight="700">Node.js Express API + BullMQ</text>

              <rect x="330" y="98" width="280" height="44" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
              <text x="344" y="117" fill="#0F172A" fontSize="12" fontWeight="600">Priority & Anomaly Engine</text>
              <text x="344" y="133" fill="#64748B" fontSize="10.5">Suppressed, Stockout, Buy Box, Price Parity</text>

              <rect x="330" y="152" width="280" height="44" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
              <text x="344" y="171" fill="#0F172A" fontSize="12" fontWeight="600">AI Orchestration Layer</text>
              <text x="344" y="187" fill="#64748B" fontSize="10.5">Content Gen, Review Clustering, Daily 06:00 Brief</text>

              <rect x="330" y="206" width="280" height="64" rx="6" fill="#F8FAFC" stroke="#E2E8F0" />
              <text x="344" y="225" fill="#0F172A" fontSize="12" fontWeight="600">Modular Connector SDK</text>
              <text x="344" y="241" fill="#64748B" fontSize="10.5">MarketplaceAdapter: syncCatalog(), fetchOrders(),</text>
              <text x="344" y="256" fill="#64748B" fontSize="10.5">updatePrice(), pushWaybill(), auditAttributes()</text>

              {/* Layer 4: Supabase DB & Gemini AI */}
              <rect x="310" y="325" width="320" height="105" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
              <text x="330" y="351" fill="#1D4ED8" fontSize="11" fontWeight="600">PERSISTENCE & INTELLIGENCE</text>
              <text x="330" y="373" fill="#0F172A" fontSize="14" fontWeight="700">Supabase PostgreSQL + Google Gemini API</text>
              <text x="330" y="393" fill="#475569" fontSize="11">PostgreSQL + RLS Policies + Redis Sync Queue</text>
              <text x="330" y="411" fill="#475569" fontSize="11">Gemini Multimodal Content, Chat & Sentiment API</text>

              {/* Layer 5: External Marketplaces & Couriers */}
              <rect x="700" y="30" width="250" height="270" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
              <text x="720" y="58" fill="#1D4ED8" fontSize="11" fontWeight="600">MARKETPLACE ADAPTERS</text>
              <text x="720" y="84" fill="#0F172A" fontSize="12.5" fontWeight="600">Shopify (Admin GraphQL)</text>
              <text x="720" y="114" fill="#0F172A" fontSize="12.5" fontWeight="600">Amazon Seller Central (SP-API)</text>
              <text x="720" y="144" fill="#0F172A" fontSize="12.5" fontWeight="600">Amazon Vendor Central (EDI)</text>
              <text x="720" y="174" fill="#0F172A" fontSize="12.5" fontWeight="600">Takealot Marketplace (API v2)</text>
              <text x="720" y="204" fill="#0F172A" fontSize="12.5" fontWeight="600">Makro Marketplace (Mirakl)</text>
              <text x="720" y="234" fill="#0F172A" fontSize="12.5" fontWeight="600">Leroy Merlin (Mirakl)</text>
              <text x="720" y="274" fill="#475569" fontSize="11">+ Pluggable Future Channels</text>

              <rect x="700" y="325" width="250" height="105" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
              <text x="720" y="351" fill="#1D4ED8" fontSize="11" fontWeight="600">COURIER TELEMETRY</text>
              <text x="720" y="375" fill="#0F172A" fontSize="13" fontWeight="600">Internet Express · TCG · RAM</text>
              <text x="720" y="396" fill="#475569" fontSize="11">Waybill Webhooks & POD Sync</text>
              <text x="720" y="414" fill="#475569" fontSize="11">Status Mismatch Detection</text>

              {/* Arrows */}
              <line x1="240" y1="90" x2="310" y2="90" stroke="#64748B" strokeWidth="1.5" />
              <line x1="240" y1="235" x2="310" y2="235" stroke="#64748B" strokeWidth="1.5" />
              <line x1="470" y1="290" x2="470" y2="325" stroke="#64748B" strokeWidth="1.5" />
              <line x1="630" y1="150" x2="700" y2="150" stroke="#64748B" strokeWidth="1.5" />
              <line x1="630" y1="375" x2="700" y2="375" stroke="#64748B" strokeWidth="1.5" />
            </svg>
          </div>
        </section>
      )}

      {activeTab === 'production_18' && (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Production SaaS Readiness Modules (All 18 Components)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Every missing production component is implemented in the /mvp monorepo: ERD, SQL v2, RLS policies, Auth flow, Stripe billing, Audit logs, Notifications, Resend Email, WhatsApp alerts, Profitability, Competitor tracker, Recommendation engine, Priority scoring, OpenAPI 3.1, Vitest, GitHub Actions, Sentry, and Railway deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {PRODUCTION_MODULES.map((mod) => (
              <article
                key={mod.id}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {mod.number}. {mod.title}
                  </h3>
                  <span className="text-xs text-blue-700">{mod.filePath}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {mod.summary}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
                  {mod.snippet}
                </pre>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'database' && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Supabase PostgreSQL Schema (Production DDL)
              </h2>
              <p className="text-xs text-slate-500">
                Includes multi-tenant workspaces, 4-role RBAC, modular marketplace_connections, computed days_of_cover, and Row Level Security.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('sql', SUPABASE_POSTGRES_SCHEMA)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              {copiedKey === 'sql' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied SQL
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy SQL
                </>
              )}
            </button>
          </div>

          <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {SUPABASE_POSTGRES_SCHEMA}
          </pre>
        </section>
      )}

      {activeTab === 'api' && (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Node.js Express REST API Structure
            </h2>
            <p className="text-xs text-slate-500">
              Versioned /api/v1 endpoints secured with Supabase JWT validation and workspace role guards.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Method</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Auth / Guard</th>
                  <th className="px-4 py-3">Responsibility</th>
                  <th className="px-6 py-3">Response Shape</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {API_ENDPOINTS_SPEC.map((ep) => (
                  <tr key={ep.path} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-blue-700">
                      {ep.method}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-900">
                      {ep.path}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{ep.auth}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{ep.purpose}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {ep.response}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'flutter_folders' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Flutter App Page Structure
              </h2>
              <button
                type="button"
                onClick={() => handleCopy('flutter', FLUTTER_PAGE_STRUCTURE)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"
              >
                {copiedKey === 'flutter' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {FLUTTER_PAGE_STRUCTURE}
            </pre>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Full SaaS Monorepo Folder Structure
              </h2>
              <button
                type="button"
                onClick={() => handleCopy('mono', MONOREPO_FOLDER_STRUCTURE)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"
              >
                {copiedKey === 'mono' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {MONOREPO_FOLDER_STRUCTURE}
            </pre>
          </section>
        </div>
      )}

      {activeTab === 'wireframes' && (
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Complete UI Wireframe Blueprints (Desktop & Flutter Mobile)
              </h2>
              <p className="text-xs text-slate-500">
                Inspect structural layout contracts for each primary EcomPilot AI workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
              {(
                [
                  { id: 'priority', label: 'Priority Center' },
                  { id: 'content', label: 'AI Content Gen' },
                  { id: 'inventory', label: 'Inventory & Price' },
                  { id: 'assistant', label: 'Report & Chat' },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWireframeScreen(w.id)}
                  className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    wireframeScreen === w.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Desktop Wireframe */}
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 lg:col-span-8">
              <p className="mb-3 font-mono text-xs font-semibold text-slate-600">
                DESKTOP SHELL (1440px · Sidebar 256px + Main Canvas)
              </p>
              <div className="grid grid-cols-12 gap-3 rounded border border-slate-300 bg-white p-3">
                <div className="col-span-3 space-y-2 border-r border-slate-200 pr-3">
                  <div className="h-6 rounded bg-slate-200 px-2 py-1 font-mono text-[10px] text-slate-700">
                    EcomPilot AI
                  </div>
                  <div className="h-7 rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600">
                    Role Selector
                  </div>
                  <div className="space-y-1 pt-2 font-mono text-[10px] text-slate-500">
                    <div className="rounded bg-blue-50 px-2 py-1 text-blue-800">Priority Center</div>
                    <div className="px-2 py-1">Marketplace Health</div>
                    <div className="px-2 py-1">Listing & Content</div>
                    <div className="px-2 py-1">Inventory & Pricing</div>
                    <div className="px-2 py-1">Reviews & Shipping</div>
                    <div className="px-2 py-1">Daily AI Report</div>
                    <div className="px-2 py-1">AI Assistant</div>
                  </div>
                </div>

                <div className="col-span-9 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-mono text-[10px] text-slate-600">
                    <span>Breadcrumb / Search SKUs</span>
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-white">Primary CTA</span>
                  </div>

                  {wireframeScreen === 'priority' && (
                    <>
                      <div className="rounded border border-slate-200 p-3">
                        <div className="font-mono text-[11px] font-bold text-slate-900">
                          What requires my attention today?
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2 font-mono text-[10px]">
                          <div className="rounded bg-red-50 p-1.5 text-red-700">Critical: 3</div>
                          <div className="rounded bg-amber-50 p-1.5 text-amber-700">High: 3</div>
                          <div className="rounded bg-slate-100 p-1.5">Risk: R14,200</div>
                          <div className="rounded bg-blue-50 p-1.5 text-blue-700">Role Tasks: 5</div>
                        </div>
                      </div>
                      <div className="space-y-1.5 rounded border border-slate-200 p-3 font-mono text-[10px] text-slate-700">
                        <div>[CRITICAL] Amazon listing suppressed · SKU ES-PRO-220 · [Fix]</div>
                        <div>[CRITICAL] Stockout in 3 days · SKU AP-FRY-600 · [Review]</div>
                        <div>[HIGH] Price mismatch Shopify R499 vs Makro R449 · [Sync]</div>
                      </div>
                    </>
                  )}

                  {wireframeScreen === 'content' && (
                    <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                      <div className="space-y-1.5 rounded border border-slate-200 p-3">
                        <div className="font-bold">Listing Quality Audit (88/100)</div>
                        <div>Title / Bullets / Lifestyle / Keywords</div>
                        <div className="text-amber-700">Fix: Add 2 lifestyle images</div>
                      </div>
                      <div className="space-y-1.5 rounded border border-slate-200 p-3">
                        <div className="font-bold">AI Content Generator</div>
                        <div>[Image Dropzone] + [Dimensions] + [Specs]</div>
                        <div className="rounded bg-blue-700 px-2 py-1 text-center text-white">
                          Generate Amazon / Takealot / Shopify Copy
                        </div>
                      </div>
                    </div>
                  )}

                  {wireframeScreen === 'inventory' && (
                    <div className="space-y-2 rounded border border-slate-200 p-3 font-mono text-[10px]">
                      <div className="font-bold">Stock Cover & Price Parity Matrix</div>
                      <div>SKU AP-FRY-600 | Stock: 42 | Vel: 14/d | Cover: 3d (CRITICAL)</div>
                      <div>SKU ABC123 | Shopify R499 | Makro R449 | Diff: 10% [Sync]</div>
                    </div>
                  )}

                  {wireframeScreen === 'assistant' && (
                    <div className="space-y-2 rounded border border-slate-200 p-3 font-mono text-[10px]">
                      <div className="font-bold">Daily Report (R82,300 · 54 Orders) + AI Chat</div>
                      <div className="rounded bg-slate-100 p-2">Prompt: What needs attention today?</div>
                      <div className="rounded border border-slate-200 p-2">
                        Gemini Response: Focus on ES-PRO-220 suppression (R4,800/d) & AP-FRY-600 3-day stockout...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Flutter Wireframe */}
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 lg:col-span-4">
              <p className="mb-3 font-mono text-xs font-semibold text-slate-600">
                FLUTTER MOBILE (390px · Bottom Nav)
              </p>
              <div className="mx-auto max-w-[240px] space-y-2.5 rounded-xl border-2 border-slate-400 bg-white p-3 font-mono text-[10px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 font-bold">
                  <span>EcomPilot AI</span>
                  <span>Exec Role ▾</span>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <div className="font-bold text-slate-900">Attention Today</div>
                  <div className="mt-1 text-red-700">3 Critical · R14,200 Risk</div>
                </div>
                <div className="space-y-1.5">
                  <div className="rounded border border-slate-200 p-2">
                    Amazon Listing Suppressed [Fix →]
                  </div>
                  <div className="rounded border border-slate-200 p-2">
                    Stockout in 3d (AP-FRY-600)
                  </div>
                </div>
                <div className="grid grid-cols-4 border-t border-slate-200 pt-2 text-center text-[9px] text-slate-600">
                  <span className="font-bold text-blue-700">Today</span>
                  <span>Channels</span>
                  <span>Stock</span>
                  <span>AI Chat</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'roadmap' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MVP_ROADMAP_PHASES.map((phase) => (
            <section
              key={phase.phase}
              className="rounded-lg border border-slate-200 bg-white p-6"
            >
              <p className="font-mono text-xs font-semibold text-blue-700">
                {phase.phase}
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {phase.title}
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-slate-700">
                {phase.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">Exit Criteria</p>
                <p className="mt-0.5 text-xs font-medium text-slate-900">
                  {phase.exitCriteria}
                </p>
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === 'costs_deploy' && (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Monthly Infrastructure Cost Estimates (MVP vs Scale)
              </h2>
              <p className="text-xs text-slate-500">
                Estimated burn for Railway, Supabase, Google Gemini API, Cloudinary, and observability.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">Platform Service</th>
                    <th className="px-4 py-3 text-right">MVP (USD/mo)</th>
                    <th className="px-4 py-3 text-right">MVP (ZAR/mo)</th>
                    <th className="px-4 py-3 text-right">Scale (USD/mo)</th>
                    <th className="px-4 py-3 text-right">Scale (ZAR/mo)</th>
                    <th className="px-6 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {COST_ESTIMATES.map((row) => (
                    <tr key={row.service}>
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {row.service}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                        {row.mvpMonthlyUsd}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {row.mvpMonthlyZar}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                        {row.scaleMonthlyUsd}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {row.scaleMonthlyZar}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">{row.notes}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-6 py-3.5 text-slate-900">Total Estimated Monthly</td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                      $68
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                      R1,250
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                      $534
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                      R9,830
                    </td>
                    <td className="px-6 py-3.5 text-xs font-normal text-slate-600">
                      ~85% gross margin at R2,999/merchant SaaS pricing
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Production Deployment Plan
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {DEPLOYMENT_PLAN_STEPS.map((st) => (
                <div
                  key={st.step}
                  className="rounded-md border border-slate-200 bg-slate-50/60 p-4"
                >
                  <p className="font-mono text-xs font-bold text-blue-700">
                    {st.step}. {st.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {st.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
