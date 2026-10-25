'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  X,
  Volume2,
  VolumeX,
  Bell,
  Store,
  ShieldCheck,
  Building2,
  ExternalLink,
  Sparkles,
  Radio,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { AdminSidebar, AdminViewTab, AdminRole } from '@/components/admin/AdminSidebar';
import { AdminOrdersList } from '@/components/admin/AdminOrdersList';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminRevenueView } from '@/components/admin/AdminRevenueView';
import { AdminRidersView } from '@/components/admin/AdminRidersView';
import { AdminHubsView } from '@/components/admin/AdminHubsView';
import { AdminOrderDrawer } from '@/components/admin/AdminOrderDrawer';
import { ZoneRadiusMap } from '@/components/visualizer/ZoneRadiusMap';
import { ArchitectureViewer } from '@/components/architecture/ArchitectureViewer';
import { realtimeHub, RealtimeMessage } from '@/lib/realtimeSync';
import { Order } from '@/types/database';

export default function AdminPage() {
  const router = useRouter();
  const {
    isAdminAuthenticated,
    adminLogout,
    orders,
    outlets,
    currentOutlet,
    setOutlet,
    syncWithBackend,
  } = useNiteOwlStore();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminViewTab>('overview');
  const [adminRole, setAdminRole] = useState<AdminRole>('SUPER_ADMIN');
  const [selectedHubFilter, setSelectedHubFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Authentication check & initial microservices sync
  useEffect(() => {
    setMounted(true);
    fetch('/api/admin/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          useNiteOwlStore.setState({ isAdminAuthenticated: true });
          syncWithBackend();
        } else if (!isAdminAuthenticated) {
          router.push('/admin/login');
        } else {
          syncWithBackend();
        }
      })
      .catch(() => {
        if (!isAdminAuthenticated) {
          router.push('/admin/login');
        } else {
          syncWithBackend();
        }
      });
  }, [isAdminAuthenticated, router, syncWithBackend]);

  // Keep selected order in sync when orders array updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
      }
    }
  }, [orders, selectedOrder]);

  // Real-time audio chime & new order alerts
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((msg: RealtimeMessage) => {
      if (msg.type === 'ORDER_PLACED') {
        if (soundEnabled) {
          realtimeHub.playKitchenChime();
        }
        setNewOrderAlert(`⚡ New Order: ${msg.order.orderNumber} (₹${msg.order.total})`);
        setTimeout(() => {
          setNewOrderAlert(null);
        }, 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [soundEnabled]);

  // When switching role to HUB_MANAGER, lock filter to current outlet
  const handleRoleChange = (role: AdminRole) => {
    setAdminRole(role);
    if (role === 'HUB_MANAGER') {
      const targetHub = currentOutlet.id || outlets[0].id;
      setSelectedHubFilter(targetHub);
    } else {
      setSelectedHubFilter('ALL');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    adminLogout();
    router.push('/admin/login');
  };

  if (!mounted || !isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0c0e0d] text-[#e5f4eb] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-[#88998f]">
          <span className="w-4 h-4 border-2 border-[#75cf5e] border-t-transparent rounded-full animate-spin" />
          <span>Verifying Admin Authorization...</span>
        </div>
      </div>
    );
  }

  // Active in-flight orders count for badge
  const activeOrdersCount = orders.filter(
    (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
  ).length;

  const currentHubName =
    selectedHubFilter === 'ALL'
      ? 'All Indore Hubs'
      : outlets.find((o) => o.id === selectedHubFilter)?.name || 'Hub';

  return (
    <div className="min-h-screen bg-[#0c0e0d] text-[#e5f4eb] flex font-sans selection:bg-[#75cf5e] selection:text-[#0c0e0d]">
      {/* Sidebar Navigation */}
      <AdminSidebar
        currentTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedHubFilter={selectedHubFilter}
        onHubFilterChange={(hubId) => setSelectedHubFilter(hubId)}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          if (next) {
            realtimeHub.playKitchenChime();
          }
        }}
        onLogout={handleLogout}
        activeOrdersCount={activeOrdersCount}
        adminRole={adminRole}
        onRoleChange={handleRoleChange}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Minimal Top Header */}
        <header className="sticky top-0 z-30 bg-[#111413]/90 backdrop-blur-md border-b border-[#1c211e] px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-[#151917] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb] cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb & Scope Badge */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#88998f] hidden sm:inline">Admin Ops</span>
              <span className="text-[#88998f] hidden sm:inline">/</span>
              <span className="font-extrabold text-[#e5f4eb] capitalize">
                {activeTab === 'overview' && 'Overview & Analytics'}
                {activeTab === 'orders' && 'Live Orders Console'}
                {activeTab === 'revenue' && 'Revenue & Razorpay Earnings'}
                {activeTab === 'riders' && 'Delivery Fleet & Pilots'}
                {activeTab === 'hubs' && 'Hubs & Kitchens'}
                {activeTab === 'radar' && 'Concentric Radar'}
                {activeTab === 'schema' && 'System Schemas'}
              </span>

              {/* Hub Tag */}
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 bg-[#151917] border-[#239a4e]/40 text-[#75cf5e]">
                <Radio className="w-2.5 h-2.5 animate-pulse text-[#75cf5e]" />
                <span>{currentHubName}</span>
              </span>
            </div>
          </div>

          {/* Quick Actions & Status Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Chime Button */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) {
                  realtimeHub.playKitchenChime();
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-950/40 text-[#75cf5e] border-[#239a4e]/40 hover:bg-emerald-950/60'
                  : 'bg-[#151917] text-[#88998f] border-[#1c211e] hover:text-[#e5f4eb]'
              }`}
              title={soundEnabled ? 'Kitchen chime is active' : 'Kitchen chime is muted'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#75cf5e]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {soundEnabled ? 'Chime Active' : 'Chime Muted'}
              </span>
            </button>

            {/* Test Chime Trigger */}
            <button
              type="button"
              onClick={() => realtimeHub.playKitchenChime()}
              className="px-2.5 py-1.5 rounded-xl bg-[#151917] hover:bg-[#1c211e] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Test Kitchen Audio Chime"
            >
              <Bell className="w-3 h-3 text-[#75cf5e]" />
              <span className="hidden md:inline">Test Bell</span>
            </button>

            {/* Storefront Link */}
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-[#75cf5e] hover:bg-[#62b54d] text-[#0c0e0d] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-[#75cf5e]/20"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Diner</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Real-time Order Alert Toast Banner */}
        {newOrderAlert && (
          <div className="bg-[#75cf5e] text-[#0c0e0d] px-4 py-2 font-black text-xs flex items-center justify-between shadow-lg sticky top-[57px] z-20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{newOrderAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setNewOrderAlert(null);
              }}
              className="underline hover:opacity-80 text-[11px] font-bold cursor-pointer"
            >
              View In Orders Table →
            </button>
          </div>
        )}

        {/* Tab Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <AdminOverview
              selectedHubFilter={selectedHubFilter}
              onGoToOrders={() => setActiveTab('orders')}
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersList
              selectedHubFilter={selectedHubFilter}
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          )}

          {activeTab === 'revenue' && (
            <AdminRevenueView
              selectedHubFilter={selectedHubFilter}
              onSelectHub={(hubId) => setSelectedHubFilter(hubId)}
            />
          )}

          {activeTab === 'riders' && (
            <AdminRidersView
              selectedHubFilter={selectedHubFilter}
              onSelectOrder={(order) => setSelectedOrder(order)}
            />
          )}

          {activeTab === 'hubs' && <AdminHubsView />}

          {activeTab === 'radar' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#e5f4eb]">
                  Concentric Delivery Radar
                </h2>
                <p className="text-xs text-[#88998f]">
                  Real-time interactive concentric radii around Indore cloud kitchens.
                </p>
              </div>
              <ZoneRadiusMap />
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#e5f4eb]">
                  System Architecture &amp; Data Schemas
                </h2>
                <p className="text-xs text-[#88998f]">
                  Interactive visualization of NiteOwl micro-hub routing and concentric zone structures.
                </p>
              </div>
              <ArchitectureViewer />
            </div>
          )}
        </main>
      </div>

      {/* Slide-over Order Details Drawer */}
      <AdminOrderDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
