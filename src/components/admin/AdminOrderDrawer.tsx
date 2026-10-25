'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Clock,
  MapPin,
  Building,
  VolumeX,
  Phone,
  Bike,
  ChefHat,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Navigation,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Send,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/database';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { INITIAL_RIDERS } from '@/lib/mockData';
import { LiveTrackingMap } from '@/components/customer/LiveTrackingMap';

interface AdminOrderDrawerProps {
  order: Order | null;
  onClose: () => void;
}

export function AdminOrderDrawer({ order, onClose }: AdminOrderDrawerProps) {
  const {
    outlets,
    zonesMap,
    updateOrderStatus,
    riders: storeRiders,
    bulkAssignRider,
  } = useNiteOwlStore();
  const availableRiders = storeRiders?.length ? storeRiders : INITIAL_RIDERS;

  const currentAssignedRider = availableRiders.find(
    (r) => r.id === order?.riderId || r.name === order?.riderName
  );

  const [selectedPilotId, setSelectedPilotId] = useState<string>(
    currentAssignedRider?.id || availableRiders[0]?.id || ''
  );
  const [drawerToast, setDrawerToast] = useState<string | null>(null);

  useEffect(() => {
    const matched = availableRiders.find(
      (r) => r.id === order?.riderId || r.name === order?.riderName
    );
    if (matched) {
      setSelectedPilotId(matched.id);
    } else if (availableRiders[0]?.id) {
      setSelectedPilotId(availableRiders[0].id);
    }
  }, [order, availableRiders]);

  if (!order) return null;

  const outlet = outlets.find((o) => o.id === order.outletId);
  const zone = (zonesMap[order.outletId] || []).find((z) => z.id === order.zoneId);

  const isPlaced = order.orderStatus === 'PLACED';
  const isPreparing = order.orderStatus === 'PREPARING';
  const isOutForDelivery = order.orderStatus === 'OUT_FOR_DELIVERY';
  const isDelivered = order.orderStatus === 'DELIVERED';

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative z-[10000] w-full max-w-md bg-[#151917] border-l border-[#1c211e] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-[#e5f4eb]">
        {/* Header */}
        <div className="p-4 border-b border-[#1c211e] flex items-center justify-between bg-[#111413]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-[#75cf5e]">
                {order.orderNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
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
            <p className="text-[10px] text-[#88998f] mt-0.5">
              Placed at {formatDateTime(order.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c211e] text-[#88998f] hover:text-[#e5f4eb] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Hub & Zone Badge */}
          <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-[#88998f] block">Dispatch Hub</span>
              <span className="font-bold text-[#e5f4eb]">{outlet?.name || 'Hub'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#88998f] block">Coverage Zone</span>
              <span className="font-bold text-[#75cf5e]">{zone?.name || 'Zone 1'}</span>
            </div>
          </div>

          {/* Customer Drop Point */}
          <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-2 text-xs">
            <h4 className="text-[10px] font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#75cf5e]" />
              <span>Customer Drop Details</span>
            </h4>

            <div className="space-y-1">
              <p className="font-bold text-[#e5f4eb] text-sm">
                {order.customerName}
                <span className="text-xs font-normal text-[#88998f] ml-2 font-mono">
                  {order.customerPhone}
                </span>
              </p>
              <p className="text-xs text-gray-300">
                <strong>Building / Flat:</strong> {order.addressDetails.hostelPgOrFlat}
                {order.addressDetails.roomNo ? ` (${order.addressDetails.roomNo})` : ''}
              </p>
              <p className="text-[11px] text-[#88998f]">
                <strong>Landmark:</strong> {order.addressDetails.landmark}
              </p>
            </div>

            {/* Delivery Directives */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {order.addressDetails.leaveAtGate && (
                <span className="px-2 py-0.5 rounded-md bg-[#151917] text-[#75cf5e] border border-[#239a4e]/40 text-[10px] font-semibold flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>Gate / Guard Drop</span>
                </span>
              )}
              {order.addressDetails.silentDelivery && (
                <span className="px-2 py-0.5 rounded-md bg-[#151917] text-[#75cf5e] border border-[#239a4e]/40 text-[10px] font-semibold flex items-center gap-1">
                  <VolumeX className="w-3 h-3" />
                  <span>Silent (No Honk/Bell)</span>
                </span>
              )}
              {order.addressDetails.maskedCall && (
                <span className="px-2 py-0.5 rounded-md bg-[#151917] text-[#75cf5e] border border-[#239a4e]/40 text-[10px] font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>Masked Proxy Active</span>
                </span>
              )}
            </div>

            {order.addressDetails.riderNotes && (
              <p className="text-[11px] text-amber-300/90 italic bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                &quot;{order.addressDetails.riderNotes}&quot;
              </p>
            )}
          </div>

          {/* Live Delivery Route Map */}
          <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#e5f4eb] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#75cf5e]" />
                Live Delivery Route GPS
              </span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=22.6926,75.8676&destination=${encodeURIComponent(
                  `${order.addressDetails.hostelPgOrFlat} ${order.addressDetails.landmark}, Indore`
                )}&travelmode=two-wheeler`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#75cf5e] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#1c211e]">
              <LiveTrackingMap
                orderStatus={order.orderStatus}
                landmarkName={order.addressDetails.landmark || order.addressDetails.hostelPgOrFlat}
                riderName={order.riderName || 'Pilot'}
                className="h-56"
              />
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-2 text-xs">
            <h4 className="text-[10px] font-bold text-[#88998f] uppercase tracking-wider">
              Items Ordered ({order.items.length})
            </h4>

            <div className="space-y-1.5 divide-y divide-[#1c211e]">
              {order.items.map((it, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#e5f4eb]">
                      {it.quantity}x {it.name}
                    </span>
                    {it.customization && (
                      <span className="text-[10px] text-[#88998f] block">
                        ({it.customization})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-[#e5f4eb]">
                    ₹{it.price * it.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-2 border-t border-[#1c211e] space-y-1 text-[11px] text-[#88998f]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-[#75cf5e]">
                  {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Packaging Fee</span>
                <span>₹{order.packagingFee}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[#75cf5e]">
                  <span>Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#e5f4eb] pt-1 border-t border-[#1c211e]">
                <span>Total Paid (UPI)</span>
                <span className="text-[#75cf5e]">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Drawer Toast Feedback */}
          {drawerToast && (
            <div className="p-2.5 rounded-xl bg-[#75cf5e] text-[#0c0e0d] font-black text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{drawerToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerToast(null)}
                className="p-0.5 hover:opacity-75 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pilot Assignment & Stage Advance */}
          <div className="p-3.5 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-3 text-xs">
            <h4 className="text-[10px] font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-[#75cf5e]" />
              <span>Pilot Assignment &amp; Dispatch</span>
            </h4>

            {/* Currently Assigned Display */}
            {currentAssignedRider ? (
              <div className="p-2.5 rounded-xl bg-[#151917] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#88998f] font-bold uppercase block">
                    Current Assigned Pilot
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-xs text-[#75cf5e]">
                      {currentAssignedRider.name}
                    </span>
                    <span className="text-[10px] text-[#88998f]">
                      • {currentAssignedRider.vehicle}
                    </span>
                  </div>
                </div>
                {currentAssignedRider.phone && (
                  <a
                    href={`tel:${currentAssignedRider.phone}`}
                    className="p-1.5 rounded-lg bg-[#0c0e0d] hover:bg-[#1f2421] text-[#75cf5e] border border-[#1c211e] transition-colors"
                    title={`Call ${currentAssignedRider.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <p className="font-bold">No Pilot Assigned</p>
                  <p className="text-amber-300/80">
                    Which rider will take this order is required before dispatching.
                  </p>
                </div>
              </div>
            )}

            {/* Change / Reassign Dropdown Controls */}
            {!isDelivered && order.orderStatus !== 'CANCELLED' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#88998f] font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>{currentAssignedRider ? 'Wrong Pilot? Reassign to:' : 'Select Delivery Pilot:'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPilotId}
                    onChange={(e) => setSelectedPilotId(e.target.value)}
                    className="flex-1 bg-[#151917] border border-[#1c211e] focus:border-[#75cf5e] rounded-lg px-2.5 py-1.5 text-xs text-[#e5f4eb] outline-none cursor-pointer"
                  >
                    {availableRiders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.id === currentAssignedRider?.id ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (!order || !selectedPilotId) return;
                      const targetPilot = availableRiders.find((r) => r.id === selectedPilotId);
                      if (!targetPilot) return;

                      bulkAssignRider([order.id], targetPilot.id);
                      setDrawerToast(`⚡ Reassigned to ${targetPilot.name}!`);
                      setTimeout(() => setDrawerToast(null), 3500);
                    }}
                    disabled={selectedPilotId === currentAssignedRider?.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      selectedPilotId !== currentAssignedRider?.id
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#0c0e0d] shadow-xs active:scale-95'
                        : 'bg-[#151917] text-[#88998f]/40 border border-[#1c211e] cursor-not-allowed'
                    }`}
                  >
                    {currentAssignedRider ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Progression */}
            <div className="pt-2 border-t border-[#1c211e] space-y-2">
              {isPlaced && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Accept &amp; Start Cooking</span>
                </button>
              )}

              {isPreparing && (
                currentAssignedRider ? (
                  <button
                    type="button"
                    onClick={() => {
                      bulkAssignRider([order.id], currentAssignedRider.id, {
                        updateStatus: 'OUT_FOR_DELIVERY',
                      });
                      setDrawerToast(`⚡ Dispatched with ${currentAssignedRider.name}!`);
                      setTimeout(() => setDrawerToast(null), 3500);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Dispatch with {currentAssignedRider.name} (GPS Live)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedPilotId) {
                        alert('Please select which pilot will take this order before dispatching.');
                        return;
                      }
                      const targetPilot = availableRiders.find((r) => r.id === selectedPilotId);
                      if (!targetPilot) return;

                      bulkAssignRider([order.id], targetPilot.id, {
                        updateStatus: 'OUT_FOR_DELIVERY',
                      });
                      setDrawerToast(`⚡ Dispatched with ${targetPilot.name}!`);
                      setTimeout(() => setDrawerToast(null), 3500);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 animate-pulse"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Assign Pilot &amp; Dispatch (GPS Live)</span>
                  </button>
                )
              )}

              {isOutForDelivery && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Delivered (Handover Done)</span>
                </button>
              )}

              {isDelivered && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-[#239a4e]/40 text-[#75cf5e] text-center font-bold text-xs flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Order Completed &amp; Delivered</span>
                </div>
              )}
            </div>

            {/* Track on Live GPS Map Link */}
            <div className="pt-1">
              <Link
                href={`/track?order=${order.orderNumber}`}
                target="_blank"
                className="w-full py-2 rounded-xl bg-[#151917] hover:bg-[#1f2421] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Customer GPS Tracker</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
