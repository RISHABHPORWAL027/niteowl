'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/database';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { INITIAL_RIDERS } from '@/lib/mockData';

interface AdminOrderDrawerProps {
  order: Order | null;
  onClose: () => void;
}

export function AdminOrderDrawer({ order, onClose }: AdminOrderDrawerProps) {
  const { outlets, zonesMap, updateOrderStatus, riders: storeRiders } = useNiteOwlStore();
  const availableRiders = storeRiders?.length ? storeRiders : INITIAL_RIDERS;

  const [selectedPilot, setSelectedPilot] = useState<string>(
    order?.riderName && order.riderName !== 'Assigning pilot...'
      ? order.riderName
      : availableRiders[0]?.name || 'Pilot Suresh'
  );

  React.useEffect(() => {
    if (order?.riderName && order.riderName !== 'Assigning pilot...') {
      setSelectedPilot(order.riderName);
    } else if (availableRiders[0]?.name) {
      setSelectedPilot(availableRiders[0].name);
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#151917] border-l border-[#1c211e] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-[#e5f4eb]">
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

          {/* Pilot Assignment & Stage Advance */}
          <div className="p-3 bg-[#0c0e0d] rounded-xl border border-[#1c211e] space-y-3 text-xs">
            <h4 className="text-[10px] font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-[#75cf5e]" />
              <span>Pilot Assignment &amp; Dispatch</span>
            </h4>

            <div className="flex items-center gap-2">
              <span className="text-[#88998f] text-xs">Assign:</span>
              <select
                value={selectedPilot}
                onChange={(e) => setSelectedPilot(e.target.value)}
                className="flex-1 bg-[#151917] border border-[#1c211e] focus:border-[#75cf5e] rounded-lg px-2.5 py-1.5 text-xs text-[#e5f4eb] outline-none cursor-pointer"
              >
                {availableRiders.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Progression */}
            <div className="pt-1">
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
                <button
                  type="button"
                  onClick={() =>
                    updateOrderStatus(order.id, 'OUT_FOR_DELIVERY', {
                      riderName: selectedPilot,
                    })
                  }
                  className="w-full py-2.5 rounded-xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                >
                  <Bike className="w-4 h-4 stroke-[2.5]" />
                  <span>Dispatch Pilot (GPS Live)</span>
                </button>
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
