'use client';

import React from 'react';
import {
  Store,
  Layers,
  Power,
  Flame,
  AlertTriangle,
  MapPin,
  Clock,
  Bike,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

export function AdminHubsView() {
  const {
    outlets,
    zonesMap,
    toggleStoreOpen,
    toggleRushPaused,
    toggleZoneActive,
    orders,
  } = useNiteOwlStore();

  return (
    <div className="space-y-6 text-[#e5f4eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black tracking-tight text-[#e5f4eb] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#75cf5e]" />
            <span>Multi-Hub Operations &amp; Kitchen Management</span>
          </h2>
          <p className="text-xs text-[#88998f]">
            Central super admin view for all Indore cloud kitchens and micro-zone dispatch radii.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {outlets.map((outlet) => {
          const outletZones = zonesMap[outlet.id] || [];
          const hubOrders = orders.filter((o) => o.outletId === outlet.id);
          const activeOrders = hubOrders.filter(
            (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
          );

          return (
            <div
              key={outlet.id}
              className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-4 shadow-lg"
            >
              {/* Outlet Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c211e]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0c0e0d] border border-[#239a4e]/40 flex items-center justify-center text-lg shadow-sm">
                    🦉
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#e5f4eb] flex items-center gap-2">
                      <span>{outlet.name}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                          outlet.isStoreOpen
                            ? 'bg-emerald-950/80 text-[#75cf5e] border border-[#239a4e]/40'
                            : 'bg-red-950/80 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {outlet.isStoreOpen ? 'Online' : 'Store Offline'}
                      </span>
                    </h3>
                    <p className="text-xs text-[#88998f] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#75cf5e]" />
                      <span>{outlet.address}</span>
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStoreOpen(outlet.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      outlet.isStoreOpen
                        ? 'bg-[#0c0e0d] text-[#75cf5e] border-[#239a4e]/40 hover:bg-[#1a201c]'
                        : 'bg-red-950/80 text-red-300 border-red-500/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{outlet.isStoreOpen ? 'Kitchen Open' : 'Kitchen Closed'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleRushPaused(outlet.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      outlet.isRushPaused
                        ? 'bg-amber-500 text-[#0c0e0d] border-amber-500 shadow-md'
                        : 'bg-[#0c0e0d] text-[#88998f] border-[#1c211e] hover:text-[#e5f4eb]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{outlet.isRushPaused ? 'Surge Paused' : 'Normal Rush'}</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-[#0c0e0d] p-3 rounded-xl border border-[#1c211e] text-xs">
                <div>
                  <span className="text-[10px] text-[#88998f] block">Active In-Flight</span>
                  <span className="font-bold text-[#75cf5e]">{activeOrders.length} orders</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#88998f] block">Total Tonight</span>
                  <span className="font-bold text-[#e5f4eb]">{hubOrders.length} orders</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#88998f] block">Operating Hours</span>
                  <span className="font-bold text-[#e5f4eb]">7:00 PM – 4:00 AM</span>
                </div>
              </div>

              {/* Concentric Zones for this Hub */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#75cf5e]" />
                  <span>Concentric Delivery Zones</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {outletZones.map((zone) => {
                    const isPaused = !zone.isActive;

                    return (
                      <div
                        key={zone.id}
                        className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                          isPaused
                            ? 'bg-amber-950/20 border-amber-600/40'
                            : 'bg-[#0c0e0d] border-[#1c211e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#e5f4eb]">{zone.name}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={zone.isActive}
                              onChange={() => toggleZoneActive(outlet.id, zone.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-[#151917] border border-[#1c211e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#e5f4eb] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#75cf5e] peer-checked:after:bg-[#0c0e0d]" />
                          </label>
                        </div>

                        <div className="flex justify-between text-[11px] text-[#88998f]">
                          <span>Radius: {zone.radiusKm} km</span>
                          <span className="text-[#75cf5e] font-bold">
                            {zone.deliveryFee === 0 ? 'Free Delivery' : `₹${zone.deliveryFee}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
