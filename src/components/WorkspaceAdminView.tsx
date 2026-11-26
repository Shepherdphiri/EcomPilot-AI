import React, { useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { ROLE_META, SUBSCRIPTION_PLANS } from '../data/initialStoreData';
import {
  ActivityLogEntry,
  CompanyWorkspace,
  PlanTier,
  TeamMemberRecord,
  UserRole,
} from '../types/ecom';
import { formatZar } from '../utils/formatters';

interface WorkspaceAdminViewProps {
  companies: CompanyWorkspace[];
  activeCompanyId: string;
  onSelectCompany: (id: string) => void;
  onCreateCompany: (name: string, region: string) => void;
  onChangePlan: (plan: PlanTier) => void;
  teamMembers: TeamMemberRecord[];
  onInviteMember: (name: string, email: string, role: UserRole) => void;
  onUpdateMemberRole: (memberId: string, role: UserRole) => void;
  activityLogs: ActivityLogEntry[];
}

const ALL_ROLES: UserRole[] = [
  'owner',
  'ecommerce_manager',
  'inventory_manager',
  'content_manager',
  'marketing_manager',
  'analyst',
];

export const WorkspaceAdminView: React.FC<WorkspaceAdminViewProps> = ({
  companies,
  activeCompanyId,
  onSelectCompany,
  onCreateCompany,
  onChangePlan,
  teamMembers,
  onInviteMember,
  onUpdateMemberRole,
  activityLogs,
}) => {
  const [tab, setTab] = useState<'team' | 'companies' | 'billing' | 'activity'>('team');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('ecommerce_manager');

  const [newCoName, setNewCoName] = useState('');
  const [newCoRegion, setNewCoRegion] = useState('Johannesburg, ZA');

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    onInviteMember(inviteName.trim(), inviteEmail.trim(), inviteRole);
    setInviteName('');
    setInviteEmail('');
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoName.trim()) return;
    onCreateCompany(newCoName.trim(), newCoRegion.trim() || 'South Africa');
    setNewCoName('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-blue-400">
              Multi-Tenant Organization · {activeCompany?.name}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-slate-100">
              Merchant Workspace, RBAC &amp; Subscriptions
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage multiple merchant entities, 6 operational role permissions, immutable audit trails, and subscription tiers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0B0D12] p-1 self-start sm:self-auto">
            {(
              [
                { id: 'team', label: 'Team & Roles', icon: Users },
                { id: 'companies', label: 'Companies', icon: Building2 },
                { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
                { id: 'activity', label: 'Activity Logs', icon: Activity },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === item.id
                      ? 'bg-[#1E2536] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {tab === 'team' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620] xl:col-span-8">
            <div className="border-b border-white/[0.08] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-100">
                Team Members &amp; Role Permissions
              </h2>
              <p className="text-xs text-slate-400">
                Assign least-privilege operational roles per merchant workspace
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0E1118] text-xs font-medium text-slate-400">
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Key Permissions</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-100">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={m.role}
                          onChange={(e) =>
                            onUpdateMemberRole(m.id, e.target.value as UserRole)
                          }
                          className="rounded-md border border-white/[0.1] bg-[#0B0D12] px-2.5 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r} className="bg-[#121620]">
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-xs px-4 py-3.5 text-xs text-slate-400">
                        {ROLE_META[m.role].permissions.slice(0, 3).join(' · ')}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs">
                        <span
                          className={
                            m.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                          }
                        >
                          {m.lastActive}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-4 self-start">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100">Invite Team Member</h2>
            </div>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  placeholder="e.g. Sipho Dlamini"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Work Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="sipho@company.co.za"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Operational Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-[#121620]">
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="min-h-[40px] w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Send Workspace Invite
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === 'companies' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-8">
            {companies.map((co) => {
              const isCurrent = co.id === activeCompanyId;
              return (
                <div
                  key={co.id}
                  className={`rounded-xl border p-5 ${
                    isCurrent
                      ? 'border-blue-500/60 bg-blue-600/10'
                      : 'border-white/[0.08] bg-[#121620]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{co.name}</h3>
                      <p className="text-xs text-slate-400">
                        {co.region} · {co.currency}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase text-blue-400">
                      {co.plan}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3 text-xs">
                    <div>
                      <p className="text-slate-500">SKUs</p>
                      <p className="font-semibold text-slate-100 tabular-nums">
                        {co.activeSkusCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Channels</p>
                      <p className="font-semibold text-slate-100 tabular-nums">
                        {co.connectedChannelsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Account</p>
                      <p className="font-semibold text-emerald-400">
                        {co.trialDaysLeft ? `${co.trialDaysLeft}d trial` : 'Active'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(co.id)}
                      disabled={isCurrent}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${
                        isCurrent
                          ? 'border border-blue-500/30 bg-blue-600/20 text-blue-300'
                          : 'bg-[#171C28] text-slate-200 hover:bg-[#1E2536]'
                      }`}
                    >
                      {isCurrent ? 'Active Workspace' : 'Switch to Workspace'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-4 self-start">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Provision New Merchant Company
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Create an isolated multi-tenant workspace with a 14-day trial.
            </p>
            <form onSubmit={handleCreateCompanySubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCoName}
                  onChange={(e) => setNewCoName(e.target.value)}
                  required
                  placeholder="e.g. Karoo Homeware Retail"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Primary Region
                </label>
                <input
                  type="text"
                  value={newCoRegion}
                  onChange={(e) => setNewCoRegion(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="min-h-[40px] w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Create Trial Workspace
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === 'billing' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = activeCompany?.plan === plan.id;
            return (
              <section
                key={plan.id}
                className={`flex flex-col justify-between rounded-xl border p-5 ${
                  isCurrent
                    ? 'border-blue-500/60 bg-blue-600/10'
                    : 'border-white/[0.08] bg-[#121620]'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-base font-bold text-slate-100">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-blue-400">Current</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{plan.audience}</p>
                  <p className="mt-4 text-2xl font-bold text-slate-100 tabular-nums">
                    {formatZar(plan.priceZar)}
                    <span className="text-xs font-normal text-slate-400"> / mo</span>
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    (${plan.priceUsd}/mo USD equivalent)
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-white/[0.08] pt-3 text-xs text-slate-300 tabular-nums">
                    <p>Up to {plan.maxChannels} channels</p>
                    <p>Up to {plan.maxSkus.toLocaleString('en-ZA')} active SKUs</p>
                    <p>Up to {plan.maxSeats} team seats</p>
                    <p className="text-blue-300">{plan.aiQuota}</p>
                  </div>

                  <ul className="mt-4 space-y-1.5 border-t border-white/[0.08] pt-3 text-xs text-slate-400">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onChangePlan(plan.id)}
                  disabled={isCurrent}
                  className={`mt-5 min-h-[38px] w-full rounded-lg px-4 py-2 text-xs font-semibold ${
                    isCurrent
                      ? 'border border-blue-500/30 bg-blue-600/20 text-blue-300'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isCurrent ? 'Active Plan' : `Switch to ${plan.name}`}
                </button>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'activity' && (
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121620]">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Immutable Operational Activity Log
            </h2>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {activityLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-100">{log.actor}</span>{' '}
                  <span className="text-slate-400">({ROLE_META[log.role].label})</span>{' '}
                  <span className="text-slate-300">— {log.action}</span>
                  <p className="text-xs text-slate-500">{log.target}</p>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{log.timestamp}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
