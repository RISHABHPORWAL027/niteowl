'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Building,
  Home,
  Briefcase,
  Check,
  AlertCircle,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useNiteOwlStore, SavedAddress } from '@/store/useNiteOwlStore';
import { calculateDistanceKm, formatDistance } from '@/lib/geometry';
import { GoogleMapPicker } from './GoogleMapPicker';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSaved?: () => void;
  addressToEdit?: SavedAddress | null;
}

export function AddAddressModal({
  isOpen,
  onClose,
  onAddressSaved,
  addressToEdit,
}: AddAddressModalProps) {
  const {
    currentOutlet,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
  } = useNiteOwlStore();

  const isEditMode = Boolean(addressToEdit);

  // Pin coordinates (default centered around Bhawarkua, Indore: 22.6938, 75.8654)
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: 22.6938,
    lng: 75.8654,
  });

  // UI state: Map is initially hidden when adding new address, or open when editing
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  // Form Fields
  const [tag, setTag] = useState<'Home' | 'Work' | 'Apartment' | 'Other'>('Home');
  const [houseNo, setHouseNo] = useState('');
  const [building, setBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Compute live distance from Bhawarkua Hub
  const distanceKm = calculateDistanceKm(
    currentOutlet.lat,
    currentOutlet.lng,
    pinCoords.lat,
    pinCoords.lng
  );

  // Initialize or reset view whenever modal opens or addressToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        // Edit Mode: Prefill existing data and show the Google Map immediately
        const initialTag = addressToEdit.tag === 'Hostel / PG' ? 'Apartment' : (addressToEdit.tag || 'Home');
        setTag(initialTag as 'Home' | 'Work' | 'Apartment' | 'Other');
        setHouseNo(addressToEdit.houseNo || '');
        setBuilding(addressToEdit.building || '');
        setStreet(addressToEdit.street || '');
        setLandmark(addressToEdit.landmark || '');
        setPinCoords({
          lat: addressToEdit.lat || 22.6938,
          lng: addressToEdit.lng || 75.8654,
        });
      } else {
        // Add Mode: Hide map initially, wait for user to click Select Current Location
        setShowMap(false);
        setHouseNo('');
        setBuilding('');
        setStreet('');
        setLandmark('');
        setTag('Home');
        setPinCoords({ lat: 22.6938, lng: 75.8654 });
      }
      setIsLocating(false);
      setIsGeocoding(false);
      setLocationError(null);
      setFormError(null);
      setAutoFilled(false);
    }
  }, [isOpen, addressToEdit]);

  // Reverse Geocoding helper using /api/maps/geocode endpoint
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/maps/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.street) {
            setStreet(data.street);
          }
          if (data.area) {
            setLandmark(data.area);
          } else if (data.street) {
            setLandmark(data.street);
          }
          if (data.building && (!building || building === 'Maa Gayatri PG' || building === 'Shree Krishna Heights')) {
            setBuilding(data.building);
          }
          setAutoFilled(true);
          setTimeout(() => setAutoFilled(false), 4500);
        }
      }
    } catch (err) {
      console.warn('Geocoding fetch error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Triggered when user clicks "Select Current Location"
  const handleSelectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Map opened at Bhawarkua.');
      setShowMap(true);
      reverseGeocode(pinCoords.lat, pinCoords.lng);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = {
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
        };
        setPinCoords(coords);
        setShowMap(true);
        setIsLocating(false);
        await reverseGeocode(coords.lat, coords.lng);
      },
      async (err) => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Map opened at Bhawarkua hub so you can pick your spot.'
            : 'Unable to pinpoint exact GPS. Map opened at Bhawarkua hub.'
        );
        setShowMap(true);
        await reverseGeocode(pinCoords.lat, pinCoords.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Callback when user drags marker or clicks on the map
  const handleLocationChange = (newLat: number, newLng: number) => {
    setPinCoords({ lat: newLat, lng: newLng });
    reverseGeocode(newLat, newLng);
  };

  const handleSaveAddress = () => {
    if (!houseNo.trim()) {
      setFormError('Please enter your House / Flat / Floor Number.');
      return;
    }
    if (!building.trim()) {
      setFormError('Please enter your Building, Apartment, or House name.');
      return;
    }
    if (!street.trim()) {
      setFormError('Please enter your Street / Landmark details.');
      return;
    }

    const formattedAddress = `${houseNo.trim()}, ${building.trim()}, ${street.trim()}, Indore`;

    if (isEditMode && addressToEdit) {
      updateSavedAddress(addressToEdit.id, {
        tag,
        houseNo: houseNo.trim(),
        building: building.trim(),
        street: street.trim(),
        landmark: landmark.trim() || street.trim(),
        lat: pinCoords.lat,
        lng: pinCoords.lng,
        formattedAddress,
      });
    } else {
      addSavedAddress({
        tag,
        houseNo: houseNo.trim(),
        building: building.trim(),
        street: street.trim(),
        landmark: landmark.trim() || street.trim(),
        lat: pinCoords.lat,
        lng: pinCoords.lng,
        formattedAddress,
      });
    }

    onClose();
    if (onAddressSaved) onAddressSaved();
  };

  const handleDeleteAddress = () => {
    if (addressToEdit) {
      deleteSavedAddress(addressToEdit.id);
      onClose();
      if (onAddressSaved) onAddressSaved();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border-t border-gray-200 rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center">
              {isEditMode ? <Pencil className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {isEditMode ? 'Edit Delivery Location' : 'Add Delivery Location'}
              </h3>
              <p className="text-xs text-gray-500">
                {isEditMode
                  ? 'Adjust your pin on Google Map & update house details'
                  : 'Pin your location on Google Map & enter house details'}
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

        {/* Scrollable Form Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#f8faf9]">
          {/* STEP 1: If map is NOT open, only show the Select Current Location action card */}
          {!showMap ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center shrink-0 ring-4 ring-emerald-50/60">
                  <Navigation className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900">
                    Find Exact Delivery Location
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Tap below to detect your current location via Google Map and auto-fill your delivery details.
                  </p>
                </div>
              </div>

              {locationError && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* Primary Select Current Location Button */}
              <button
                type="button"
                onClick={handleSelectCurrentLocation}
                disabled={isLocating}
                className="w-full py-3 px-4 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#239a4e]/20 transition-all cursor-pointer active:scale-98"
              >
                {isLocating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 stroke-[2.5]" />
                    <span>Select Current Location</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowMap(true);
                    reverseGeocode(pinCoords.lat, pinCoords.lng);
                  }}
                  className="font-semibold text-gray-500 hover:text-gray-900 underline underline-offset-2 cursor-pointer"
                >
                  or open map to pick manually
                </button>
                <span className="text-[10px] text-gray-400">GPS Auto-Fill</span>
              </div>
            </div>
          ) : (
            /* STEP 2: When map is opened after clicking Select Current Location or when Editing */
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs space-y-2.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#239a4e]" />
                  Google Map Pinpoint
                </span>
                <button
                  type="button"
                  onClick={handleSelectCurrentLocation}
                  disabled={isLocating}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-[#239a4e] font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isLocating ? (
                    <span className="w-3 h-3 border-2 border-[#239a4e] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3 stroke-[2.5]" />
                  )}
                  <span>{isLocating ? 'Detecting...' : 'Recenter GPS'}</span>
                </button>
              </div>

              {locationError && (
                <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {locationError}
                </p>
              )}

              {/* Interactive Google Map with live Pin & Draggable Marker */}
              <div className="relative">
                <GoogleMapPicker
                  lat={pinCoords.lat}
                  lng={pinCoords.lng}
                  onLocationChange={handleLocationChange}
                  className="h-56"
                />

                {/* Live Floating Location Pill */}
                <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 flex items-center justify-between text-[11px] shadow-xs z-20 pointer-events-none">
                  <div className="truncate pr-2">
                    <p className="font-bold text-gray-900 truncate">
                      📍 {street || 'Selected Location'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Indore • {formatDistance(distanceKm)} from kitchen
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-[#239a4e] font-bold text-[10px] rounded-full border border-emerald-200">
                    {distanceKm < 0.8 ? '⚡ Express (~12m)' : 'Standard (~18m)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Address Details Form (Auto-filled below from Google Map) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-xs font-bold text-gray-900">
                Address Details
              </h4>
              {autoFilled && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#239a4e] text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3 text-[#239a4e]" />
                  <span>Auto-filled from Google Map</span>
                </span>
              )}
              {isGeocoding && (
                <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                  <span className="w-2.5 h-2.5 border-2 border-[#239a4e] border-t-transparent rounded-full animate-spin" />
                  <span>Fetching address...</span>
                </span>
              )}
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {formError}
              </p>
            )}

            {/* Address Tag Selector */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                Save Address As:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Home', 'Work', 'Apartment', 'Other'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      tag === t
                        ? 'bg-[#239a4e] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t === 'Home' && <Home className="w-3 h-3" />}
                    {t === 'Work' && <Briefcase className="w-3 h-3" />}
                    {t === 'Apartment' && <Building className="w-3 h-3" />}
                    {t === 'Other' && <MapPin className="w-3 h-3" />}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* House / Flat / Unit No */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Flat / House / Floor / Unit No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={houseNo}
                onChange={(e) => {
                  setHouseNo(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Flat 302, 3rd Floor / House 44"
                className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:border-[#239a4e] outline-none transition-colors"
              />
            </div>

            {/* Apartment / Building Name */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Apartment / Building / Society Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => {
                  setBuilding(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Royal Heights / Sapphire Tower"
                className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:border-[#239a4e] outline-none transition-colors"
              />
            </div>

            {/* Street / Road / Nearby Landmark (Auto-filled) */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                Street / Road / Nearby Landmark <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Bholaram Ustad Marg, Bhawarkua"
                className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:border-[#239a4e] outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-2.5 shadow-lg">
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleDeleteAddress}
                className="px-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Delete saved address"
              >
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="flex-1 py-3 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#239a4e]/20 active:scale-98 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Update Address</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="flex-1 py-3 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#239a4e]/20 active:scale-98 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save &amp; Deliver Here</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
