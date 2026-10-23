'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

interface CartFloatingBannerProps {
  onOpenCheckout: () => void;
}

export function CartFloatingBanner({ onOpenCheckout }: CartFloatingBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    currentZone,
    getCartSubtotal,
    getDeliveryFee,
    getMinOrderValue,
    isMinOrderMet,
    getRemainingForMinOrder,
    getCartItemCount,
  } = useNiteOwlStore();

  const count = getCartItemCount();
  if (count === 0) return null;

  const subtotal = getCartSubtotal();
  const minOrderValue = getMinOrderValue();
  const isMet = isMinOrderMet();
  const remaining = getRemainingForMinOrder();
  const deliveryFee = getDeliveryFee();

  // Progress percentage toward min order threshold (e.g. ₹89)
  const progressPercent = Math.min(100, Math.round((subtotal / minOrderValue) * 100));

  // 1. Collapsed state: Small compact button
  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
        <button
          onClick={() => setIsExpanded(true)}
          className="pointer-events-auto px-4 py-2.5 rounded-full bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs shadow-xl shadow-[#239a4e]/30 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer ring-2 ring-[#75cf5e]/40 animate-in fade-in zoom-in-95 duration-200"
          aria-label="View Cart and Order Status"
        >
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span className="bg-white/20 text-white font-black text-[11px] px-1.5 py-0.5 rounded-full min-w-4 text-center leading-none">
              {count}
            </span>
          </div>
          <span className="text-white/40">•</span>
          <span className="font-extrabold text-sm">₹{subtotal}</span>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-100 bg-white/15 px-2 py-0.5 rounded-full">
            <span>View Cart</span>
            <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </button>
      </div>
    );
  }

  // 2. Expanded state: Full card banner with threshold bar, delivery speed, subtotal, and checkout
  return (
    <>
      {/* Subtle backdrop to dismiss when clicking outside */}
      <div
        className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] transition-opacity"
        onClick={() => setIsExpanded(false)}
      />

      <div className="fixed bottom-6 left-0 right-0 z-40 px-3 max-w-md mx-auto pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="pointer-events-auto bg-white/95 border border-gray-200 backdrop-blur-xl text-gray-900 rounded-2xl shadow-2xl p-3 space-y-2 ring-1 ring-black/5">
          {/* Dynamic Threshold Bar + Minimize Action */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              {!isMet ? (
                <span className="text-gray-800 font-semibold flex items-center gap-1 truncate pr-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#239a4e] shrink-0" />
                  Add ₹{remaining} more to reach min. order of ₹{minOrderValue}
                </span>
              ) : (
                <span className="text-[#239a4e] font-bold flex items-center gap-1 truncate pr-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#239a4e] shrink-0" />
                  Min. order unlocked! {deliveryFee === 0 ? '🎉 Free Delivery' : `Delivery: ₹${deliveryFee}`}
                </span>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-400 font-mono text-[10px]">
                  ₹{subtotal}/₹{minOrderValue}
                </span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 -mr-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Micro Progress Track */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isMet ? 'bg-[#75cf5e]' : 'bg-[#239a4e]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Floating Cart Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col pl-1">
              <span className="text-[10px] text-gray-500 font-medium">
                ⚡ Express Delivery • ~{currentZone?.estimatedDeliveryMins || 15} Mins
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-gray-900">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm font-black text-[#239a4e]">
                  ₹{subtotal}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsExpanded(false);
                onOpenCheckout();
              }}
              disabled={!isMet || !currentZone?.isActive}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                !currentZone?.isActive
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isMet
                  ? 'bg-[#239a4e] hover:bg-[#1d8242] text-white shadow-[#239a4e]/20 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>
                {!currentZone?.isActive
                  ? 'Area Paused'
                  : isMet
                  ? 'Checkout'
                  : `Add ₹${remaining}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
