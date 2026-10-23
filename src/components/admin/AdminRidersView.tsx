'use client';

import React, { useState, useMemo } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  Phone,
  Search,
  Plus,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ExternalLink,
  X,
  Package,
  Award,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Order, Rider, RiderStatus } from '@/types/database';
import { INITIAL_RIDERS } from '@/lib/mockData';

interface AdminRidersViewProps {
  selectedHubFilter: string; // 'ALL' or outletId
  onSelectOrder?: (order: Order) => void;
}

export function AdminRidersView({
  selectedHubFilter,
  onSelectOrder,
}: AdminRidersViewProps) {
  const {
    orders,
    outlets,
    zonesMap,
    riders: storeRiders,
    addRider,
    updateRiderStatus,
    bulkAssignRider,
  } = useNiteOwlStore();

  const ridersList: Rider[] = storeRiders?.length ? storeRiders : INITIAL_RIDERS;

  // Local state
  const [hubFilter, setHubFilter] = useState<string>(selectedHubFilter);
  const [statusFilter, setStatusFilter] = useState<'ALL' | RiderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddRiderOpen, setIsAddRiderOpen] = useState(false);
  const [historyModalRider, setHistoryModalRider] = useState<Rider | null>(null);
  const [assignModalRider, setAssignModalRider] = useState<Rider | null>(null);
  const [selectedPendingOrderIds, setSelectedPendingOrderIds] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // New Rider Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newOutletId, setNewOutletId] = useState(outlets[0]?.id || 'outlet-bhawarkua');
  const [newVehicle, setNewVehicle] = useState('');
  const [newBaseDelivered, setNewBaseDelivered] = useState(15);

  // Sync hubFilter if parent prop changes
  React.useEffect(() => {
    setHubFilter(selectedHubFilter);
  }, [selectedHubFilter]);

  // Compute live statistics for each rider
  const riderStats = useMemo(() => {
    const map: Record<
      string,
      {
        totalDelivered: number;
        tonightDeliveredCount: number;
        activeOrders: Order[];
        deliveredOrders: Order[];
      }
    > = {};

    ridersList.forEach((rider) => {
      // Find orders matching rider name or riderId
      const riderOrders = orders.filter(
        (o) => o.riderId === rider.id || o.riderName === rider.name
      );

      const deliveredOrders = riderOrders.filter((o) => o.orderStatus === 'DELIVERED');
      const activeOrders = riderOrders.filter(
        (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
      );

      const tonightDeliveredCount = deliveredOrders.length;
      const totalDelivered = rider.baseDeliveredCount + tonightDeliveredCount;

      map[rider.id] = {
        totalDelivered,
        tonightDeliveredCount,
        activeOrders,
        deliveredOrders,
      };
    });

    return map;
  }, [ridersList, orders]);

  // Filter riders
  const filteredRiders = useMemo(() => {
    return ridersList.filter((rider) => {
      // Hub filter
      if (hubFilter !== 'ALL' && rider.outletId !== hubFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && rider.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rider.name.toLowerCase().includes(q);
        const matchesPhone = rider.phone.includes(q);
        const matchesVehicle = rider.vehicle.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesVehicle) {
          return false;
        }
      }

      return true;
    });
  }, [ridersList, hubFilter, statusFilter, searchQuery]);

  // Fleet Overall Metrics
  const fleetMetrics = useMemo(() => {
    const totalRiders = ridersList.length;
    const onDelivery = ridersList.filter((r) => r.status === 'ON_DELIVERY').length;
    const available = ridersList.filter((r) => r.status === 'AVAILABLE').length;

    let fleetDeliveredTotal = 0;
    ridersList.forEach((r) => {
      fleetDeliveredTotal += (riderStats[r.id]?.totalDelivered || r.baseDeliveredCount);
    });

    const activeInFlight = orders.filter(
      (o) => o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'PREPARING'
    ).length;

    return {
      totalRiders,
      onDelivery,
      available,
      fleetDeliveredTotal,
      activeInFlight,
    };
  }, [ridersList, riderStats, orders]);

  // Unassigned or pending orders for quick assignment modal
  const pendingOrdersForRider = useMemo(() => {
    if (!assignModalRider) return [];
    return orders.filter(
      (o) =>
        o.outletId === assignModalRider.outletId &&
        (o.orderStatus === 'PLACED' || o.orderStatus === 'PREPARING') &&
        (!o.riderName || o.riderName === 'Assigning pilot...' || o.riderId !== assignModalRider.id)
    );
  }, [orders, assignModalRider]);

  const handleCreateRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newVehicle.trim()) return;

    addRider({
      name: newName.trim(),
      phone: newPhone.trim(),
      outletId: newOutletId,
      vehicle: newVehicle.trim(),
      status: 'AVAILABLE',
      rating: 5.0,
      baseDeliveredCount: Number(newBaseDelivered) || 0,
      joinedDate: 'Just Now',
      preferredZoneCodes: ['ZONE_1', 'ZONE_2'],
    });

    setFeedbackToast(`🛵 Registered Pilot ${newName} successfully!`);
    setIsAddRiderOpen(false);
    setNewName('');
    setNewPhone('+91 ');
    setNewVehicle('');
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleAssignPendingToRider = () => {
    if (!assignModalRider || selectedPendingOrderIds.length === 0) return;

    bulkAssignRider(selectedPendingOrderIds, assignModalRider.id, {
      updateStatus: 'OUT_FOR_DELIVERY',
    });

    setFeedbackToast(
      `⚡ Assigned ${selectedPendingOrderIds.length} orders to ${assignModalRider.name}!`
    );
    setAssignModalRider(null);
    setSelectedPendingOrderIds([]);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const getOutletName = (outletId: string) => {
    return outlets.find((o) => o.id === outletId)?.name || 'Hub';
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="bg-[#75cf5e] text-[#0c0e0d] px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#e5f4eb] flex items-center gap-2">
            <Bike className="w-5 h-5 text-[#75cf5e]" />
            <span>Delivery Fleet &amp; Pilots Console</span>
          </h2>
          <p className="text-xs text-[#88998f] mt-0.5">
            Real-time tracking of active pilots, live zone dispatches, and total verified deliveries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddRiderOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#75cf5e] hover:bg-[#62b54d] text-[#0c0e0d] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#75cf5e]/20 hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Pilot</span>
        </button>
      </div>

      {/* Fleet KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Orders Delivered (KEY USER REQUIREMENT) */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#239a4e]/40 space-y-2 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#75cf5e]/5 rounded-bl-full pointer-events-none group-hover:bg-[#75cf5e]/10 transition-colors" />
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#75cf5e]">
              Fleet Delivered Total
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-[#75cf5e] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-[#e5f4eb]">
              {fleetMetrics.fleetDeliveredTotal}
            </span>
            <span className="text-[11px] text-[#75cf5e] font-bold">Orders Completed</span>
          </div>
          <p className="text-[10px] text-[#88998f]">
            Verified door &amp; gate drops across all Indore micro-zones
          </p>
        </div>

        {/* Total Active Fleet */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              Active Fleet Pilots
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#0c0e0d] text-[#e5f4eb] flex items-center justify-center">
              <Bike className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-[#e5f4eb]">
              {fleetMetrics.totalRiders}
            </span>
            <span className="text-[11px] text-[#88998f] font-bold">
              ({fleetMetrics.available} idle / {fleetMetrics.onDelivery} on-route)
            </span>
          </div>
          <p className="text-[10px] text-[#88998f]">Equipped with two-wheelers &amp; hot-bags</p>
        </div>

        {/* In-Flight Active Deliveries */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              In-Flight Transit
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-950/60 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-[#e5f4eb]">
              {fleetMetrics.activeInFlight}
            </span>
            <span className="text-[11px] text-sky-400 font-bold">Orders Live</span>
          </div>
          <p className="text-[10px] text-[#88998f]">Average delivery SLA: ~13.8 minutes</p>
        </div>

        {/* Fleet Safety & On-Time */}
        <div className="p-4 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#88998f]">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              On-Time SLA Rating
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/60 text-amber-400 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black text-[#e5f4eb]">
              98.9%
            </span>
            <span className="text-[11px] text-amber-400 font-bold">4.92 ★</span>
          </div>
          <p className="text-[10px] text-[#88998f]">Gate compliance &amp; discreet drop</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#151917] p-3 rounded-2xl border border-[#1c211e] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hub Selector */}
          <div className="flex items-center gap-1.5 bg-[#0c0e0d] px-2.5 py-1.5 rounded-xl border border-[#1c211e] text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#75cf5e]" />
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="bg-transparent font-bold text-[#e5f4eb] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#151917]">
                🌐 All Indore Hubs
              </option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#151917]">
                  📍 {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#0c0e0d] p-1 rounded-xl border border-[#1c211e]">
            {(['ALL', 'AVAILABLE', 'ON_DELIVERY', 'OFF_DUTY'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#75cf5e] text-[#0c0e0d]'
                    : 'text-[#88998f] hover:text-[#e5f4eb]'
                }`}
              >
                {st === 'ALL' && 'All Statuses'}
                {st === 'AVAILABLE' && 'Available'}
                {st === 'ON_DELIVERY' && 'On Delivery'}
                {st === 'OFF_DUTY' && 'Off Duty'}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#88998f] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pilot name, phone, vehicle..."
            className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#e5f4eb] placeholder-[#88998f] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Pilots Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRiders.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#151917] rounded-2xl border border-[#1c211e] text-[#88998f] space-y-2">
            <Bike className="w-8 h-8 text-[#88998f]/40 mx-auto" />
            <p className="font-bold text-sm text-[#e5f4eb]">No delivery pilots found</p>
            <p className="text-xs">
              Try selecting All Hubs or clearing your search filters.
            </p>
          </div>
        ) : (
          filteredRiders.map((rider) => {
            const stats = riderStats[rider.id] || {
              totalDelivered: rider.baseDeliveredCount,
              tonightDeliveredCount: 0,
              activeOrders: [],
              deliveredOrders: [],
            };

            const isAvailable = rider.status === 'AVAILABLE';
            const isOnDelivery = rider.status === 'ON_DELIVERY';
            const isOffDuty = rider.status === 'OFF_DUTY';
            const hubName = getOutletName(rider.outletId);

            return (
              <div
                key={rider.id}
                className="bg-[#151917] border border-[#1c211e] hover:border-[#239a4e]/50 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-lg transition-all hover:shadow-xl group"
              >
                {/* Card Header: Pilot Info & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a231d] to-[#0c0e0d] border border-[#239a4e]/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
                        🛵
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-[#e5f4eb] truncate flex items-center gap-1.5">
                          <span>{rider.name}</span>
                        </h3>
                        <p className="text-[11px] text-[#88998f] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#75cf5e]" />
                          <a
                            href={`tel:${rider.phone}`}
                            className="hover:text-[#75cf5e] transition-colors"
                          >
                            {rider.phone}
                          </a>
                        </p>
                      </div>
                    </div>

                    {/* Live Status Selector */}
                    <div className="relative">
                      <select
                        value={rider.status}
                        onChange={(e) =>
                          updateRiderStatus(rider.id, e.target.value as RiderStatus)
                        }
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none pr-5 ${
                          isOnDelivery
                            ? 'bg-sky-950/80 text-sky-400 border-sky-500/40'
                            : isAvailable
                            ? 'bg-emerald-950/80 text-[#75cf5e] border-[#239a4e]/40'
                            : 'bg-[#0c0e0d] text-[#88998f] border-[#1c211e]'
                        }`}
                      >
                        <option value="AVAILABLE" className="bg-[#151917] text-[#75cf5e]">
                          ● Available
                        </option>
                        <option value="ON_DELIVERY" className="bg-[#151917] text-sky-400">
                          ● On Delivery
                        </option>
                        <option value="OFF_DUTY" className="bg-[#151917] text-[#88998f]">
                          ● Off Duty
                        </option>
                      </select>
                      <ChevronRight className="w-2.5 h-2.5 text-gray-400 absolute right-1.5 top-2 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  {/* Hub & Vehicle Details */}
                  <div className="p-2.5 rounded-xl bg-[#0c0e0d] border border-[#1c211e] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#88998f] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#75cf5e]" />
                        <span>Hub Base:</span>
                      </span>
                      <span className="font-bold text-[#e5f4eb]">{hubName}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#88998f]">Vehicle:</span>
                      <span className="font-mono text-[#e5f4eb] font-semibold text-[11px] truncate max-w-[150px]">
                        {rider.vehicle}
                      </span>
                    </div>
                  </div>

                  {/* PROMINENT METRIC: TOTAL NUMBER OF ORDERS DELIVERED */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/30 via-[#151917] to-emerald-950/20 border border-[#239a4e]/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#88998f] block">
                        Total Orders Delivered
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-2xl font-black text-[#75cf5e]">
                          {stats.totalDelivered}
                        </span>
                        <span className="text-[10px] text-[#88998f] font-semibold">
                          delivered
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] bg-[#0c0e0d] text-[#75cf5e] font-bold px-2 py-0.5 rounded-md border border-[#239a4e]/30 block">
                        +{stats.tonightDeliveredCount} tonight
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold flex items-center justify-end gap-1 mt-1">
                        <span>★</span>
                        <span>{rider.rating} Rating</span>
                      </span>
                    </div>
                  </div>

                  {/* Active Assigned Deliveries (In-Flight) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#88998f] uppercase tracking-wider text-[10px]">
                        Active In-Flight Load ({stats.activeOrders.length})
                      </span>
                      {stats.activeOrders.length > 0 && (
                        <span className="text-[9px] text-sky-400 font-mono font-bold animate-pulse">
                          EN ROUTE
                        </span>
                      )}
                    </div>

                    {stats.activeOrders.length === 0 ? (
                      <div className="py-2 text-center bg-[#0c0e0d] rounded-lg border border-[#1c211e] text-[11px] text-[#88998f]">
                        No active dispatches. Pilot is standing by at hub.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {stats.activeOrders.map((o) => (
                          <div
                            key={o.id}
                            onClick={() => onSelectOrder && onSelectOrder(o)}
                            className="p-2 rounded-lg bg-[#0c0e0d] hover:bg-[#1f2622] border border-[#1c211e] hover:border-[#239a4e]/40 flex items-center justify-between text-[11px] cursor-pointer transition-colors"
                          >
                            <div className="truncate pr-2">
                              <span className="font-mono font-black text-[#75cf5e]">
                                {o.orderNumber}
                              </span>
                              <span className="text-[#88998f] ml-1.5 truncate">
                                • {o.addressDetails.hostelPgOrFlat}
                              </span>
                            </div>
                            <span className="font-bold text-[#e5f4eb] shrink-0">
                              ₹{o.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-[#1c211e] grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignModalRider(rider);
                      setSelectedPendingOrderIds([]);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0c0e0d] hover:bg-[#1f2421] text-[#75cf5e] hover:text-[#e5f4eb] border border-[#239a4e]/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Orders</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryModalRider(rider)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#75cf5e]" />
                    <span>View History</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Register New Pilot */}
      {isAddRiderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151917] border border-[#1c211e] w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 text-[#e5f4eb]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#75cf5e]" />
                <h3 className="font-extrabold text-sm text-[#e5f4eb]">
                  Register New Delivery Pilot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRiderOpen(false)}
                className="p-1 rounded-lg text-[#88998f] hover:text-[#e5f4eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRider} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#88998f] mb-1">
                  Pilot Name &amp; Callsign
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Pilot Rohit (#25)"
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl px-3 py-2 text-xs text-[#e5f4eb] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#88998f] mb-1">
                  Mobile Number (WhatsApp Enabled)
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98260 00000"
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl px-3 py-2 text-xs text-[#e5f4eb] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#88998f] mb-1">
                  Base Dispatch Hub
                </label>
                <select
                  value={newOutletId}
                  onChange={(e) => setNewOutletId(e.target.value)}
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl px-3 py-2 text-xs text-[#e5f4eb] outline-none cursor-pointer"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id} className="bg-[#151917]">
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#88998f] mb-1">
                  Vehicle Model &amp; Registration Plate
                </label>
                <input
                  type="text"
                  required
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  placeholder="e.g. Hero Splendor Plus • MP-09-XX-1234"
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl px-3 py-2 text-xs text-[#e5f4eb] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#88998f] mb-1">
                  Historical Delivered Orders Baseline
                </label>
                <input
                  type="number"
                  min="0"
                  value={newBaseDelivered}
                  onChange={(e) => setNewBaseDelivered(Number(e.target.value))}
                  placeholder="15"
                  className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl px-3 py-2 text-xs text-[#e5f4eb] outline-none"
                />
                <span className="text-[10px] text-[#88998f] mt-0.5 block">
                  Seed count for existing pilot performance records
                </span>
              </div>

              <div className="pt-3 border-t border-[#1c211e] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRiderOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#0c0e0d] text-[#88998f] hover:text-[#e5f4eb] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#75cf5e] hover:bg-[#62b54d] text-[#0c0e0d] text-xs font-black"
                >
                  Confirm &amp; Register Pilot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Pending Orders to Rider */}
      {assignModalRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151917] border border-[#1c211e] w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-[#e5f4eb]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div>
                <h3 className="font-extrabold text-sm text-[#e5f4eb] flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-[#75cf5e]" />
                  <span>Assign Orders to {assignModalRider.name}</span>
                </h3>
                <p className="text-[11px] text-[#88998f] mt-0.5">
                  Hub: {getOutletName(assignModalRider.outletId)} • {assignModalRider.vehicle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalRider(null)}
                className="p-1 rounded-lg text-[#88998f] hover:text-[#e5f4eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {pendingOrdersForRider.length === 0 ? (
                <div className="py-8 text-center text-[#88998f] text-xs space-y-1">
                  <p className="font-bold text-[#e5f4eb]">No pending orders at this hub</p>
                  <p>All active orders have already been dispatched or delivered.</p>
                </div>
              ) : (
                pendingOrdersForRider.map((order) => {
                  const isChecked = selectedPendingOrderIds.includes(order.id);
                  const zone = zonesMap[order.outletId]?.find((z) => z.id === order.zoneId);

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedPendingOrderIds(
                            selectedPendingOrderIds.filter((id) => id !== order.id)
                          );
                        } else {
                          setSelectedPendingOrderIds([...selectedPendingOrderIds, order.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#75cf5e]/15 border-[#75cf5e]'
                          : 'bg-[#0c0e0d] border-[#1c211e] hover:bg-[#1c211e]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded accent-[#75cf5e]"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#75cf5e]">
                              {order.orderNumber}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#151917] text-[#88998f] border border-[#1c211e]">
                              {zone?.zoneCode || 'Zone'}
                            </span>
                          </div>
                          <span className="text-[#88998f] text-[11px] block truncate mt-0.5">
                            {order.customerName} • {order.addressDetails.hostelPgOrFlat}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[#e5f4eb] block">
                          ₹{order.total}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold uppercase">
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#1c211e] flex items-center justify-between text-xs">
              <span className="text-[#88998f]">
                {selectedPendingOrderIds.length} orders selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalRider(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#0c0e0d] text-[#88998f] hover:text-[#e5f4eb] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedPendingOrderIds.length === 0}
                  onClick={handleAssignPendingToRider}
                  className="px-4 py-2 rounded-xl bg-[#75cf5e] hover:bg-[#62b54d] text-[#0c0e0d] text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Dispatch to {assignModalRider.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Delivered Order History */}
      {historyModalRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151917] border border-[#1c211e] w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-[#e5f4eb]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c211e]">
              <div>
                <h3 className="font-extrabold text-sm text-[#e5f4eb] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#75cf5e]" />
                  <span>Delivered Orders History: {historyModalRider.name}</span>
                </h3>
                <p className="text-[11px] text-[#88998f] mt-0.5">
                  Total Verified Deliveries:{' '}
                  <strong className="text-[#75cf5e]">
                    {riderStats[historyModalRider.id]?.totalDelivered ||
                      historyModalRider.baseDeliveredCount}
                  </strong>{' '}
                  orders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalRider(null)}
                className="p-1 rounded-lg text-[#88998f] hover:text-[#e5f4eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(riderStats[historyModalRider.id]?.deliveredOrders || []).length === 0 ? (
                <div className="py-8 text-center bg-[#0c0e0d] rounded-xl border border-[#1c211e] text-[#88998f] text-xs space-y-1">
                  <p className="font-bold text-[#e5f4eb]">
                    {historyModalRider.baseDeliveredCount} Historical Deliveries Logged
                  </p>
                  <p className="text-[11px]">
                    No new orders delivered during the current active session yet.
                  </p>
                </div>
              ) : (
                (riderStats[historyModalRider.id]?.deliveredOrders || []).map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-xl bg-[#0c0e0d] border border-[#1c211e] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#75cf5e]">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-[#88998f]">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                      <span className="text-[#88998f] text-[11px] block mt-0.5">
                        {order.customerName} • {order.addressDetails.hostelPgOrFlat}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-[#e5f4eb] block">
                        ₹{order.total}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-[#75cf5e] font-bold border border-[#239a4e]/40">
                        DELIVERED
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#1c211e] text-right">
              <button
                type="button"
                onClick={() => setHistoryModalRider(null)}
                className="px-4 py-1.5 rounded-xl bg-[#75cf5e] text-[#0c0e0d] text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
