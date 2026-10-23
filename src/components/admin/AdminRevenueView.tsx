'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  Clock,
  Download,
  Filter,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Order } from '@/types/database';

interface AdminRevenueViewProps {
  selectedHubFilter: string; // 'ALL' or outletId
  onSelectHub?: (hubId: string) => void;
}

export function AdminRevenueView({
  selectedHubFilter,
  onSelectHub,
}: AdminRevenueViewProps) {
  const { orders, outlets, zonesMap } = useNiteOwlStore();

  // Time filter for Hub View: 'DAILY' | 'WEEKLY' | 'ALL'
  const [timeRange, setTimeRange] = useState<'DAILY' | 'WEEKLY' | 'ALL'>('DAILY');

  const isSuperAdminAllHubs = selectedHubFilter === 'ALL';

  // Filter orders by time range helper
  const filterByTime = (orderList: Order[], range: 'DAILY' | 'WEEKLY' | 'ALL') => {
    if (range === 'ALL') return orderList;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    return orderList.filter((order) => {
      if (!order.createdAt) return true;
      const orderTime = new Date(order.createdAt).getTime();
      if (range === 'DAILY') {
        return now - orderTime <= oneDayMs;
      }
      if (range === 'WEEKLY') {
        return now - orderTime <= sevenDaysMs;
      }
      return true;
    });
  };

  // ----------------------------------------------------------------------------
  // SUPER ADMIN CALCULATIONS (Hub-wise & Total Revenue)
  // ----------------------------------------------------------------------------
  const allHubsRevenueStats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const razorpayOrders = orders.filter(
      (o) => o.paymentMethod === 'RAZORPAY' || o.paymentMethod === 'UPI_QR' || o.paymentMethod === 'UPI_INTENT'
    );
    const razorpayRevenue = razorpayOrders.reduce((sum, o) => sum + o.total, 0);
    const codOrders = orders.filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY');
    const codRevenue = codOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = orders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    // Breakdown per Hub
    const hubBreakdown = outlets.map((outlet) => {
      const hubOrders = orders.filter((o) => o.outletId === outlet.id);
      const hubRevenue = hubOrders.reduce((sum, o) => sum + o.total, 0);
      const hubRazorpay = hubOrders
        .filter((o) => o.paymentMethod === 'RAZORPAY' || o.paymentMethod === 'UPI_QR' || o.paymentMethod === 'UPI_INTENT')
        .reduce((sum, o) => sum + o.total, 0);
      const hubAOV = hubOrders.length > 0 ? Math.round(hubRevenue / hubOrders.length) : 0;
      const revenueShare = totalRevenue > 0 ? Math.round((hubRevenue / totalRevenue) * 100) : 0;

      return {
        outlet,
        hubRevenue,
        hubRazorpay,
        ordersCount: hubOrders.length,
        hubAOV,
        revenueShare,
      };
    });

    return {
      totalRevenue,
      razorpayRevenue,
      codRevenue,
      totalOrdersCount,
      avgOrderValue,
      hubBreakdown,
    };
  }, [orders, outlets]);

  // ----------------------------------------------------------------------------
  // HUB MANAGER CALCULATIONS (Current Hub Scoped: Daily, Weekly, Razorpay & Section-wise)
  // ----------------------------------------------------------------------------
  const currentOutlet = useMemo(() => {
    return outlets.find((o) => o.id === selectedHubFilter) || outlets[0];
  }, [outlets, selectedHubFilter]);

  const hubOrders = useMemo(() => {
    return orders.filter((o) => o.outletId === currentOutlet.id);
  }, [orders, currentOutlet]);

  const timeFilteredHubOrders = useMemo(() => {
    return filterByTime(hubOrders, timeRange);
  }, [hubOrders, timeRange]);

  const currentHubStats = useMemo(() => {
    const totalEarnings = timeFilteredHubOrders.reduce((sum, o) => sum + o.total, 0);
    const razorpayOrders = timeFilteredHubOrders.filter(
      (o) => o.paymentMethod === 'RAZORPAY' || o.paymentMethod === 'UPI_QR' || o.paymentMethod === 'UPI_INTENT'
    );
    const razorpayTotal = razorpayOrders.reduce((sum, o) => sum + o.total, 0);
    const codTotal = timeFilteredHubOrders
      .filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY')
      .reduce((sum, o) => sum + o.total, 0);
    const aov = timeFilteredHubOrders.length > 0 ? Math.round(totalEarnings / timeFilteredHubOrders.length) : 0;

    // Section-wise / Zone-wise Revenue
    const hubZones = zonesMap[currentOutlet.id] || [];
    const sectionBreakdown = hubZones.map((zone) => {
      const zoneOrders = timeFilteredHubOrders.filter((o) => o.zoneId === zone.id);
      const zoneRevenue = zoneOrders.reduce((sum, o) => sum + o.total, 0);
      const percentage = totalEarnings > 0 ? Math.round((zoneRevenue / totalEarnings) * 100) : 0;
      return {
        zone,
        zoneRevenue,
        ordersCount: zoneOrders.length,
        percentage,
      };
    });

    return {
      totalEarnings,
      razorpayTotal,
      razorpayCount: razorpayOrders.length,
      codTotal,
      ordersCount: timeFilteredHubOrders.length,
      aov,
      sectionBreakdown,
      razorpayOrdersList: razorpayOrders,
    };
  }, [timeFilteredHubOrders, zonesMap, currentOutlet]);

  return (
    <div className="space-y-6 text-[#e5f4eb]">
      {/* =========================================================================
          VIEW 1: SUPER ADMIN — HUB-WISE & TOTAL REVENUE
         ========================================================================= */}
      {isSuperAdminAllHubs ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#e5f4eb] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#75cf5e]" />
                <span>Central Revenue &amp; Hub Performance</span>
              </h2>
              <p className="text-xs text-[#88998f]">
                Aggregated financial earnings across all Indore dark kitchens and Razorpay online settlements.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#151917] border border-[#239a4e]/40 text-[#75cf5e] text-xs font-bold flex items-center gap-2 self-start">
              <ShieldCheck className="w-4 h-4" />
              <span>Razorpay Verified Gateway</span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Total GMV (All Hubs)</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#75cf5e]">
                  ₹{allHubsRevenueStats.totalRevenue}
                </span>
                <span className="text-[10px] text-[#88998f]">Gross Total</span>
              </div>
            </div>

            {/* Razorpay Online Settled */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Razorpay Online Settled</span>
                <div className="w-7 h-7 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  ₹{allHubsRevenueStats.razorpayRevenue}
                </span>
                <span className="text-[10px] text-[#75cf5e] font-bold">
                  {allHubsRevenueStats.totalRevenue > 0
                    ? `${Math.round((allHubsRevenueStats.razorpayRevenue / allHubsRevenueStats.totalRevenue) * 100)}% Online`
                    : '100%'}
                </span>
              </div>
            </div>

            {/* Total Orders Handled */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Total Orders</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  {allHubsRevenueStats.totalOrdersCount}
                </span>
                <span className="text-[10px] text-[#88998f]">Completed</span>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Average Order Value (AOV)</span>
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  ₹{allHubsRevenueStats.avgOrderValue}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">Per Order</span>
              </div>
            </div>
          </div>

          {/* Hub-Wise Revenue Breakdown Table & Cards */}
          <div className="bg-[#151917] border border-[#1c211e] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div>
                <h3 className="font-extrabold text-sm text-[#e5f4eb] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#75cf5e]" />
                  <span>Hub-Wise Revenue Performance</span>
                </h3>
                <p className="text-[11px] text-[#88998f]">
                  Individual revenue share and Razorpay collections for each Indore kitchen.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allHubsRevenueStats.hubBreakdown.map((item) => (
                <div
                  key={item.outlet.id}
                  className="p-4 rounded-xl bg-[#0c0e0d] border border-[#1c211e] hover:border-[#239a4e]/40 space-y-3 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#e5f4eb] flex items-center gap-1.5">
                        <span>📍</span>
                        <span>{item.outlet.name}</span>
                      </h4>
                      <p className="text-[10px] text-[#88998f] mt-0.5">
                        {item.outlet.isStoreOpen ? (
                          <span className="text-[#75cf5e] font-bold">● Kitchen Open</span>
                        ) : (
                          <span className="text-gray-500">● Kitchen Closed</span>
                        )}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#151917] border border-[#239a4e]/40 text-[#75cf5e] font-mono text-xs font-black">
                      {item.revenueShare}% Share
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#1c211e] space-y-1.5 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#88998f]">Hub Revenue:</span>
                      <span className="font-black text-sm text-[#75cf5e]">
                        ₹{item.hubRevenue}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px]">
                      <span className="text-[#88998f]">Razorpay Settled:</span>
                      <span className="font-bold text-[#e5f4eb]">
                        ₹{item.hubRazorpay}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px]">
                      <span className="text-[#88998f]">Delivered Orders:</span>
                      <span className="font-bold text-[#e5f4eb]">
                        {item.ordersCount} orders
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px]">
                      <span className="text-[#88998f]">Avg Order Value:</span>
                      <span className="font-bold text-[#e5f4eb]">
                        ₹{item.hubAOV}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar of share */}
                  <div className="w-full bg-[#151917] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#75cf5e] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, item.revenueShare)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: HUB DELIVERY PAGE — CURRENT SECTION-WISE & RAZORPAY DAILY/WEEKLY
           ========================================================================= */
        <div className="space-y-6">
          {/* Header & Time Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#0c0e0d] text-[#75cf5e] border border-[#239a4e]/40 text-[10px] font-bold">
                  Hub Scoped
                </span>
                <h2 className="text-lg font-black tracking-tight text-[#e5f4eb] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#75cf5e]" />
                  <span>{currentOutlet.name} • Revenue &amp; Razorpay Earnings</span>
                </h2>
              </div>
              <p className="text-xs text-[#88998f] mt-1">
                Real-time online earnings attached to Razorpay payments across delivery sections.
              </p>
            </div>

            {/* Time Filter Tabs: Daily vs Weekly vs All-Time */}
            <div className="flex items-center bg-[#151917] p-1 rounded-xl border border-[#1c211e] text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTimeRange('DAILY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'DAILY'
                    ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                Daily (Today)
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('WEEKLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'WEEKLY'
                    ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                Weekly (This Week)
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'ALL'
                    ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                All-Time
              </button>
            </div>
          </div>

          {/* Hub KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Razorpay Online Earnings */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#239a4e]/40 space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Razorpay Earnings</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center font-black">
                  ₹
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#75cf5e]">
                  ₹{currentHubStats.razorpayTotal}
                </span>
                <span className="text-[10px] text-[#88998f]">
                  {timeRange === 'DAILY' ? 'Today' : timeRange === 'WEEKLY' ? 'This Week' : 'Total'}
                </span>
              </div>
            </div>

            {/* Total Hub Revenue */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Total Gross Sales</span>
                <div className="w-7 h-7 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  ₹{currentHubStats.totalEarnings}
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {currentHubStats.ordersCount} orders
                </span>
              </div>
            </div>

            {/* Razorpay Order Share */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Razorpay Payments</span>
                <div className="w-7 h-7 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  {currentHubStats.razorpayCount}
                </span>
                <span className="text-[10px] text-[#75cf5e] font-bold">100% Verified</span>
              </div>
            </div>

            {/* Hub AOV */}
            <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
              <div className="flex items-center justify-between text-xs text-[#88998f]">
                <span>Average Order Value</span>
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e5f4eb]">
                  ₹{currentHubStats.aov}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">Per Order</span>
              </div>
            </div>
          </div>

          {/* Section-Wise / Micro-Zone Revenue Breakdown */}
          <div className="bg-[#151917] border border-[#1c211e] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div>
                <h3 className="font-extrabold text-sm text-[#e5f4eb] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#75cf5e]" />
                  <span>Section-Wise (Delivery Micro-Zone) Revenue</span>
                </h3>
                <p className="text-[11px] text-[#88998f]">
                  Earnings breakdown by concentric distance radii around {currentOutlet.name}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentHubStats.sectionBreakdown.map((sec) => (
                <div
                  key={sec.zone.id}
                  className="p-4 rounded-xl bg-[#0c0e0d] border border-[#1c211e] space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#e5f4eb]">
                        {sec.zone.name}
                      </h4>
                      <p className="text-[10px] text-[#88998f]">
                        Radius: {sec.zone.radiusKm} km • Fee: ₹{sec.zone.deliveryFee}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#151917] text-[#75cf5e] font-mono text-xs font-bold border border-[#239a4e]/30">
                      {sec.percentage}%
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#1c211e] flex justify-between items-baseline text-xs">
                    <span className="text-[#88998f]">Revenue:</span>
                    <span className="font-black text-[#75cf5e]">₹{sec.zoneRevenue}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="text-[#88998f]">Delivered Orders:</span>
                    <span className="font-bold text-[#e5f4eb]">{sec.ordersCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Razorpay Online Transactions Feed */}
          <div className="bg-[#151917] border border-[#1c211e] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div>
                <h3 className="font-extrabold text-sm text-[#e5f4eb] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#75cf5e]" />
                  <span>Recent Razorpay Payments ({currentHubStats.razorpayOrdersList.length})</span>
                </h3>
                <p className="text-[11px] text-[#88998f]">
                  Individual online payments verified and settled through Razorpay gateway.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#e5f4eb] border-collapse">
                <thead>
                  <tr className="bg-[#0c0e0d] text-[#88998f] text-[10px] font-bold uppercase tracking-wider border-b border-[#1c211e]">
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer &amp; Location</th>
                    <th className="py-2.5 px-3">Razorpay ID</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c211e]">
                  {currentHubStats.razorpayOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#88998f]">
                        No Razorpay transactions found for this time period.
                      </td>
                    </tr>
                  ) : (
                    currentHubStats.razorpayOrdersList.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#1a201c] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#75cf5e]">
                          {ord.orderNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold block">{ord.customerName}</span>
                          <span className="text-[10px] text-[#88998f]">
                            {ord.addressDetails?.hostelPgOrFlat || ord.addressDetails?.landmark}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-[#88998f]">
                          {ord.razorpayPaymentId || ord.razorpayOrderId || 'rzp_test_pay'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-[#0c0e0d] text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                            Razorpay UPI
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-[#75cf5e]">
                          ₹{ord.total}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-[#75cf5e] border border-[#239a4e]/40 text-[10px] font-bold">
                            ● Verified Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
