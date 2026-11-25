import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  FileText,
  Link2,
  MessageSquare,
  MessageSquareWarning,
  PenLine,
  Store,
  X,
} from 'lucide-react';
import { ROLE_META } from '../data/initialStoreData';
import { NavSection, UserRole } from '../types/ecom';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  dataMode: 'demo' | 'clean';
  isLiveMode: boolean;
  onUseDemoData: () => void;
  onClearDemoData: () => void;
  openTaskCount: number;
  criticalCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'priority', label: 'Priority Center', icon: AlertTriangle },
  { id: 'marketplaces', label: 'Marketplace Health', icon: Store },
  { id: 'connect_channels', label: 'Connect Channels', icon: Link2 },
  { id: 'listings', label: 'Listing & Content', icon: PenLine },
  { id: 'inventory_pricing', label: 'Inventory & Pricing', icon: Boxes },
  { id: 'reviews_shipping', label: 'Reviews & Shipping', icon: MessageSquareWarning },
  { id: 'daily_report', label: 'Morning Report', icon: FileText },
  { id: 'assistant', label: 'Operations Chat', icon: MessageSquare },
];

const ROLES: UserRole[] = [
  'ecommerce_manager',
  'content_manager',
  'inventory_manager',
  'executive',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  activeRole,
  onChangeRole,
  dataMode,
  isLiveMode,
  onUseDemoData,
  onClearDemoData,
  openTaskCount,
  criticalCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
        <button
          type="button"
          onClick={() => {
            onSelectSection('priority');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700 text-white">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            EcomPilot
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-slate-200 px-4 py-3.5">
        <label
          htmlFor="role-selector"
          className="mb-1.5 block text-xs font-medium text-slate-500"
        >
          Active Role View
        </label>
        <select
          id="role-selector"
          value={activeRole}
          onChange={(e) => onChangeRole(e.target.value as UserRole)}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 focus:border-blue-700 focus:bg-white focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
            </option>
          ))}
        </select>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Workspace Data</span>
            <span className="text-slate-700">
              {isLiveMode ? 'Live Sync' : dataMode === 'demo' ? 'Demo' : 'Empty'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
            <button
              type="button"
              onClick={onUseDemoData}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                dataMode === 'demo' && !isLiveMode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Use Demo
            </button>
            <button
              type="button"
              onClick={onClearDemoData}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                dataMode === 'clean' || isLiveMode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Remove Demo
            </button>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Primary navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
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
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'priority' && openTaskCount > 0 && (
                    <span
                      className={`ml-2 font-mono text-xs tabular-nums ${
                        criticalCount > 0 ? 'font-semibold text-red-700' : 'text-slate-500'
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
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Shepherd</p>
          <p className="truncate text-xs text-slate-500">Admin · ZAR Workspace</p>
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
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
