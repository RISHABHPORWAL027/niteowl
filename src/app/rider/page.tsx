'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Building,
  VolumeX,
  ExternalLink,
  Sparkles,
  RefreshCw,
  LogOut,
  Lock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Rider } from '@/types/database';
import { INITIAL_RIDERS } from '@/lib/mockData';
import { GoogleMapsBatchRoute } from '@/components/rider/GoogleMapsBatchRoute';
import { optimizeBatchRoute, BatchStop } from '@/lib/batchRouting';
import { realtimeHub, BHAWARKUA_HUB_COORDS } from '@/lib/realtimeSync';

export default function RiderDeliveryPage() {
  const {
    orders,
    riders: storeRiders,
    updateOrderStatus,
    syncWithBackend,
  } = useNiteOwlStore();

  const ridersList: Rider[] = storeRiders?.length ? storeRiders : INITIAL_RIDERS;

  // Personal Pilot Authentication State
  const [activePilotId, setActivePilotId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [selectedLoginPilot, setSelectedLoginPilot] = useState<string>(
    ridersList[0]?.id || 'rider-suresh'
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  // App UI State
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'BATCH' | 'HISTORY'>('BATCH');

  // Multi-Stop Batch State
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [selectedModalStop, setSelectedModalStop] = useState<BatchStop | null>(null);

  // Load saved pilot session from localStorage
  useEffect(() => {
    try {
      const savedPilotId = localStorage.getItem('niteowl_active_pilot_id');
      if (savedPilotId && ridersList.some((r) => r.id === savedPilotId)) {
        setActivePilotId(savedPilotId);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsAuthLoading(false);
    }
  }, [ridersList]);

  // Sync with backend on initial load and setup interval
  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Login handler
  const handlePilotLogin = async (pilotId: string) => {
    setLoginError(null);
    try {
      const res = await fetch('/api/riders/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId, pin: pinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pilot authentication failed');
      }

      setActivePilotId(pilotId);
      try {
        localStorage.setItem('niteowl_active_pilot_id', pilotId);
      } catch (e) {
        // ignore
      }
      setPinInput('');
      setIsJourneyStarted(false);
      showToast(`Welcome back, ${data.rider?.name || 'Pilot'}. Shift active.`);
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please verify your PIN.');
    }
  };

  // Sign out handler
  const handlePilotLogout = async () => {
    try {
      await fetch('/api/riders/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setActivePilotId(null);
    try {
      localStorage.removeItem('niteowl_active_pilot_id');
    } catch (e) {
      // ignore
    }
    setSelectedModalStop(null);
    setIsJourneyStarted(false);
    showToast('Signed out of pilot session.');
  };

  // Logged-in pilot profile (strictly isolated)
  const currentRider = useMemo(() => {
    if (!activePilotId) return null;
    return ridersList.find((r) => r.id === activePilotId) || null;
  }, [ridersList, activePilotId]);

  // Orders assigned strictly to THIS logged-in pilot
  const riderOrders = useMemo(() => {
    if (!currentRider) return [];
    return orders.filter(
      (o) =>
        o.riderId === currentRider.id ||
        (o.riderName &&
          currentRider.name &&
          o.riderName.toLowerCase().includes(currentRider.name.toLowerCase().split(' ')[1] || ''))
    );
  }, [orders, currentRider]);

  // Active batch orders assigned to this pilot (PLACED, PREPARING, OUT_FOR_DELIVERY)
  const activeBatchOrders = useMemo(() => {
    return riderOrders.filter(
      (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
    );
  }, [riderOrders]);

  // Compute Nearest-Neighbor Optimal Multi-Stop Route from Bhawarkua Hub for assigned orders
  const batchStops: BatchStop[] = useMemo(() => {
    return optimizeBatchRoute(activeBatchOrders, BHAWARKUA_HUB_COORDS);
  }, [activeBatchOrders]);

  // Completed deliveries tonight by this pilot
  const deliveredTonight = useMemo(() => {
    return riderOrders.filter((o) => o.orderStatus === 'DELIVERED');
  }, [riderOrders]);

  // Auto-select first pending stop if active is delivered
  useEffect(() => {
    if (batchStops.length > 0) {
      const nextPendingIndex = batchStops.findIndex((s) => !s.isDelivered);
      if (nextPendingIndex !== -1 && nextPendingIndex !== activeStopIndex) {
        setActiveStopIndex(nextPendingIndex);
      }
    }
  }, [batchStops, activeStopIndex]);

  // Close stop modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedModalStop(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Action: Start Multi-Delivery Batch Journey
  const handleStartBatchJourney = () => {
    if (!currentRider) return;
    setIsJourneyStarted(true);
    setActiveStopIndex(0);

    // Transition all assigned batch orders to OUT_FOR_DELIVERY
    batchStops.forEach((stop) => {
      if (stop.order.orderStatus !== 'DELIVERED') {
        updateOrderStatus(stop.order.id, 'OUT_FOR_DELIVERY', {
          riderName: currentRider.name,
          riderPhone: currentRider.phone,
        });
        realtimeHub.broadcast({
          type: 'ORDER_STATUS_UPDATED',
          orderId: stop.order.id,
          status: 'OUT_FOR_DELIVERY',
          riderName: currentRider.name,
        });
      }
    });

    showToast('🚀 Multi-stop batch journey started! Heading to Stop #1.');
  };

  // Action: Deliver a specific stop
  const handleDeliverStop = (stop: BatchStop) => {
    if (!currentRider) return;
    const orderId = stop.order.id;

    // 1. Update order in store & database
    updateOrderStatus(orderId, 'DELIVERED', {
      riderName: currentRider.name,
      riderPhone: currentRider.phone,
    });

    // 2. Broadcast in real time across tabs (Admin panel & customer tracking)
    realtimeHub.broadcast({
      type: 'ORDER_STATUS_UPDATED',
      orderId,
      status: 'DELIVERED',
      riderName: currentRider.name,
    });

    setSelectedModalStop(null);

    // 3. Check if all stops in batch are now completed
    const remainingPending = batchStops.filter(
      (s) => s.order.id !== orderId && !s.isDelivered
    );

    if (remainingPending.length === 0) {
      setIsJourneyStarted(false);
      showToast('🎉 Journey Completed! All assigned batch orders delivered.');
    } else {
      const nextIdx = batchStops.findIndex(
        (s) => s.order.id !== orderId && !s.isDelivered
      );
      if (nextIdx !== -1) {
        setActiveStopIndex(nextIdx);
        showToast(`Stop #${stop.stopNumber} Delivered! Next: Stop #${nextIdx + 1}.`);
      }
    }
  };

  const currentActiveStop = batchStops[activeStopIndex] || batchStops[0];
  const allDelivered = batchStops.length > 0 && batchStops.every((s) => s.isDelivered);

  // Loading Session State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0c0e0d] flex flex-col items-center justify-center p-4 text-[#e5f4eb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#151917] border border-[#239a4e]/40 flex items-center justify-center text-2xl animate-pulse">
            🦉
          </div>
          <span className="text-xs text-[#88998f] font-mono">Loading Pilot Session...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: STRICT PERSONAL PILOT LOGIN SCREEN (IF NOT AUTHENTICATED)
  // =========================================================================
  if (!activePilotId || !currentRider) {
    return (
      <div className="min-h-screen bg-[#0c0e0d] text-[#e5f4eb] font-sans flex flex-col justify-center items-center p-4 selection:bg-[#239a4e] selection:text-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-[#151917] border border-[#239a4e]/40 shadow-xl shadow-[#239a4e]/10 flex items-center justify-center text-3xl">
              🛵
            </div>
            <h1 className="font-black text-xl text-[#e5f4eb] tracking-tight">
              NiteOwl Pilot Partner
            </h1>
            <p className="text-xs text-[#88998f]">
              Personal Pilot Shift Login • Private Access
            </p>
          </div>

          {/* Login Card */}
          <div className="p-5 bg-[#151917] border border-[#1c211e] rounded-3xl shadow-2xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#88998f] uppercase tracking-wider block">
                Select Your Pilot Profile:
              </label>

              <div className="space-y-2">
                {ridersList.map((r) => {
                  const isSelected = selectedLoginPilot === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedLoginPilot(r.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#18211b] border-[#239a4e] shadow-md shadow-[#239a4e]/10'
                          : 'bg-[#0c0e0d] border-[#1c211e] hover:border-[#2a332d]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            isSelected
                              ? 'bg-[#239a4e] text-white'
                              : 'bg-[#1c211e] text-[#88998f]'
                          }`}
                        >
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-[#e5f4eb]">{r.name}</h4>
                          <p className="text-[10px] text-[#88998f]">{r.vehicle}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#75cf5e] font-mono font-bold block">
                          ⭐ {r.rating || 4.9}
                        </span>
                        <span className="text-[9px] text-[#88998f]">{r.phone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick PIN / Password verification */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-[#88998f] uppercase tracking-wider block">
                Pilot Shift Passcode (Default: 1234):
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  maxLength={6}
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] rounded-xl px-3.5 py-2.5 text-xs text-[#e5f4eb] placeholder-[#4d5952] focus:outline-none focus:border-[#75cf5e] font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePilotLogin(selectedLoginPilot);
                  }}
                />
                <Lock className="w-3.5 h-3.5 text-[#88998f] absolute right-3 top-3" />
              </div>
            </div>

            {loginError && (
              <p className="text-[11px] text-red-400 font-bold bg-red-950/40 p-2 rounded-xl border border-red-500/30">
                {loginError}
              </p>
            )}

            {/* Login Action Button */}
            <button
              type="button"
              onClick={() => handlePilotLogin(selectedLoginPilot)}
              className="w-full py-3.5 rounded-2xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#239a4e]/25 active:scale-98 transition-all cursor-pointer"
            >
              <span>Login to My Delivery Shift</span>
              <Bike className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy & Scope Disclaimer */}
          <div className="p-3 bg-[#151917]/60 border border-[#1c211e] rounded-2xl text-[11px] text-[#88998f] space-y-1">
            <div className="flex items-center gap-1.5 text-[#75cf5e] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Personal Access</span>
            </div>
            <p>
              Each pilot has a private login. You will only see deliveries assigned to your vehicle. No hub management or cross-pilot data access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED PILOT COCKPIT (ASSIGNED DELIVERIES ONLY)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0c0e0d] text-[#e5f4eb] font-sans flex flex-col selection:bg-[#239a4e] selection:text-white pb-24">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] bg-[#1c211e] border border-[#239a4e] text-[#e5f4eb] text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-[#75cf5e] shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top App Bar (Personal Pilot Cockpit - No Admin link, No pilot switcher) */}
      <header className="sticky top-0 z-30 bg-[#121614]/95 backdrop-blur-md border-b border-[#1c211e] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1c211e] border border-[#239a4e]/40 flex items-center justify-center text-xl shadow-inner">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-[#e5f4eb] tracking-tight">
                  {currentRider.name}
                </span>
                <span className="text-[10px] font-mono text-[#75cf5e] bg-[#239a4e]/20 px-1.5 py-0.5 rounded border border-[#239a4e]/30 font-bold">
                  ⭐ {currentRider.rating || 4.9}
                </span>
              </div>
              <p className="text-[10px] text-[#88998f] font-mono truncate max-w-[180px]">
                {currentRider.vehicle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Duty Status */}
            <button
              type="button"
              onClick={() => setIsOnDuty(!isOnDuty)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer border ${
                isOnDuty
                  ? 'bg-emerald-950/80 text-[#75cf5e] border-[#239a4e]/50 shadow-xs'
                  : 'bg-red-950/60 text-red-400 border-red-500/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnDuty ? 'bg-[#75cf5e] animate-pulse' : 'bg-red-500'
                }`}
              />
              <span>{isOnDuty ? 'ON DUTY' : 'OFFLINE'}</span>
            </button>

            {/* Personal Logout Button */}
            <button
              type="button"
              onClick={handlePilotLogout}
              className="p-2 rounded-xl bg-[#1c211e] text-[#88998f] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Sign Out of Shift"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-4 flex-1">
        {/* Navigation Tabs (Only Assigned Batch Route and Personal Shift Log) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#151917] rounded-2xl border border-[#1c211e] text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('BATCH')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'BATCH'
                ? 'bg-[#239a4e] text-white shadow-md'
                : 'text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Assigned Route</span>
            {batchStops.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#239a4e] text-[10px] font-black flex items-center justify-center">
                {batchStops.filter((s) => !s.isDelivered).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-[#239a4e] text-white shadow-md'
                : 'text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Shift Log</span>
            {deliveredTonight.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#1c211e] text-[#75cf5e] text-[10px] font-black flex items-center justify-center">
                {deliveredTonight.length}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ASSIGNED MULTI-STOP BATCH ROUTE                                     */}
        {/* ========================================================================= */}
        {activeTab === 'BATCH' && (
          <div className="space-y-4">
            {batchStops.length === 0 ? (
              <div className="p-8 text-center bg-[#151917] border border-[#1c211e] rounded-3xl space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/60 border border-[#239a4e]/30 flex items-center justify-center text-2xl text-[#75cf5e]">
                  🛵
                </div>
                <h4 className="font-bold text-sm text-[#e5f4eb]">Ready & On Duty</h4>
                <p className="text-xs text-[#88998f] max-w-xs mx-auto">
                  No orders currently assigned to your route. When the kitchen dispatches orders for you, they will appear here automatically.
                </p>

                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-[#75cf5e]">
                  <span className="w-2 h-2 rounded-full bg-[#75cf5e] animate-ping" />
                  <span>Listening for dispatch assignments in real time...</span>
                </div>
              </div>
            ) : (
              <>
                {/* 1. INTERACTIVE GOOGLE MAPS MULTI-STOP ROUTE (ISOLATED STACKING CONTEXT) */}
                <div className="relative isolate z-0">
                  <GoogleMapsBatchRoute
                    stops={batchStops}
                    activeStopIndex={activeStopIndex}
                    onSelectStop={(index) => {
                      setActiveStopIndex(index);
                      setSelectedModalStop(batchStops[index]);
                    }}
                    riderName={currentRider.name}
                    isJourneyStarted={isJourneyStarted}
                    className="h-80"
                  />
                </div>

                {/* 2. JOURNEY CONTROL BANNER */}
                <div className="p-4 bg-[#151917] border border-[#1c211e] rounded-3xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-[#88998f] uppercase font-bold tracking-wider block">
                        Assigned Delivery Run
                      </span>
                      <h4 className="font-black text-base text-[#e5f4eb]">
                        {allDelivered
                          ? '🎉 All Stops Completed!'
                          : isJourneyStarted
                          ? `En Route → Stop #${activeStopIndex + 1} (${currentActiveStop?.order.addressDetails.hostelPgOrFlat})`
                          : `${batchStops.length} Stops Sequenced (Nearest First)`}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#88998f] block uppercase font-semibold">
                        Progress
                      </span>
                      <span className="font-mono font-black text-sm text-[#75cf5e]">
                        {batchStops.filter((s) => s.isDelivered).length} / {batchStops.length}
                      </span>
                    </div>
                  </div>

                  {/* Primary Start Journey Action Button */}
                  {!isJourneyStarted && !allDelivered && (
                    <button
                      type="button"
                      onClick={handleStartBatchJourney}
                      className="w-full py-3.5 rounded-2xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#239a4e]/30 active:scale-98 transition-all cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Start Journey (Stop #1 First)</span>
                    </button>
                  )}
                </div>

                {/* 3. ORDERED STOPS LIST (TAP TO VIEW DETAILS & DELIVER) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#75cf5e]" />
                      <span>My Assigned Stops ({batchStops.length}):</span>
                    </span>
                    <span className="text-[10px] text-[#75cf5e] font-mono">
                      Nearest → Furthest
                    </span>
                  </div>

                  <div className="space-y-2">
                    {batchStops.map((stop, idx) => {
                      const isCurrent = idx === activeStopIndex && isJourneyStarted && !stop.isDelivered;
                      const isDelivered = stop.isDelivered;

                      return (
                        <div
                          key={stop.order.id}
                          onClick={() => {
                            setActiveStopIndex(idx);
                            setSelectedModalStop(stop);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#18211b] border-[#239a4e] shadow-lg shadow-[#239a4e]/10'
                              : isDelivered
                              ? 'bg-[#121614] border-[#1c211e] opacity-75'
                              : 'bg-[#151917] border-[#1c211e] hover:border-[#2a332d]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Stop Pin Badge */}
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                                  isDelivered
                                    ? 'bg-[#239a4e] text-white'
                                    : isCurrent
                                    ? 'bg-amber-500 text-black animate-bounce'
                                    : 'bg-[#1c211e] text-[#e5f4eb] border border-[#2a332d]'
                                }`}
                              >
                                {isDelivered ? '✓' : `#${stop.stopNumber}`}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-xs text-[#e5f4eb]">
                                    {stop.order.addressDetails.hostelPgOrFlat}
                                    {stop.order.addressDetails.roomNo
                                      ? ` (${stop.order.addressDetails.roomNo})`
                                      : ''}
                                  </h5>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black border border-amber-500/30">
                                      CURRENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#88998f]">
                                  {stop.order.addressDetails.landmark}
                                </p>
                                <p className="text-[10px] text-[#75cf5e] font-mono">
                                  Customer: {stop.order.customerName} • {stop.distanceFromPrevKm} km away
                                </p>
                              </div>
                            </div>

                            {/* Status Pill */}
                            <div className="text-right shrink-0">
                              {isDelivered ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-[#75cf5e] text-[10px] font-black border border-[#239a4e]/40">
                                  DELIVERED
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono font-bold text-[#e5f4eb]">
                                  ₹{stop.order.total}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY SHIFT PERFORMANCE & HISTORY (THIS PILOT ONLY)                    */}
        {/* ========================================================================= */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#151917] border border-[#1c211e] rounded-2xl text-center">
                <span className="text-[10px] text-[#88998f] block uppercase font-bold">
                  Tonight
                </span>
                <span className="font-black text-xl text-[#75cf5e]">
                  {deliveredTonight.length}
                </span>
                <span className="text-[9px] text-[#88998f] block">trips</span>
              </div>

              <div className="p-3 bg-[#151917] border border-[#1c211e] rounded-2xl text-center">
                <span className="text-[10px] text-[#88998f] block uppercase font-bold">
                  Lifetime
                </span>
                <span className="font-black text-xl text-[#e5f4eb]">
                  {currentRider.baseDeliveredCount + deliveredTonight.length}
                </span>
                <span className="text-[9px] text-[#88998f] block">deliveries</span>
              </div>

              <div className="p-3 bg-[#151917] border border-[#1c211e] rounded-2xl text-center">
                <span className="text-[10px] text-[#88998f] block uppercase font-bold">
                  Rating
                </span>
                <span className="font-black text-xl text-amber-400">
                  ⭐ {currentRider.rating || 4.9}
                </span>
                <span className="text-[9px] text-[#88998f] block">pilot</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#88998f] uppercase tracking-wider px-1">
                Completed Deliveries Tonight ({currentRider.name})
              </h4>
              {deliveredTonight.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#88998f] bg-[#151917] rounded-2xl border border-[#1c211e]">
                  No completed deliveries recorded yet for your shift tonight.
                </div>
              ) : (
                deliveredTonight.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-[#151917] border border-[#1c211e] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#75cf5e]">
                          {order.orderNumber}
                        </span>
                        <span className="text-[#88998f]">
                          {order.addressDetails.hostelPgOrFlat}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#88998f]">
                        {order.items.length} item(s) • ₹{order.total} ({order.paymentStatus === 'PAID' ? 'PAID ONLINE' : 'CASH'})
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-[#75cf5e] text-[10px] font-black border border-[#239a4e]/40">
                      Delivered
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: INTERACTIVE STOP DETAIL & MARK DELIVERED SECTION                   */}
      {/* ========================================================================= */}
      {selectedModalStop && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedModalStop(null);
          }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative z-[10000] w-full max-w-md bg-[#151917] border-t sm:border border-[#1c211e] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1c211e] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#239a4e] text-white font-black text-xs flex items-center justify-center">
                  #{selectedModalStop.stopNumber}
                </span>
                <div>
                  <h4 className="font-black text-sm text-[#e5f4eb]">
                    Stop Details: {selectedModalStop.order.orderNumber}
                  </h4>
                  <p className="text-[10px] text-[#88998f]">
                    Leg Distance: ~{selectedModalStop.distanceFromPrevKm} km from previous point
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedModalStop(null)}
                className="w-7 h-7 rounded-full bg-[#1c211e] text-[#88998f] hover:text-[#e5f4eb] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer Contact Details */}
            <div className="p-3.5 bg-[#0c0e0d] rounded-2xl border border-[#1c211e] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#88998f] uppercase font-bold block">
                    Customer Name:
                  </span>
                  <span className="font-black text-sm text-[#e5f4eb]">
                    {selectedModalStop.order.customerName}
                  </span>
                </div>

                <a
                  href={`tel:${selectedModalStop.order.customerPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {selectedModalStop.order.customerPhone}</span>
                </a>
              </div>

              <div className="pt-2 border-t border-[#1c211e]">
                <span className="text-[10px] text-[#88998f] uppercase font-bold block">
                  Delivery Address / Drop Point:
                </span>
                <p className="font-bold text-[#e5f4eb] mt-0.5">
                  {selectedModalStop.order.addressDetails.hostelPgOrFlat}
                  {selectedModalStop.order.addressDetails.roomNo ? ` (${selectedModalStop.order.addressDetails.roomNo})` : ''}
                </p>
                <p className="text-[11px] text-[#88998f]">
                  {selectedModalStop.order.addressDetails.landmark}
                </p>
              </div>

              {/* Special Directives */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedModalStop.order.addressDetails.leaveAtGate && (
                  <span className="px-2 py-0.5 rounded-md bg-[#181f1b] text-[#75cf5e] border border-[#239a4e]/30 text-[10px] font-bold flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    <span>Leave at Security Gate</span>
                  </span>
                )}
                {selectedModalStop.order.addressDetails.silentDelivery && (
                  <span className="px-2 py-0.5 rounded-md bg-[#181f1b] text-[#75cf5e] border border-[#239a4e]/30 text-[10px] font-bold flex items-center gap-1">
                    <VolumeX className="w-3 h-3" />
                    <span>Silent Drop (Do not honk)</span>
                  </span>
                )}
              </div>

              {selectedModalStop.order.addressDetails.riderNotes && (
                <p className="text-[11px] text-amber-300 italic bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                  &quot;{selectedModalStop.order.addressDetails.riderNotes}&quot;
                </p>
              )}
            </div>

            {/* Turn-by-Turn Google Maps Button */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${BHAWARKUA_HUB_COORDS.lat},${BHAWARKUA_HUB_COORDS.lng}&destination=${selectedModalStop.coords.lat},${selectedModalStop.coords.lng}&travelmode=two-wheeler`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-[#1c211e] hover:bg-[#232a26] text-[#75cf5e] border border-[#239a4e]/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open in Google Maps Navigation</span>
              <ExternalLink className="w-3 h-3 text-[#88998f]" />
            </a>

            {/* Order Items & Bill */}
            <div className="p-3 bg-[#0c0e0d] rounded-2xl border border-[#1c211e] space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[#88998f] border-b border-[#1c211e] pb-1">
                <span>Items ({selectedModalStop.order.items.length})</span>
                <span className="font-bold text-[#e5f4eb]">
                  Total: ₹{selectedModalStop.order.total} ({selectedModalStop.order.paymentStatus === 'PAID' ? 'PAID ONLINE' : 'CASH'})
                </span>
              </div>
              {selectedModalStop.order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[#88998f] text-[11px]">
                  <span>{it.quantity}x {it.name}</span>
                  <span className="text-[#e5f4eb]">₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            {/* Delivered Action Button */}
            <div>
              {selectedModalStop.isDelivered ? (
                <div className="w-full py-3 rounded-2xl bg-emerald-950/80 border border-[#239a4e]/40 text-[#75cf5e] font-black text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Already Delivered</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeliverStop(selectedModalStop)}
                  className="w-full py-3.5 rounded-2xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#75cf5e]/30 active:scale-98 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Mark Stop #{selectedModalStop.stopNumber} Delivered</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Status */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#121614]/95 backdrop-blur-md border-t border-[#1c211e] py-2.5 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#88998f]">
            <span className="w-2 h-2 rounded-full bg-[#75cf5e]" />
            <span className="text-[11px]">
              GPS Sync Active • {currentRider.name} ({currentRider.vehicle.split('•')[0].trim()})
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              syncWithBackend().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#1c211e] text-[#88998f] hover:text-[#e5f4eb] transition-colors cursor-pointer"
            title="Refresh Deliveries"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#75cf5e]' : ''}`}
            />
          </button>
        </div>
      </footer>
    </div>
  );
}
