import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  DollarSign,
  FileText,
  Link2,
  MessageSquare,
  PenLine,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { ROLE_META } from '../data/initialStoreData';
import { CompanyWorkspace, NavSection, UserRole } from '../types/ecom';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  companies: CompanyWorkspace[];
  activeCompanyId: string;
  onChangeCompany: (companyId: string) => void;
  dataMode: 'demo' | 'clean';
  isLiveMode: boolean;
  onUseDemoData: () => void;
  onClearDemoData: () => void;
  openTaskCount: number;
  criticalCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}> = [
  {
    label: 'Daily Command',
    items: [
      { id: 'priority', label: 'AI Task Centre', icon: AlertTriangle },
      { id: 'assistant', label: 'AI Business Analyst', icon: MessageSquare },
      { id: 'reports', label: 'Reports & Briefings', icon: FileText },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'inventory', label: 'Inventory Command', icon: Boxes },
      { id: 'purchasing', label: 'Purchasing & Suppliers', icon: ClipboardList },
      { id: 'orders_reviews', label: 'Order Exceptions', icon: Truck },
    ],
  },
  {
    label: 'Growth & Channels',
    items: [
      { id: 'marketplaces', label: 'Marketplaces', icon: Store },
      { id: 'listings', label: 'AI Listing Optimizer', icon: PenLine },
      { id: 'pricing', label: 'AI Pricing Engine', icon: DollarSign },
      { id: 'connect_channels', label: 'Connect Channels', icon: Link2 },
    ],
  },
  {
    label: 'Organization',
    items: [{ id: 'workspace', label: 'Workspace & Plans', icon: Building2 }],
  },
];

const ROLES: UserRole[] = [
  'owner',
  'ecommerce_manager',
  'inventory_manager',
  'content_manager',
  'marketing_manager',
  'analyst',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  activeRole,
  onChangeRole,
  companies,
  activeCompanyId,
  onChangeCompany,
  dataMode,
  isLiveMode,
  onUseDemoData,
  onClearDemoData,
  openTaskCount,
  criticalCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  const content = (
    <aside className="flex h-full w-64 flex-col border-r border-white/[0.08] bg-[#0E1118]">
      <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4">
        <button
          type="button"
          onClick={() => {
            onSelectSection('priority');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            EcomPilot
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 border-b border-white/[0.08] px-4 py-3">
        <div>
          <label
            htmlFor="company-selector"
            className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
          >
            Company Workspace
          </label>
          <select
            id="company-selector"
            value={activeCompanyId}
            onChange={(e) => onChangeCompany(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-[#161B26] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 focus:border-blue-500 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#121620] text-slate-100">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="role-selector"
            className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500"
          >
            Active Role Lens
          </label>
          <select
            id="role-selector"
            value={activeRole}
            onChange={(e) => onChangeRole(e.target.value as UserRole)}
            className="w-full rounded-md border border-white/[0.08] bg-[#161B26] px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 focus:border-blue-500 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="bg-[#121620] text-slate-100">
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Workspace Data</span>
            <span className="text-slate-300">
              {isLiveMode ? 'Live Sync' : dataMode === 'demo' ? 'Demo' : 'Clean'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-white/[0.06] bg-[#0B0D12] p-0.5">
            <button
              type="button"
              onClick={onUseDemoData}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                dataMode === 'demo' && !isLiveMode
                  ? 'bg-[#1E2536] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Use Demo
            </button>
            <button
              type="button"
              onClick={onClearDemoData}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                dataMode === 'clean' || isLiveMode
                  ? 'bg-[#1E2536] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remove Demo
            </button>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label="Primary navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSection(item.id);
                        onCloseMobile();
                      }}
                      className={`flex min-h-[38px] w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-300'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-blue-400' : 'text-slate-500'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.id === 'priority' && openTaskCount > 0 && (
                        <span
                          className={`ml-2 text-xs font-semibold tabular-nums ${
                            criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {openTaskCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">Shepherd</p>
          <p className="truncate text-xs text-slate-400">
            Admin · {activeCompany?.currency || 'ZAR'} Workspace
          </p>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block lg:shrink-0">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};

interface MobileBottomNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  openTaskCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelectSection,
  openTaskCount,
}) => {
  const tabs: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'priority', label: 'Tasks', icon: AlertTriangle, badge: openTaskCount },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'orders_reviews', label: 'Orders', icon: Truck },
    { id: 'assistant', label: 'Analyst', icon: MessageSquare },
  ];

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-4 border-t border-white/[0.08] bg-[#0E1118]/95 backdrop-blur-md lg:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeSection === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectSection(tab.id)}
            className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute top-1.5 right-[26%] font-mono text-[10px] font-bold text-rose-400 tabular-nums">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
