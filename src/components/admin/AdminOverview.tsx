'use client';

import React from 'react';
import {
  Package,
  TrendingUp,
  Store,
  Clock,
  ArrowRight,
  Flame,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Order } from '@/types/database';

interface AdminOverviewProps {
  onGoToOrders: () => void;
  onSelectOrder: (order: Order) => void;
  selectedHubFilter: string;
}

export function AdminOverview({
  onGoToOrders,
  onSelectOrder,
  selectedHubFilter,
}: AdminOverviewProps) {
  const { orders, outlets, toggleStoreOpen, toggleRushPaused } = useNiteOwlStore();

  const hubOrders =
    selectedHubFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.outletId === selectedHubFilter);

  const activeOrders = hubOrders.filter(
    (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
  );
  const deliveredOrders = hubOrders.filter((o) => o.orderStatus === 'DELIVERED');
  const tonightRevenue = hubOrders.reduce((sum, o) => sum + o.total, 0);

  const activeHubsCount = outlets.filter((o) => o.isStoreOpen).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active In-Flight */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span>Active Orders</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#e5f4eb]">
              {activeOrders.length}
            </span>
            <span className="text-[10px] text-[#75cf5e] font-bold">In-Flight</span>
          </div>
        </div>

        {/* Tonight Completed */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span>Delivered Tonight</span>
            <div className="w-7 h-7 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#e5f4eb]">
              {deliveredOrders.length}
            </span>
            <span className="text-[10px] text-blue-400 font-bold">100% Handover</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span>{selectedHubFilter === 'ALL' ? "Total Network GMV" : "Hub Earnings"}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#75cf5e]">
              ₹{tonightRevenue}
            </span>
            <span className="text-[10px] text-[#88998f] font-mono">
              Razorpay Verified
            </span>
          </div>
        </div>

        {/* Active Hubs Online */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span>Kitchens Online</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#e5f4eb]">
              {activeHubsCount} / {outlets.length}
            </span>
            <span className="text-[10px] text-[#75cf5e] font-bold">
              {activeHubsCount === outlets.length ? 'All Online' : 'Partial'}
            </span>
          </div>
        </div>
      </div>

      {/* Hubs Status Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#e5f4eb] flex items-center gap-2">
            <Store className="w-4 h-4 text-[#75cf5e]" />
            <span>Store Hub Operations Overview</span>
          </h3>
          <span className="text-[11px] text-[#88998f]">
            Hours: 7:00 PM – 4:00 AM (Indore Midnight Network)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {outlets.map((outlet) => {
            const outletOrders = orders.filter((o) => o.outletId === outlet.id);
            const liveOrders = outletOrders.filter(
              (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
            ).length;

            return (
              <div
                key={outlet.id}
                className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#e5f4eb]">
                      {outlet.name}
                    </h4>
                    <p className="text-[10px] text-[#88998f] truncate max-w-[170px]">
                      {outlet.address}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      outlet.isStoreOpen
                        ? 'bg-emerald-950/80 text-[#75cf5e] border border-[#239a4e]/40'
                        : 'bg-red-950/80 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {outlet.isStoreOpen ? 'Online' : 'Closed'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#1c211e] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#88998f]">Revenue:</span>
                    <span className="font-black text-sm text-[#75cf5e]">
                      ₹{outletOrders.reduce((sum, o) => sum + o.total, 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1c211e]/60">
                    <span className="text-[#88998f] text-[11px]">
                      Queue: <strong className="text-[#75cf5e]">{liveOrders} live</strong> ({outletOrders.length} orders)
                    </span>
                    <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleStoreOpen(outlet.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        outlet.isStoreOpen
                          ? 'border-emerald-600/40 text-[#75cf5e] hover:bg-emerald-950/40'
                          : 'border-red-600/40 text-red-400 hover:bg-red-950/40'
                      }`}
                    >
                      {outlet.isStoreOpen ? 'Open' : 'Closed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRushPaused(outlet.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        outlet.isRushPaused
                          ? 'bg-amber-500 text-[#0c0e0d] border-amber-500'
                          : 'border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
                      }`}
                    >
                      {outlet.isRushPaused ? 'Surge' : 'Normal'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Recent Orders Preview */}
      <div className="bg-[#151917] p-4 rounded-2xl border border-[#1c211e] space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#e5f4eb] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#75cf5e]" />
            <span>Recent Orders Stream</span>
          </h3>
          <button
            type="button"
            onClick={onGoToOrders}
            className="text-xs font-bold text-[#75cf5e] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Orders ({hubOrders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {hubOrders.slice(0, 5).map((order) => {
            const isDelivered = order.orderStatus === 'DELIVERED';
            const isOutForDelivery = order.orderStatus === 'OUT_FOR_DELIVERY';
            const isPreparing = order.orderStatus === 'PREPARING';

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="p-3 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] border border-[#1c211e] flex items-center justify-between text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="font-mono font-bold text-[#75cf5e] text-xs">
                    {order.orderNumber}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-[#e5f4eb]">
                      {order.customerName}
                    </span>
                    <span className="text-[#88998f] text-[11px] ml-1.5 truncate">
                      • {order.addressDetails.hostelPgOrFlat}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-[#e5f4eb]">
                    ₹{order.total}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      isDelivered
                        ? 'bg-emerald-950/80 text-[#75cf5e] border-[#239a4e]/40'
                        : isOutForDelivery
                        ? 'bg-sky-950/80 text-sky-400 border-sky-500/40'
                        : isPreparing
                        ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                        : 'bg-red-950/80 text-red-300 border-red-500/40'
                    }`}
                  >
                    {order.orderStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
