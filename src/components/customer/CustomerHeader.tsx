'use client';

import React from 'react';
import { MapPin, ChevronDown, Clock, ShieldAlert, User } from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

interface CustomerHeaderProps {
  onOpenZoneDrawer: () => void;
  onOpenProfile: () => void;
}

export function CustomerHeader({
  onOpenZoneDrawer,
  onOpenProfile,
}: CustomerHeaderProps) {
  const {
    currentZone,
    selectedLandmark,
    isOutOfDelivery,
    customerUser,
  } = useNiteOwlStore();

  const isZonePaused = !currentZone?.isActive;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      {/* Rush Notice Banner if outer area is paused */}
      {isZonePaused && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate font-medium">
              Delivery temporarily paused for this area due to midnight rush.
            </span>
          </div>
          <button
            onClick={onOpenZoneDrawer}
            className="text-amber-700 underline font-semibold shrink-0 ml-2 cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      {/* Out of Delivery Alert */}
      {isOutOfDelivery && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-1.5 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="truncate font-medium">
              Outside our current delivery area tonight.
            </span>
          </div>
          <button
            onClick={onOpenZoneDrawer}
            className="text-red-700 underline font-semibold shrink-0 ml-2 cursor-pointer"
          >
            Select Location
          </button>
        </div>
      )}

      <div className="h-16 px-4 flex items-center justify-between gap-3 max-w-md mx-auto">
        {/* Location Selector Trigger (No internal zone/hub jargon) */}
        <button
          onClick={onOpenZoneDrawer}
          className="flex flex-col min-w-0 flex-1 text-left group transition-all cursor-pointer"
          aria-label="Select Delivery Location"
        >
          <div className="flex items-center gap-1.5 text-[#239a4e] font-semibold text-sm leading-none">
            <MapPin className="w-4 h-4 shrink-0 text-[#239a4e] group-hover:scale-110 transition-transform" />
            <span className="truncate text-gray-900 font-bold text-sm tracking-tight">
              {selectedLandmark}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="truncate text-[11px] text-gray-500 font-medium">
              Indore
            </span>
            <span className="text-[10px] text-gray-300">•</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isZonePaused
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isZonePaused ? 'Paused' : `${currentZone?.estimatedDeliveryMins || 15} mins`}
            </span>
          </div>
        </button>

        {/* Operating Hours & Profile Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Open till 4 AM
            </span>
            <span className="text-[9px] text-gray-400">7 PM - 4 AM</span>
          </div>

          {/* Profile Trigger Button */}
          <button
            onClick={onOpenProfile}
            aria-label="Open Profile"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center shadow-xs transition-all cursor-pointer overflow-hidden"
          >
            {customerUser?.photoURL ? (
              <img
                src={customerUser.photoURL}
                alt={customerUser.displayName || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : customerUser?.displayName ? (
              <span className="text-[#239a4e] font-black text-xs">
                {customerUser.displayName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
