'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Bike,
  ChevronRight,
  LogOut,
  Pencil,
  Plus,
  Clock,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { useNiteOwlStore, SavedAddress } from '@/store/useNiteOwlStore';
import { logOut } from '@/lib/firebase';
import { AddAddressModal } from './AddAddressModal';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: () => void;
}

export function ProfileDrawer({
  isOpen,
  onClose,
  onTrackOrder,
}: ProfileDrawerProps) {
  const router = useRouter();
  const {
    selectedLandmark,
    activeOrder,
    orders,
    customerUser,
    customerLogout,
    savedAddresses,
    selectSavedAddress,
    activeAddress,
    reorderItems,
  } = useNiteOwlStore();

  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (e) {
      // ignore
    }
    customerLogout();
    onClose();
    router.replace('/login');
  };

  const displayName = customerUser?.displayName || 'Midnight Diner Member';
  const contactText = customerUser?.email || customerUser?.phoneNumber || '';

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

  const isUserActiveOrder =
    activeOrder &&
    activeOrder.orderStatus !== 'DELIVERED' &&
    (!customerUser?.phoneNumber ||
      activeOrder.customerPhone
        .replace(/\D/g, '')
        .endsWith(customerUser.phoneNumber.replace(/\D/g, '').slice(-10)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-t border-gray-200 rounded-t-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-[#239a4e] font-black flex items-center justify-center overflow-hidden border border-emerald-200">
              {customerUser?.photoURL ? (
                <img
                  src={customerUser.photoURL}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#239a4e] font-black text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                Customer Profile
              </h3>
              <p className="text-xs text-gray-500">NiteOwl Midnight Diner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#f8faf9]">
          {/* User Info Card */}
          <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-gray-900 text-base">{displayName}</h4>
                {contactText && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                    {customerUser?.email ? (
                      <Mail className="w-3 h-3 text-[#239a4e] shrink-0" />
                    ) : (
                      <Phone className="w-3 h-3 text-[#239a4e] shrink-0" />
                    )}
                    <span className="truncate">{contactText}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Delivery Area:</span>
              <span className="font-bold text-gray-900">
                Bhawarkua, Indore
              </span>
            </div>
          </div>

          {/* Active Order Shortcut if available */}
          {isUserActiveOrder && activeOrder && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-[#239a4e] animate-bounce" />
                  Active Order in Flight
                </span>
                <span className="font-mono text-xs font-bold text-[#239a4e] bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                  {activeOrder.orderNumber}
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Status: <strong className="text-emerald-950">{activeOrder.orderStatus.replace(/_/g, ' ')}</strong> (~{activeOrder.estimatedMins} mins ETA)
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/track');
                }}
                className="w-full py-2.5 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Track Live Delivery GPS</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Order History Section */}
          <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#239a4e]" />
                Order History
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/orders');
                }}
                className="text-[11px] font-bold text-[#239a4e] hover:text-[#1d8242] flex items-center gap-0.5 cursor-pointer"
              >
                <span>{userOrders.length > 0 ? `View All (${userOrders.length})` : 'Order Page'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {userOrders.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2 bg-[#f8faf9] rounded-xl border border-dashed border-gray-200">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">No Orders Yet</p>
                  <p className="text-[11px] text-gray-500 max-w-[220px] mx-auto mt-0.5">
                    Looks like you haven&apos;t placed any midnight orders yet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    const el = document.getElementById('menu-items-feed');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="mt-1 px-4 py-1.5 rounded-full bg-[#239a4e] hover:bg-[#1d8242] text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                >
                  <span>Explore Menu</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userOrders.slice(0, 3).map((ord) => {
                  const isDelivered = ord.orderStatus === 'DELIVERED';
                  const isPreparing =
                    ord.orderStatus === 'PREPARING' ||
                    ord.orderStatus === 'PLACED';
                  return (
                    <div
                      key={ord.id}
                      className="p-3 rounded-xl border border-gray-100 bg-[#f8faf9] hover:bg-gray-50/80 transition-colors space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900 text-[11px]">
                          {ord.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPreparing
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ord.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 line-clamp-1">
                        {ord.items
                          .map((it) => `${it.quantity}x ${it.name}`)
                          .join(', ')}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                        <span className="font-bold text-gray-900">
                          ₹{ord.total}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              reorderItems(ord.items);
                              onClose();
                            }}
                            className="font-bold text-[#239a4e] hover:underline cursor-pointer"
                          >
                            Reorder
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push('/orders');
                            }}
                            className="text-gray-500 hover:text-gray-800 cursor-pointer"
                          >
                            Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saved Addresses */}
          <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#239a4e]" />
                Saved Delivery Addresses
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setIsAddressModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-[#239a4e] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>
            <div className="space-y-2">
              {savedAddresses.map((addr) => {
                const isActive =
                  activeAddress?.id === addr.id ||
                  selectedLandmark === addr.building ||
                  selectedLandmark === addr.landmark;

                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      selectSavedAddress(addr.id);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-emerald-50/50 border-[#239a4e]'
                        : 'bg-[#f8faf9] border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {addr.building || addr.landmark}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.street}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold shadow-2xs">
                        {addr.tag}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(addr);
                          setIsAddressModalOpen(true);
                        }}
                        className="w-6 h-6 rounded-md hover:bg-emerald-50 text-gray-400 hover:text-[#239a4e] flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit address"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store Hub Ops Access */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/admin');
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#0c0e0d] hover:bg-[#1a201c] text-[#75cf5e] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <span>🦉 Kitchen Hub Dispatch Console</span>
            </button>
          </div>

          {/* Customer Sign Out */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-2xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50/60 text-red-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <AddAddressModal
        isOpen={isAddressModalOpen}
        addressToEdit={editingAddress}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onAddressSaved={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
      />
    </div>
  );
}
