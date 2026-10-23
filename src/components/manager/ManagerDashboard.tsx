'use client';

import React, { useState, useEffect } from 'react';
import {
  Power,
  Flame,
  Clock,
  Layers,
  AlertTriangle,
  ChevronRight,
  Building,
  VolumeX,
  Volume2,
  Bell,
  Phone,
  Bike,
  ChefHat,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { OrderStatus } from '@/types/database';
import { realtimeHub } from '@/lib/realtimeSync';

const AVAILABLE_PILOTS = [
  { id: 'pilot-12', name: 'Pilot Suresh (Pilot #12)', vehicle: 'TVS Ntorq • MP-09-NW-2026' },
  { id: 'pilot-08', name: 'Pilot Rahul (Pilot #08)', vehicle: 'Honda Activa • MP-09-AA-4412' },
  { id: 'pilot-15', name: 'Pilot Vikas (Pilot #15)', vehicle: 'Bajaj Pulsar • MP-09-CZ-8890' },
];

export function ManagerDashboard() {
  const {
    outlets,
    zonesMap,
    currentOutlet,
    setOutlet,
    toggleZoneActive,
    toggleStoreOpen,
    toggleRushPaused,
    orders,
    updateOrderStatus,
  } = useNiteOwlStore();

  const [selectedFilterZone, setSelectedFilterZone] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newOrderBanner, setNewOrderBanner] = useState<string | null>(null);
  const [assignedRiders, setAssignedRiders] = useState<Record<string, string>>({});

  const outletZones = zonesMap[currentOutlet.id] || [];
  const hubOrders = orders.filter((o) => o.outletId === currentOutlet.id);
  const filteredOrders = hubOrders.filter((o) => {
    if (selectedFilterZone === 'ALL') return true;
    return o.zoneId === selectedFilterZone;
  });

  // Listen for real-time incoming orders from customer tabs & trigger audio chime
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((msg) => {
      if (msg.type === 'ORDER_PLACED') {
        if (soundEnabled) {
          realtimeHub.playKitchenChime();
        }
        setNewOrderBanner(
          `🔔 New 2 AM Order ${msg.order.orderNumber} for ${msg.order.addressDetails.hostelPgOrFlat}!`
        );
        setTimeout(() => {
          setNewOrderBanner(null);
        }, 9000);
      }
    });

    return unsubscribe;
  }, [soundEnabled]);

  const getZoneBadgeColor = (zoneCode?: string) => {
    switch (zoneCode) {
      case 'ZONE_1':
        return 'bg-[#0c0e0d] text-[#75cf5e] border-[#239a4e]/50';
      case 'ZONE_2':
        return 'bg-[#0c0e0d] text-[#75cf5e] border-[#239a4e]/30';
      case 'ZONE_3':
        return 'bg-[#0c0e0d] text-[#e5f4eb] border-[#333333]';
      default:
        return 'bg-[#0c0e0d] text-[#75cf5e] border-[#239a4e]/40';
    }
  };

  const handleTestChime = () => {
    realtimeHub.playKitchenChime();
    setNewOrderBanner('🔔 Test Chime sounded! Kitchen audio alert verified.');
    setTimeout(() => setNewOrderBanner(null), 4000);
  };

  return (
    <div className="w-full bg-[#0c0e0d] min-h-screen text-[#e5f4eb] p-4 md:p-8 space-y-8 relative">
      {/* Floating Real-time Order Alert Banner */}
      {newOrderBanner && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-950/95 border-2 border-[#75cf5e] text-[#e5f4eb] p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#75cf5e] text-[#0c0e0d] flex items-center justify-center font-bold text-lg animate-bounce">
              🔔
            </span>
            <div>
              <p className="font-extrabold text-xs text-[#75cf5e]">KITCHEN DISPATCH ALERT</p>
              <p className="text-xs font-semibold text-[#e5f4eb]">{newOrderBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNewOrderBanner(null)}
            className="w-6 h-6 rounded-lg bg-emerald-900/50 hover:bg-emerald-900 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Hub Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151917] border border-[#1c211e] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#75cf5e] animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-[#75cf5e] font-bold">
              Hub Manager Ops Console
            </span>
            <span className="text-[#333333]">•</span>
            <span className="text-xs text-[#88998f] font-mono">
              Live Real-Time Sync Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#e5f4eb] flex items-center gap-2">
            <span>🦉 {currentOutlet.name}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0c0e0d] text-[#88998f] border border-[#1c211e]">
              Indore Hub #1
            </span>
          </h1>
          <p className="text-xs text-[#88998f]">{currentOutlet.address}</p>
        </div>

        {/* Multi-Hub Switcher & Kitchen Emergency Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audio Chime Toggle & Test */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/80 text-[#75cf5e] border border-[#239a4e]/50 hover:bg-emerald-900/60'
                : 'bg-[#0c0e0d] text-[#88998f] border border-[#1c211e]'
            }`}
            title="Toggle kitchen order audio alerts"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestChime}
            className="px-3 py-2 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] text-xs font-bold transition-all cursor-pointer"
            title="Test synthesized kitchen bell sound"
          >
            🔔 Test Sound
          </button>

          {/* Hub Selector */}
          <div className="flex items-center bg-[#0c0e0d] rounded-xl p-1 border border-[#1c211e]">
            {outlets.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => setOutlet(outlet.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentOutlet.id === outlet.id
                    ? 'bg-[#75cf5e] text-[#0c0e0d] font-bold shadow'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                {outlet.name.replace(' Hub', '')}
              </button>
            ))}
          </div>

          {/* Store Open/Close Toggle */}
          <button
            onClick={() => toggleStoreOpen(currentOutlet.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              currentOutlet.isStoreOpen
                ? 'bg-[#0c0e0d] text-[#75cf5e] border border-[#239a4e]/50 hover:bg-[#151917]'
                : 'bg-red-950/80 text-red-300 border border-red-500/50 hover:bg-red-900/60'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{currentOutlet.isStoreOpen ? 'Kitchen Online' : 'Store Closed'}</span>
          </button>

          {/* Midnight Rush / Rain Surge Toggle */}
          <button
            onClick={() => toggleRushPaused(currentOutlet.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              currentOutlet.isRushPaused
                ? 'bg-amber-500 text-[#0c0e0d] font-black shadow-lg shadow-amber-500/30'
                : 'bg-[#0c0e0d] text-[#88998f] border border-[#1c211e] hover:text-[#e5f4eb]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>
              {currentOutlet.isRushPaused ? 'Surge Rush Active' : 'Normal Load'}
            </span>
          </button>
        </div>
      </div>

      {/* Zone Control Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e5f4eb] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#75cf5e]" />
              Concentric Micro-Zone Live Controls
            </h2>
            <p className="text-xs text-[#88998f]">
              Instantly toggle outer zones during midnight rains or kitchen overload to protect core delivery speed.
            </p>
          </div>
          <span className="text-xs text-[#88998f]">
            Total Operational Radius: <strong className="text-[#75cf5e]">2.0 km</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {outletZones.map((zone) => {
            const isPaused = !zone.isActive;

            return (
              <div
                key={zone.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isPaused
                    ? 'bg-amber-950/20 border-amber-600/40 ring-1 ring-amber-500/20'
                    : 'bg-[#151917] border-[#1c211e] hover:border-[#239a4e]/40'
                }`}
              >
                {/* Zone Top Title & Live Toggle */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getZoneBadgeColor(
                          zone.zoneCode
                        )}`}
                      >
                        {zone.zoneCode}
                      </span>
                      <span className="text-xs text-[#88998f] font-mono">
                        Radius: {zone.radiusKm} km
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#e5f4eb] mt-1">
                      {zone.name}
                    </h3>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zone.isActive}
                      onChange={() => toggleZoneActive(currentOutlet.id, zone.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#0c0e0d] border border-[#1c211e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#e5f4eb] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#75cf5e] peer-checked:after:bg-[#0c0e0d]" />
                  </label>
                </div>

                {/* Status Notice */}
                {isPaused && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Paused by manager. Customers cannot order from this zone.</span>
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1c211e] text-xs">
                  <div>
                    <span className="text-[10px] text-[#88998f] block">Avg ETA</span>
                    <span className="font-extrabold text-[#e5f4eb]">
                      {zone.estimatedDeliveryMins} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#88998f] block">Delivery Fee</span>
                    <span className="font-extrabold text-[#75cf5e]">
                      {zone.deliveryFee === 0 ? 'FREE' : `₹${zone.deliveryFee}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#88998f] block">Min Order</span>
                    <span className="font-extrabold text-[#e5f4eb]">
                      ₹{zone.minOrderValue}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Order Queue with Zone Badges & Status Progression */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#e5f4eb] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#75cf5e]" />
              Live Midnight Order Dispatch Queue ({hubOrders.length})
            </h2>
            <p className="text-xs text-[#88998f]">
              Orders update in real-time. Actions dispatch notifications to the customer live tracker.
            </p>
          </div>

          {/* Zone Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#151917] p-1 rounded-xl border border-[#1c211e] text-xs">
            <button
              onClick={() => setSelectedFilterZone('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedFilterZone === 'ALL'
                  ? 'bg-[#75cf5e] text-[#0c0e0d] font-bold'
                  : 'text-[#88998f] hover:text-[#e5f4eb]'
              }`}
            >
              All Zones ({hubOrders.length})
            </button>
            {outletZones.map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedFilterZone(z.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedFilterZone === z.id
                    ? 'bg-[#75cf5e] text-[#0c0e0d] font-bold'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                {z.zoneCode}
              </button>
            ))}
          </div>
        </div>

        {/* Order Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#151917]/50 rounded-2xl border border-[#1c211e] text-[#88998f] space-y-2">
              <div className="text-3xl">🦉</div>
              <p className="font-bold text-[#e5f4eb]">No orders in kitchen queue right now</p>
              <p className="text-xs text-[#88998f]">
                When a customer books on the diner page, it will instantly sound the chime and appear here.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const zone = outletZones.find((z) => z.id === order.zoneId);
              const isPlaced = order.orderStatus === 'PLACED';
              const isPreparing = order.orderStatus === 'PREPARING';
              const isOutForDelivery = order.orderStatus === 'OUT_FOR_DELIVERY';
              const isDelivered = order.orderStatus === 'DELIVERED';

              const assignedPilot =
                assignedRiders[order.id] || order.riderName || AVAILABLE_PILOTS[0].name;

              return (
                <div
                  key={order.id}
                  className={`p-5 rounded-2xl bg-[#151917] border shadow-lg space-y-3.5 transition-all ${
                    isPlaced
                      ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                      : isOutForDelivery
                      ? 'border-[#239a4e]/70 ring-1 ring-[#239a4e]/30'
                      : 'border-[#1c211e] hover:border-[#239a4e]/40'
                  }`}
                >
                  {/* Order Top Bar: Zone Highlight & Order Number */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {/* Prominent Zone Tag */}
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide border ${getZoneBadgeColor(
                            zone?.zoneCode
                          )}`}
                        >
                          [{zone?.zoneCode || 'ZONE 1'} - {order.addressDetails.hostelPgOrFlat}]
                        </span>

                        <span className="font-mono text-xs font-bold text-[#88998f]">
                          {order.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[#88998f]">
                        <span className="font-bold text-[#e5f4eb]">
                          {order.customerName}
                        </span>
                        <span>•</span>
                        <span>{order.customerPhone}</span>
                        <span>•</span>
                        <span className="text-[#75cf5e] font-semibold">
                          Unit: {order.addressDetails.roomNo}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${
                        isDelivered
                          ? 'bg-emerald-950/80 text-[#75cf5e] border-[#239a4e]/40'
                          : isOutForDelivery
                          ? 'bg-sky-950/80 text-sky-400 border-sky-500/40 animate-pulse'
                          : isPreparing
                          ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                          : 'bg-red-950/80 text-red-300 border-red-500/40 animate-pulse'
                      }`}
                    >
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Delivery Badges */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {order.addressDetails.leaveAtGate && (
                      <span className="px-2 py-0.5 rounded-md bg-[#0c0e0d] text-[#75cf5e] border border-[#239a4e]/40 flex items-center gap-1 font-semibold">
                        <Building className="w-3 h-3" />
                        Gate / Security Drop
                      </span>
                    )}
                    {order.addressDetails.silentDelivery && (
                      <span className="px-2 py-0.5 rounded-md bg-[#0c0e0d] text-[#75cf5e] border border-[#239a4e]/40 flex items-center gap-1 font-semibold">
                        <VolumeX className="w-3 h-3" />
                        Silent Delivery
                      </span>
                    )}
                    {order.addressDetails.maskedCall && (
                      <span className="px-2 py-0.5 rounded-md bg-[#0c0e0d] text-[#75cf5e] border border-[#239a4e]/40 flex items-center gap-1 font-semibold">
                        <Phone className="w-3 h-3" />
                        Masked Proxy
                      </span>
                    )}
                  </div>

                  {order.addressDetails.riderNotes && (
                    <p className="text-xs text-[#88998f] italic bg-[#0c0e0d] p-2 rounded-lg border border-[#1c211e]">
                      &quot;{order.addressDetails.riderNotes}&quot;
                    </p>
                  )}

                  {/* Items list */}
                  <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-1 text-xs">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[#e5f4eb]">
                        <span className="font-semibold">
                          {it.quantity}x {it.name}
                        </span>
                        <span>₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[#1c211e] flex justify-between font-bold text-[#e5f4eb]">
                      <span>Total Paid</span>
                      <span className="text-[#75cf5e] font-extrabold text-sm">
                        ₹{order.total}
                      </span>
                    </div>
                  </div>

                  {/* Pipeline Actions */}
                  <div className="pt-2 border-t border-[#1c211e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Pilot Assignment */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#88998f] text-[11px]">Pilot:</span>
                      {isPlaced || isPreparing ? (
                        <select
                          value={assignedPilot}
                          onChange={(e) =>
                            setAssignedRiders({
                              ...assignedRiders,
                              [order.id]: e.target.value,
                            })
                          }
                          className="bg-[#0c0e0d] border border-[#1c211e] rounded-lg px-2 py-1 text-xs text-[#e5f4eb] focus:border-[#75cf5e] outline-none"
                        >
                          {AVAILABLE_PILOTS.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-[#e5f4eb]">{order.riderName}</span>
                      )}
                    </div>

                    {/* Stage Transition Action Button */}
                    <div>
                      {isPlaced && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Accept &amp; Start Cooking</span>
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderStatus(order.id, 'OUT_FOR_DELIVERY', {
                              riderName: assignedPilot,
                            })
                          }
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                        >
                          <Bike className="w-4 h-4 stroke-[2.5]" />
                          <span>Dispatch Pilot (GPS Live)</span>
                        </button>
                      )}

                      {isOutForDelivery && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Delivered (Gate Handover)</span>
                        </button>
                      )}

                      {isDelivered && (
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#75cf5e]" />
                          <span>Handed Over at Gate</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
