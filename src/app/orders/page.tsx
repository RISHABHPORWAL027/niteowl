'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Receipt,
  Bike,
  CheckCircle2,
  MapPin,
  ChevronRight,
  RefreshCw,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

export default function OrderHistoryPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  const {
    orders,
    customerUser,
    isCustomerAuthenticated,
    reorderItems,
    setActiveOrder,
  } = useNiteOwlStore();

  useEffect(() => {
    setIsMounted(true);
    if (!isCustomerAuthenticated) {
      router.replace('/login?redirect=/orders');
    }
  }, [isCustomerAuthenticated, router]);

  if (!isMounted || !isCustomerAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-2xl animate-pulse">
            🦉
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#239a4e] rounded-full animate-spin" />
            <span>Loading order history...</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter orders for the currently authenticated customer
  const userPhoneDigits = customerUser?.phoneNumber?.replace(/\D/g, '') || '';
  const userOrders = orders.filter((o) => {
    if (!customerUser) return false;
    if (userPhoneDigits && o.customerPhone) {
      const oPhone = o.customerPhone.replace(/\D/g, '');
      if (
        oPhone &&
        (oPhone === userPhoneDigits ||
          userPhoneDigits.endsWith(oPhone) ||
          oPhone.endsWith(userPhoneDigits))
      ) {
        return true;
      }
    }
    if (customerUser.displayName && o.customerName === customerUser.displayName) {
      return true;
    }
    return false;
  });

  const handleReorder = (orderId: string, items: any[]) => {
    reorderItems(items);
    setReorderedId(orderId);
    setTimeout(() => {
      setReorderedId(null);
      router.push('/');
    }, 800);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent order';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#111827] flex flex-col font-sans selection:bg-[#75cf5e] selection:text-[#0c0e0d]">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-[#f8faf9] border-x border-gray-200/80 shadow-md relative min-h-screen pb-12">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Back to diner"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-extrabold text-gray-900 text-base leading-tight">
                Order History
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">
                NiteOwl Midnight Diner
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#239a4e] border border-emerald-200 text-xs font-bold">
            {userOrders.length} {userOrders.length === 1 ? 'Order' : 'Orders'}
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 flex-1 flex flex-col">
          {userOrders.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-[#239a4e] border border-emerald-200/80 flex items-center justify-center shadow-sm">
                  <Receipt className="w-10 h-10 stroke-[1.75]" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-xs">
                  🌙
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  No Orders Placed Yet
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Looks like you haven&apos;t placed any midnight cravings orders yet.
                  Hot food delivered right to your door in ~15 minutes!
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="mt-2 px-6 py-3 rounded-full bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs shadow-lg shadow-[#239a4e]/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4 stroke-[2.5]" />
                <span>Explore Midnight Menu</span>
              </button>
            </div>
          ) : (
            /* ORDERS LIST */
            <div className="space-y-4">
              {userOrders.map((order) => {
                const isDelivered = order.orderStatus === 'DELIVERED';
                const isPreparing =
                  order.orderStatus === 'PREPARING' ||
                  order.orderStatus === 'PLACED';
                const isOutForDelivery =
                  order.orderStatus === 'OUT_FOR_DELIVERY';
                const isCancelled = order.orderStatus === 'CANCELLED';
                const isReordered = reorderedId === order.id;

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3.5 shadow-xs hover:border-gray-300 transition-all"
                  >
                    {/* Order Card Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-gray-900">
                            {order.orderNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(order.createdAt)}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isOutForDelivery
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isPreparing
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : isCancelled
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Address details */}
                    {order.addressDetails && (
                      <div className="text-xs text-gray-600 flex items-start gap-1.5 bg-[#f8faf9] p-2.5 rounded-xl border border-gray-100">
                        <MapPin className="w-3.5 h-3.5 text-[#239a4e] shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-tight truncate">
                          <span className="font-semibold text-gray-900">
                            {order.addressDetails.hostelPgOrFlat}
                          </span>
                          {order.addressDetails.roomNo && (
                            <span className="text-gray-500">
                              {' '}
                              ({order.addressDetails.roomNo})
                            </span>
                          )}
                          <p className="text-gray-400 truncate mt-0.5">
                            {order.addressDetails.landmark}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-1.5 pt-0.5">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className={`w-2 h-2 rounded-xs shrink-0 ${
                                item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            />
                            <span className="text-gray-800 font-medium truncate">
                              {item.name}
                            </span>
                            {item.customization && (
                              <span className="text-[10px] text-gray-400 shrink-0">
                                ({item.customization})
                              </span>
                            )}
                          </div>
                          <div className="text-right text-gray-700 font-semibold shrink-0">
                            {item.quantity} × ₹{item.price}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          Total Paid
                        </span>
                        <span className="font-black text-gray-900 text-sm">
                          ₹{order.total}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDelivered && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveOrder(order);
                              router.push('/track');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-[#239a4e] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Bike className="w-3.5 h-3.5" />
                            <span>Track</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleReorder(order.id, order.items)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isReordered
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#239a4e] hover:bg-[#1d8242] text-white shadow-xs'
                          }`}
                        >
                          {isReordered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Added to Cart!</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reorder</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
