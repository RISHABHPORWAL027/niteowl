'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Navigation,
  Plus,
  Home,
  Building,
  Briefcase,
  Pencil,
} from 'lucide-react';
import { useNiteOwlStore, SavedAddress } from '@/store/useNiteOwlStore';
import { AddAddressModal } from './AddAddressModal';

interface ZoneSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZoneSelectorSheet({ isOpen, onClose }: ZoneSelectorSheetProps) {
  const {
    zonesMap,
    currentOutlet,
    currentZone,
    selectedLandmark,
    selectLandmarkManual,
    setZone,
    savedAddresses,
    selectSavedAddress,
    activeAddress,
  } = useNiteOwlStore();

  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  if (!isOpen) return null;

  const currentOutletZones = zonesMap[currentOutlet.id] || [];

  const getAreaLabel = (zoneCode?: string) => {
    switch (zoneCode) {
      case 'ZONE_1':
        return 'Express Delivery Area';
      case 'ZONE_2':
        return 'Standard Delivery Area';
      case 'ZONE_3':
        return 'Extended Delivery Area';
      default:
        return 'Delivery Area';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full max-w-md bg-white border-t border-gray-200 rounded-t-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300"
          role="dialog"
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Select Delivery Location
                </h3>
                <p className="text-xs text-gray-500">
                  Choose your area, landmark, or add a new address
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Bar: GPS Location & Add Address */}
          <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2 shadow-2xs">
            <button
              onClick={() => {
                setEditingAddress(null);
                setIsAddAddressOpen(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-[#239a4e] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Use Current Location</span>
            </button>

            <button
              onClick={() => {
                setEditingAddress(null);
                setIsAddAddressOpen(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add New Address</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#f8faf9]">
            {/* Saved Addresses Section if any */}
            {savedAddresses && savedAddresses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Saved Addresses
                  </span>
                  <span className="text-[10px] text-gray-400">Tap to select</span>
                </div>

                <div className="space-y-2">
                  {savedAddresses.map((addr) => {
                    const isAddrActive =
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
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isAddrActive
                            ? 'bg-white border-[#239a4e] shadow-sm ring-1 ring-[#239a4e]/20'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#239a4e] flex items-center justify-center shrink-0 mt-0.5">
                            {addr.tag === 'Home' && <Home className="w-3.5 h-3.5" />}
                            {addr.tag === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                            {(addr.tag === 'Apartment' || addr.tag === 'Hostel / PG') && <Building className="w-3.5 h-3.5" />}
                            {addr.tag === 'Other' && <MapPin className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-gray-900 truncate">
                                {addr.building || addr.landmark}
                              </p>
                              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold">
                                {addr.tag}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.street}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAddress(addr);
                              setIsAddAddressOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-[#239a4e] border border-transparent hover:border-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit address"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isAddrActive && (
                            <span className="w-5 h-5 rounded-full bg-[#239a4e] text-white flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular Areas & Delivery Coverage */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Delivery Areas &amp; Landmarks
              </span>
              <div className="space-y-3">
          {currentOutletZones.map((zone) => {
            const isSelected = currentZone?.id === zone.id;
            const isPaused = !zone.isActive;

            return (
              <div
                key={zone.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-white border-[#239a4e] shadow-sm ring-1 ring-[#239a4e]/20'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">
                        {getAreaLabel(zone.zoneCode)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Clock className="w-3 h-3 text-[#239a4e]" />
                        {zone.estimatedDeliveryMins} mins ETA
                      </span>
                      <span>•</span>
                      <span className="text-[#239a4e] font-bold">
                        {zone.deliveryFee === 0
                          ? 'FREE Delivery'
                          : `₹${zone.deliveryFee} Delivery`}
                      </span>
                      <span>•</span>
                      <span>Min: ₹{zone.minOrderValue}</span>
                    </div>
                  </div>

                  {isPaused ? (
                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Rush Paused
                    </span>
                  ) : isSelected ? (
                    <span className="w-6 h-6 rounded-full bg-[#239a4e] text-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  ) : (
                    <button
                      onClick={() => setZone(zone.id)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                </div>

                {/* Popular Landmarks in this Area */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">
                    Select your landmark:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {zone.landmarksCovered.map((landmark) => {
                      const isLmActive = selectedLandmark === landmark;
                      return (
                        <button
                          key={landmark}
                          onClick={() => {
                            selectLandmarkManual(landmark);
                            onClose();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isLmActive
                              ? 'bg-[#239a4e] text-white font-bold shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {landmark}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Address Modal with Google Map Pin Picker */}
      <AddAddressModal
        isOpen={isAddAddressOpen}
        addressToEdit={editingAddress}
        onClose={() => {
          setIsAddAddressOpen(false);
          setEditingAddress(null);
        }}
        onAddressSaved={() => {
          setIsAddAddressOpen(false);
          setEditingAddress(null);
          onClose();
        }}
      />
    </>
  );
}
