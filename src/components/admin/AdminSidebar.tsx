'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Store,
  Compass,
  FileCode,
  ExternalLink,
  LogOut,
  Volume2,
  VolumeX,
  Building2,
  ShieldCheck,
  ChevronDown,
  Bike,
  TrendingUp,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { INITIAL_RIDERS } from '@/lib/mockData';

export type AdminViewTab = 'overview' | 'orders' | 'revenue' | 'riders' | 'hubs' | 'radar' | 'schema';
export type AdminRole = 'SUPER_ADMIN' | 'HUB_MANAGER';

interface AdminSidebarProps {
  currentTab: AdminViewTab;
  onTabChange: (tab: AdminViewTab) => void;
  selectedHubFilter: string; // 'ALL' or outletId
  onHubFilterChange: (hubId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
  activeOrdersCount: number;
  adminRole: AdminRole;
  onRoleChange: (role: AdminRole) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  currentTab,
  onTabChange,
  selectedHubFilter,
  onHubFilterChange,
  soundEnabled,
  onToggleSound,
  onLogout,
  activeOrdersCount,
  adminRole,
  onRoleChange,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const { outlets, currentOutlet, riders, orders } = useNiteOwlStore();
  const fleetList = riders?.length ? riders : INITIAL_RIDERS;
  const onDutyCount = fleetList.filter((r) => r.status !== 'OFF_DUTY').length;

  const relevantOrders =
    selectedHubFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.outletId === selectedHubFilter);
  const totalRev = relevantOrders.reduce((sum, o) => sum + o.total, 0);

  const navItems = [
    {
      id: 'overview' as AdminViewTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders' as AdminViewTab,
      label: 'Live Orders',
      icon: Package,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
    },
    {
      id: 'revenue' as AdminViewTab,
      label: 'Revenue & Earnings',
      icon: TrendingUp,
      badge: `₹${totalRev}`,
    },
    {
      id: 'riders' as AdminViewTab,
      label: 'Riders & Fleet',
      icon: Bike,
      badge: `${onDutyCount} On-Duty`,
    },
    {
      id: 'hubs' as AdminViewTab,
      label: 'Hubs & Kitchens',
      icon: Store,
      badge: `${outlets.filter((o) => o.isStoreOpen).length}/${outlets.length}`,
    },
    {
      id: 'radar' as AdminViewTab,
      label: 'Concentric Radar',
      icon: Compass,
      badge: null,
    },
    {
      id: 'schema' as AdminViewTab,
      label: 'System Schemas',
      icon: FileCode,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#111413] border-r border-[#1c211e] flex flex-col justify-between select-none z-50 transition-transform duration-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding & Hub Scope Selector */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-[#75cf5e] text-[#0c0e0d] font-black text-lg flex items-center justify-center shadow-md shadow-[#75cf5e]/20 shrink-0">
              🦉
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight text-[#e5f4eb] truncate">
                {adminRole === 'SUPER_ADMIN' ? 'NiteOwl Central' : 'NiteOwl Hub Ops'}
              </h1>
              <p className="text-[10px] text-[#75cf5e] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {adminRole === 'SUPER_ADMIN' ? 'Super Admin (All Hubs)' : 'Hub Manager Scoped'}
                </span>
              </p>
            </div>
          </div>

          {/* Role Persona Switcher (Allows testing Hub Manager vs Super Admin behavior) */}
          <div className="bg-[#0c0e0d] p-1.5 rounded-xl border border-[#1c211e]">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#88998f] px-1 mb-1">
              Active Persona
            </div>
            <div className="grid grid-cols-2 gap-1 bg-[#151917] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  onRoleChange('SUPER_ADMIN');
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  adminRole === 'SUPER_ADMIN'
                    ? 'bg-[#75cf5e] text-[#0c0e0d] shadow-sm'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  onRoleChange('HUB_MANAGER');
                  // Hub manager is locked to current outlet
                  onHubFilterChange(currentOutlet.id || outlets[0].id);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  adminRole === 'HUB_MANAGER'
                    ? 'bg-[#75cf5e] text-[#0c0e0d] shadow-sm'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                Hub Manager
              </button>
            </div>
          </div>

          {/* Hub Scope Switcher */}
          <div className="bg-[#0c0e0d] p-2.5 rounded-xl border border-[#1c211e] space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#88998f] block px-1 flex items-center justify-between">
              <span>Hub Scope</span>
              <span className="text-[9px] text-[#75cf5e] font-mono">
                {adminRole === 'SUPER_ADMIN'
                  ? selectedHubFilter === 'ALL'
                    ? 'All Hubs'
                    : '1 Hub Scoped'
                  : 'Assigned Hub Only'}
              </span>
            </label>

            {adminRole === 'SUPER_ADMIN' ? (
              <div className="relative">
                <select
                  value={selectedHubFilter}
                  onChange={(e) => onHubFilterChange(e.target.value)}
                  className="w-full bg-[#151917] hover:bg-[#1a201c] border border-[#239a4e]/40 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#e5f4eb] focus:outline-none focus:border-[#75cf5e] cursor-pointer transition-colors appearance-none pr-7"
                >
                  <option value="ALL">🌐 All Hubs (Central Admin)</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      📍 {outlet.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            ) : (
              <div className="bg-[#151917] border border-[#239a4e]/30 rounded-lg px-2.5 py-1.5 text-xs text-[#e5f4eb] flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-[#75cf5e]" />
                  <span>{currentOutlet.name}</span>
                </span>
                <span className="text-[9px] bg-[#0c0e0d] text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                  Locked
                </span>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#75cf5e] text-[#0c0e0d] shadow-md shadow-[#75cf5e]/15'
                      : 'text-[#88998f] hover:text-[#e5f4eb] hover:bg-[#181d1a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        isActive
                          ? 'bg-[#0c0e0d] text-[#75cf5e]'
                          : 'bg-[#1c211e] text-[#88998f]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
      </div>

      {/* Bottom Actions & Utilities */}
      <div className="p-4 pb-8 border-t border-[#1c211e] space-y-2">
        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            soundEnabled
              ? 'bg-emerald-950/40 text-[#75cf5e] border-[#239a4e]/40 hover:bg-emerald-950/70'
              : 'bg-[#0c0e0d] text-[#88998f] border-[#1c211e] hover:text-[#e5f4eb]'
          }`}
          title="Toggle audio chimes for new incoming orders"
        >
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>Order Chime</span>
          </div>
          <span className="text-[10px] font-black uppercase">
            {soundEnabled ? 'ON' : 'MUTED'}
          </span>
        </button>

        {/* View Storefront */}
        <Link
          href="/"
          target="_blank"
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#88998f] hover:text-[#e5f4eb] hover:bg-[#181d1a] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-[#75cf5e]" />
            <span>Customer Diner</span>
          </div>
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Admin</span>
        </button>
      </div>
    </aside>
    </>
  );
}
