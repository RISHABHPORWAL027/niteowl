'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Bike,
  Building,
  ArrowLeft,
  Moon,
  ChefHat,
  X,
  Lock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { LiveTrackingMap } from './LiveTrackingMap';

interface LiveOrderTrackerProps {
  onBackToMenu: () => void;
}

export function LiveOrderTracker({ onBackToMenu }: LiveOrderTrackerProps) {
  const { activeOrder, orders, updateOrderStatus } = useNiteOwlStore();
  const [showCallModal, setShowCallModal] = useState(false);
  const [dynamicEtaMins, setDynamicEtaMins] = useState<number | null>(null);

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const orderParam = searchParams?.get('order');

  // Resolve target order
  const currentOrder =
    (orderParam
      ? orders.find((o) => o.orderNumber === orderParam || o.id === orderParam)
      : null) ||
    activeOrder ||
    orders.find((o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED') ||
    orders[0];

  if (!currentOrder) {
    return (
      <div className="p-8 text-center text-[#88998f] space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center text-3xl">
          🦉
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">No active midnight order found</h3>
          <p className="text-xs text-gray-500 mt-1">
            Pick your late-night crave from our express kitchen menu.
          </p>
        </div>
        <button
          onClick={onBackToMenu}
          className="mt-2 px-6 py-2.5 rounded-full bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs cursor-pointer shadow-md shadow-[#239a4e]/20 transition-all"
        >
          Explore Midnight Menu
        </button>
      </div>
    );
  }

  const steps = [
    { label: 'Placed', status: 'PLACED', desc: 'Order received at kitchen' },
    { label: 'Kitchen', status: 'PREPARING', desc: 'Piping hot in the wok' },
    { label: 'On Way', status: 'OUT_FOR_DELIVERY', desc: 'Pilot en route on GPS' },
    { label: 'Delivered', status: 'DELIVERED', desc: 'Handed over at gate' },
  ];

  const currentStatusIndex = steps.findIndex(
    (s) => s.status === currentOrder.orderStatus
  );

  const displayEta = dynamicEtaMins ?? currentOrder.estimatedMins ?? 11;
  const riderName = currentOrder.riderName || 'Pilot Suresh (Pilot #12)';

  return (
    <div className="w-full pb-24 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white/95 sticky top-0 z-20 backdrop-blur-xs">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#239a4e] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#239a4e] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {currentOrder.orderNumber}
          </span>
        </div>
      </div>

      {/* Real Interactive Leaflet + Google Tiles Map */}
      <div className="px-4">
        <LiveTrackingMap
          orderStatus={currentOrder.orderStatus}
          landmarkName={currentOrder.addressDetails?.landmark || currentOrder.addressDetails?.hostelPgOrFlat}
          riderName={riderName}
          onProgressUpdate={(prog, mins) => {
            setDynamicEtaMins(mins);
            // If progress is complete, auto-deliver if out for delivery
            if (prog >= 1 && currentOrder.orderStatus === 'OUT_FOR_DELIVERY') {
              updateOrderStatus(currentOrder.id, 'DELIVERED');
            }
          }}
          className="h-72"
        />
      </div>

      {/* ETA and Stepper Card */}
      <div className="px-4 space-y-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  {currentOrder.orderStatus === 'DELIVERED'
                    ? 'Delivered at Gate! 🎉'
                    : currentOrder.orderStatus === 'OUT_FOR_DELIVERY'
                    ? `Arriving in ~${displayEta} mins`
                    : currentOrder.orderStatus === 'PREPARING'
                    ? 'Cooking in Kitchen (~10 mins)'
                    : 'Order Placed (~12 mins)'}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#239a4e]" />
                <span>
                  {currentOrder.orderStatus === 'DELIVERED'
                    ? 'Discreet drop completed. Enjoy your meal!'
                    : currentOrder.orderStatus === 'OUT_FOR_DELIVERY'
                    ? 'Live pilot tracking from Bhawarkua Kitchen'
                    : 'Bhawarkua Central Hub Kitchen preparing'}
                </span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#239a4e] border border-emerald-100 flex items-center justify-center shadow-xs">
              {currentOrder.orderStatus === 'OUT_FOR_DELIVERY' ? (
                <Bike className="w-5 h-5 animate-bounce" />
              ) : currentOrder.orderStatus === 'PREPARING' ? (
                <ChefHat className="w-5 h-5 animate-pulse" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* Stepper with Progress Bar */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-4 gap-1.5">
              {steps.map((s, idx) => {
                const isPassed =
                  idx <= (currentStatusIndex === -1 ? 0 : currentStatusIndex);
                const isCurrent = idx === currentStatusIndex;

                return (
                  <div key={s.label} className="flex flex-col items-center text-center">
                    <div
                      className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                        isPassed ? 'bg-[#239a4e]' : 'bg-gray-200'
                      }`}
                    />
                    <span
                      className={`text-[10px] mt-1.5 font-bold truncate max-w-full ${
                        isCurrent
                          ? 'text-[#239a4e]'
                          : isPassed
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Assigned Pilot & Contact Details Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#239a4e] border border-emerald-200 flex items-center justify-center text-xl shadow-xs">
                🏍️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-gray-900">
                    {riderName}
                  </h4>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-[#239a4e] text-[9px] font-black border border-emerald-200">
                    ⭐ 4.9
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  TVS Ntorq • MP-09-NW-2026
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-emerald-50 text-gray-800 hover:text-[#239a4e] border border-gray-200 hover:border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-[#239a4e]" />
              <span>Call Pilot</span>
            </button>
          </div>

          {/* Privacy & discreet note */}
          <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#239a4e]" />
            <span>
              Secure proxy connection active. Driver never sees your personal number.
            </span>
          </div>
        </div>

        {/* Late Night Delivery Instructions (Drop Point) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-gray-900">
            <span className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[#239a4e]" />
              Late-Night Drop Point
            </span>
            <span className="text-[10px] text-[#239a4e] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Discreet Mode
            </span>
          </div>

          <div className="text-xs text-gray-600 space-y-1.5 bg-[#f8faf9] p-3 rounded-xl border border-gray-100">
            <div className="flex items-start gap-1.5">
              <Building className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 text-xs">
                  {currentOrder.addressDetails.hostelPgOrFlat}
                  {currentOrder.addressDetails.roomNo ? ` (${currentOrder.addressDetails.roomNo})` : ''}
                </p>
                <p className="text-[11px] text-gray-500">
                  {currentOrder.addressDetails.landmark}
                </p>
              </div>
            </div>

            {currentOrder.addressDetails.leaveAtGate && (
              <p className="text-[11px] text-emerald-900 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#239a4e]" />
                Leave parcel with Security Guard at main entrance / gate.
              </p>
            )}

            {currentOrder.addressDetails.silentDelivery && (
              <p className="text-[11px] text-emerald-900 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#239a4e]" />
                Silent drop enabled: Pilot will not ring doorbell or honk.
              </p>
            )}
          </div>
        </div>

        {/* Order Items & Total Recap */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs shadow-xs">
          <div className="flex justify-between items-center text-gray-900 font-bold border-b border-gray-100 pb-2">
            <span>Order Summary ({currentOrder.items.length} items)</span>
            <span className="text-[#239a4e] font-black text-sm">₹{currentOrder.total}</span>
          </div>
          <div className="space-y-1.5">
            {currentOrder.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-gray-600">
                <span className="truncate pr-2">
                  {it.quantity}x {it.name}
                </span>
                <span className="text-gray-900 font-semibold shrink-0">
                  ₹{it.price * it.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Masked Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">100% Masked Pilot Call</h4>
                  <p className="text-[10px] text-gray-400">NiteOwl Cloud Dialer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-[#239a4e] mx-auto flex items-center justify-center text-2xl shadow-inner">
                🏍️
              </div>
              <h5 className="font-black text-gray-900 text-base">{riderName}</h5>
              <p className="text-xs text-gray-500">
                Vehicle: TVS Ntorq • MP-09-NW-2026
              </p>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 text-left">
                <p className="font-semibold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#239a4e]" />
                  Privacy Protection Enabled
                </p>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Connecting through Indore Cloud Proxy: <strong className="font-mono text-emerald-950">+91 731-498-8941</strong>.
                  Your personal mobile number will remain strictly hidden.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <a
                href="tel:+917314988941"
                onClick={() => setShowCallModal(false)}
                className="py-2.5 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#239a4e]/20 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Proxy</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
