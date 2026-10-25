'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bike,
  CheckCircle2,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  Users,
  Send,
  X,
  Sparkles,
  MapPin,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ChefHat,
  Phone,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Order, OrderStatus, Rider } from '@/types/database';
import { INITIAL_RIDERS } from '@/lib/mockData';

interface AdminOrdersListProps {
  selectedHubFilter: string; // 'ALL' or outletId
  onSelectOrder: (order: Order) => void;
}

export function AdminOrdersList({
  selectedHubFilter,
  onSelectOrder,
}: AdminOrdersListProps) {
  const {
    orders,
    outlets,
    zonesMap,
    riders: storeRiders,
    bulkAssignRider,
    updateOrderStatus,
  } = useNiteOwlStore();

  const ridersList: Rider[] = storeRiders?.length ? storeRiders : INITIAL_RIDERS;

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Bulk Operations State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedPilotId, setSelectedPilotId] = useState<string>('');
  const [autoDispatch, setAutoDispatch] = useState<boolean>(true);
  const [bulkFeedbackToast, setBulkFeedbackToast] = useState<string | null>(null);

  // Dedicated Modal for "Assign Pilot & Dispatch" when order is prepared & ready for delivery
  const [dispatchModalOrder, setDispatchModalOrder] = useState<Order | null>(null);

  // Available zones based on currently selected hub
  const hubZones = useMemo(() => {
    if (selectedHubFilter === 'ALL') {
      // Collect all zones across all outlets
      const all: { zoneId: string; name: string; outletName: string; outletId: string }[] = [];
      outlets.forEach((outlet) => {
        const zList = zonesMap[outlet.id] || [];
        zList.forEach((z) => {
          all.push({
            zoneId: z.id,
            name: z.name,
            outletName: outlet.name,
            outletId: outlet.id,
          });
        });
      });
      return all;
    }
    const zList = zonesMap[selectedHubFilter] || [];
    const outlet = outlets.find((o) => o.id === selectedHubFilter);
    return zList.map((z) => ({
      zoneId: z.id,
      name: z.name,
      outletName: outlet?.name || 'Hub',
      outletId: z.outletId,
    }));
  }, [selectedHubFilter, outlets, zonesMap]);

  // Pilots available for the hub (or all if ALL selected)
  const availablePilots = useMemo(() => {
    if (selectedHubFilter === 'ALL') {
      return ridersList;
    }
    const hubPilots = ridersList.filter((r) => r.outletId === selectedHubFilter);
    return hubPilots.length > 0 ? hubPilots : ridersList;
  }, [selectedHubFilter, ridersList]);

  // Set default selected pilot when list changes
  React.useEffect(() => {
    if (availablePilots.length > 0 && !selectedPilotId) {
      setSelectedPilotId(availablePilots[0].id);
    }
  }, [availablePilots, selectedPilotId]);

  // Filter orders by Hub, Zone, Status, and Search Query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Hub filter
      if (selectedHubFilter !== 'ALL' && order.outletId !== selectedHubFilter) {
        return false;
      }

      // Zone filter
      if (selectedZoneFilter !== 'ALL' && order.zoneId !== selectedZoneFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && order.orderStatus !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = order.orderNumber.toLowerCase().includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.includes(q);
        const matchesAddress = order.addressDetails?.hostelPgOrFlat
          ?.toLowerCase()
          .includes(q);
        const matchesLandmark = order.addressDetails?.landmark
          ?.toLowerCase()
          .includes(q);

        if (!matchesNum && !matchesName && !matchesPhone && !matchesAddress && !matchesLandmark) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedHubFilter, selectedZoneFilter, statusFilter, searchQuery]);

  // Pagination calculation
  const totalOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  // Status counts for badge tabs (respecting Hub & Zone)
  const scopedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedHubFilter !== 'ALL' && o.outletId !== selectedHubFilter) return false;
      if (selectedZoneFilter !== 'ALL' && o.zoneId !== selectedZoneFilter) return false;
      return true;
    });
  }, [orders, selectedHubFilter, selectedZoneFilter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: scopedOrders.length,
      PLACED: 0,
      PREPARING: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    scopedOrders.forEach((o) => {
      if (counts[o.orderStatus] !== undefined) {
        counts[o.orderStatus]++;
      }
    });
    return counts;
  }, [scopedOrders]);

  const statusTabs: { id: 'ALL' | OrderStatus; label: string }[] = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PLACED', label: 'Placed' },
    { id: 'PREPARING', label: 'Preparing' },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { id: 'DELIVERED', label: 'Delivered' },
  ];

  // Eligible orders for bulk assignment (orders that are not delivered or cancelled)
  const eligiblePaginatedOrders = paginatedOrders.filter(
    (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
  );
  const eligibleScopedOrders = scopedOrders.filter(
    (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
  );

  const isAllPaginatedSelected =
    eligiblePaginatedOrders.length > 0 &&
    eligiblePaginatedOrders.every((o) => selectedOrderIds.includes(o.id));

  const isSomePaginatedSelected =
    eligiblePaginatedOrders.some((o) => selectedOrderIds.includes(o.id)) &&
    !isAllPaginatedSelected;

  const toggleSelectAllVisible = () => {
    if (isAllPaginatedSelected) {
      // Deselect visible eligible
      const visibleIds = new Set(eligiblePaginatedOrders.map((o) => o.id));
      setSelectedOrderIds(selectedOrderIds.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all visible eligible
      const newIds = Array.from(
        new Set([...selectedOrderIds, ...eligiblePaginatedOrders.map((o) => o.id)])
      );
      setSelectedOrderIds(newIds);
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const handleSelectAllInZone = () => {
    const allEligibleZoneIds = eligibleScopedOrders.map((o) => o.id);
    setSelectedOrderIds(allEligibleZoneIds);
  };

  const handleBulkAssign = () => {
    if (selectedOrderIds.length === 0 || !selectedPilotId) return;

    const pilot = ridersList.find((r) => r.id === selectedPilotId);
    if (!pilot) return;

    bulkAssignRider(selectedOrderIds, selectedPilotId, {
      updateStatus: autoDispatch ? 'OUT_FOR_DELIVERY' : undefined,
    });

    const msg = `⚡ Assigned ${pilot.name} to ${selectedOrderIds.length} ${
      selectedOrderIds.length === 1 ? 'order' : 'orders'
    }${autoDispatch ? ' & Dispatched' : ''}!`;

    setBulkFeedbackToast(msg);
    setSelectedOrderIds([]);

    setTimeout(() => {
      setBulkFeedbackToast(null);
    }, 4500);
  };

  // Helper calculations for pilot load
  const getPilotActiveLoad = (pilotName: string) => {
    return orders.filter(
      (o) =>
        (o.orderStatus === 'PREPARING' || o.orderStatus === 'OUT_FOR_DELIVERY') &&
        o.riderName === pilotName
    ).length;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return isoString;
    }
  };

  const getOutletName = (outletId: string) => {
    const o = outlets.find((x) => x.id === outletId);
    return o?.name.replace(' Hub', '') || 'Hub';
  };

  const getZone = (outletId: string, zoneId: string) => {
    const zList = zonesMap[outletId] || [];
    return zList.find((x) => x.id === zoneId);
  };

  const currentZoneObj = hubZones.find((z) => z.zoneId === selectedZoneFilter);

  return (
    <div className="space-y-4">
      {/* Toast Feedback Banner */}
      {bulkFeedbackToast && (
        <div className="bg-[#75cf5e] text-[#0c0e0d] px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{bulkFeedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setBulkFeedbackToast(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Filter Controls */}
      <div className="bg-[#151917] p-3 rounded-2xl border border-[#1c211e] space-y-3 shadow-md">
        {/* Row 1: Status Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Pill Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              const count = countByStatus[tab.id] || 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#75cf5e] text-[#0c0e0d] shadow-sm'
                      : 'text-[#88998f] hover:text-[#e5f4eb] hover:bg-[#1a201c]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-[#0c0e0d] text-[#75cf5e]'
                        : 'bg-[#1c211e] text-[#88998f]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#88998f] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search order #, customer, address..."
              className="w-full bg-[#0c0e0d] border border-[#1c211e] focus:border-[#75cf5e] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#e5f4eb] placeholder-[#88998f] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Row 2: Hub Micro-Zone Filter Dropdown & Quick Selection Bar */}
        <div className="pt-2 border-t border-[#1c211e] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#88998f] font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#75cf5e]" />
              <span>Filter By Hub Zone:</span>
            </span>

            {/* Zone Selector */}
            <div className="relative">
              <select
                value={selectedZoneFilter}
                onChange={(e) => {
                  setSelectedZoneFilter(e.target.value);
                  setCurrentPage(1);
                  setSelectedOrderIds([]);
                }}
                className="bg-[#0c0e0d] hover:bg-[#181d1a] border border-[#239a4e]/40 rounded-xl px-3 py-1.5 text-xs font-bold text-[#e5f4eb] focus:outline-none focus:border-[#75cf5e] cursor-pointer appearance-none pr-8 transition-colors"
              >
                <option value="ALL">🌐 All Delivery Zones</option>
                {hubZones.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    📍 {z.name} {selectedHubFilter === 'ALL' ? `(${z.outletName})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Quick Filter Tag if zone selected */}
            {selectedZoneFilter !== 'ALL' && currentZoneObj && (
              <span className="px-2.5 py-1 rounded-lg bg-[#75cf5e]/15 border border-[#75cf5e]/40 text-[#75cf5e] text-[11px] font-bold flex items-center gap-1">
                <span>Active Scope: {currentZoneObj.name.split('(')[0]}</span>
                <button
                  type="button"
                  onClick={() => setSelectedZoneFilter('ALL')}
                  className="hover:text-white ml-0.5"
                  title="Clear Zone Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Quick Select All in Zone button */}
          {selectedZoneFilter !== 'ALL' && eligibleScopedOrders.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllInZone}
              className="text-[11px] font-bold text-[#75cf5e] hover:text-[#e5f4eb] bg-[#0c0e0d] hover:bg-[#1c211e] px-2.5 py-1 rounded-lg border border-[#239a4e]/30 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#75cf5e]" />
              <span>Select all {eligibleScopedOrders.length} in this Zone</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar (Rider Assignment Toolbar) */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-[70px] z-20 bg-gradient-to-r from-[#111413] to-[#151d18] border-2 border-[#75cf5e]/60 rounded-2xl p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#75cf5e] text-[#0c0e0d] flex items-center justify-center font-black">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-[#e5f4eb]">
                  {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Order' : 'Orders'}{' '}
                  Selected
                </span>
                {selectedZoneFilter !== 'ALL' && currentZoneObj && (
                  <span className="px-2 py-0.5 rounded bg-[#0c0e0d] text-[#75cf5e] text-[10px] font-bold border border-[#239a4e]/40">
                    {currentZoneObj.name.split(':')[0]}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#88998f]">
                Assign delivery pilot for clustered routing before dispatch
              </p>
            </div>
          </div>

          {/* Bulk Assign Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pilot Selector */}
            <div className="flex items-center gap-1.5 bg-[#0c0e0d] px-2.5 py-1.5 rounded-xl border border-[#1c211e]">
              <Bike className="w-4 h-4 text-[#75cf5e]" />
              <select
                value={selectedPilotId}
                onChange={(e) => setSelectedPilotId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#e5f4eb] focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {availablePilots.map((p) => {
                  const load = getPilotActiveLoad(p.name);
                  return (
                    <option key={p.id} value={p.id} className="bg-[#151917] text-[#e5f4eb]">
                      {p.name} • {p.vehicle.split('•')[0]} ({load} active)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Auto Dispatch Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-[#88998f] hover:text-[#e5f4eb] cursor-pointer bg-[#0c0e0d] px-2.5 py-1.5 rounded-xl border border-[#1c211e]">
              <input
                type="checkbox"
                checked={autoDispatch}
                onChange={(e) => setAutoDispatch(e.target.checked)}
                className="rounded accent-[#75cf5e] cursor-pointer"
              />
              <span className="text-[11px] font-bold">Auto Dispatch</span>
            </label>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleBulkAssign}
              className="px-4 py-2 rounded-xl bg-[#75cf5e] hover:bg-[#64be4f] text-[#0c0e0d] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#75cf5e]/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                Assign / Reassign Rider ({selectedOrderIds.length})
              </span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="p-2 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#151917] border border-[#1c211e] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#e5f4eb] border-collapse">
            <thead>
              <tr className="bg-[#0c0e0d] text-[#88998f] text-[10px] font-bold uppercase tracking-wider border-b border-[#1c211e]">
                {/* Select All Checkbox */}
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    disabled={eligiblePaginatedOrders.length === 0}
                    className="cursor-pointer text-[#88998f] hover:text-[#75cf5e] disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      isAllPaginatedSelected
                        ? 'Deselect visible'
                        : 'Select all visible pending orders'
                    }
                  >
                    {isAllPaginatedSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#75cf5e]" />
                    ) : isSomePaginatedSelected ? (
                      <MinusSquare className="w-4 h-4 text-[#75cf5e]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Order # &amp; Time</th>
                <th className="py-3 px-3">Hub &amp; Zone</th>
                <th className="py-3 px-3">Customer &amp; Location</th>
                <th className="py-3 px-3">Items Summary</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Assigned Pilot</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c211e]">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#88998f]">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-[#e5f4eb]">No orders found</p>
                      <p className="text-xs">
                        Try clearing search terms or changing the Zone/Status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const outletName = getOutletName(order.outletId);
                  const zone = getZone(order.outletId, order.zoneId);
                  const zoneCode = zone?.zoneCode || 'Z1';

                  const isPlaced = order.orderStatus === 'PLACED';
                  const isPreparing = order.orderStatus === 'PREPARING';
                  const isOutForDelivery = order.orderStatus === 'OUT_FOR_DELIVERY';
                  const isDelivered = order.orderStatus === 'DELIVERED';
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isEligibleForAssignment = !isDelivered && order.orderStatus !== 'CANCELLED';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-[#75cf5e]/10 border-l-2 border-l-[#75cf5e]'
                          : 'hover:bg-[#1a201c]'
                      }`}
                    >
                      {/* Checkbox Cell */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEligibleForAssignment ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectOrder(order.id)}
                            className="text-[#88998f] hover:text-[#75cf5e] cursor-pointer"
                            title={isSelected ? 'Deselect order' : 'Select for bulk assignment'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#75cf5e]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="inline-block w-4 h-4 text-center text-[#88998f]/40 text-[10px]"
                            title="Completed or cancelled orders cannot be reassigned"
                          >
                            ✓
                          </span>
                        )}
                      </td>

                      {/* Order Number & Timestamp */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-black text-xs text-[#75cf5e] block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-[#88998f] flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTime(order.createdAt)}</span>
                        </span>
                      </td>

                      {/* Hub & Zone */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-xs text-[#e5f4eb] block truncate max-w-[120px]">
                          {outletName}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-[#0c0e0d] text-[#75cf5e] text-[9px] font-black border border-[#239a4e]/30">
                            {zoneCode}
                          </span>
                          <span className="text-[10px] text-[#88998f] truncate max-w-[100px]">
                            {zone?.name?.split(':')[1] || zoneCode}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Location */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-xs text-[#e5f4eb] block truncate max-w-[140px]">
                          {order.customerName}
                        </span>
                        <span className="text-[10px] text-[#88998f] truncate block max-w-[140px]">
                          {order.addressDetails.hostelPgOrFlat}
                          {order.addressDetails.roomNo ? ` (${order.addressDetails.roomNo})` : ''}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-xs text-[#e5f4eb] block truncate max-w-[150px]">
                          {order.items
                            .map((it) => `${it.quantity}x ${it.name}`)
                            .join(', ')}
                        </span>
                        <span className="text-[10px] text-[#88998f]">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 font-mono font-black text-xs text-[#75cf5e]">
                        ₹{order.total}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                            isDelivered
                              ? 'bg-emerald-950/80 text-[#75cf5e] border-[#239a4e]/40'
                              : isOutForDelivery
                              ? 'bg-sky-950/80 text-sky-400 border-sky-500/40'
                              : isPreparing
                              ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                              : 'bg-red-950/80 text-red-300 border-red-500/40 animate-pulse'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDelivered
                                ? 'bg-[#75cf5e]'
                                : isOutForDelivery
                                ? 'bg-sky-400'
                                : isPreparing
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <span>{order.orderStatus.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* Pilot Assignment Cell */}
                      <td
                        className="py-3 px-3 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.riderName && order.riderName !== 'Assigning pilot...' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-[#e5f4eb] font-bold">
                              <Bike className="w-3.5 h-3.5 text-[#75cf5e] shrink-0" />
                              <span className="truncate max-w-[95px]">{order.riderName}</span>
                            </div>
                            {isEligibleForAssignment && (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    bulkAssignRider([order.id], e.target.value);
                                    const newP = ridersList.find((r) => r.id === e.target.value);
                                    setBulkFeedbackToast(
                                      `⚡ Reassigned Order #${order.orderNumber} to ${newP?.name || 'new pilot'}!`
                                    );
                                  }
                                }}
                                className="bg-[#0c0e0d] hover:bg-[#1f2421] border border-[#1c211e] hover:border-amber-400 text-[#88998f] hover:text-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer transition-colors"
                                title="Wrongly assigned? Click to change pilot"
                              >
                                <option value="" disabled>
                                  Change ▾
                                </option>
                                {availablePilots.map((p) => (
                                  <option key={p.id} value={p.id} className="bg-[#151917] text-[#e5f4eb]">
                                    {p.name} {p.name === order.riderName ? '(Current)' : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : isEligibleForAssignment ? (
                          isPreparing ? (
                            /* Mandatory warning & assign dropdown for prepared/preparing order */
                            <div className="flex items-center gap-1">
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    bulkAssignRider([order.id], e.target.value);
                                    const p = ridersList.find((r) => r.id === e.target.value);
                                    setBulkFeedbackToast(`⚡ Assigned ${p?.name} to Order #${order.orderNumber}!`);
                                  }
                                }}
                                className="bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/60 hover:border-amber-400 text-amber-300 rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                                title="Food is prepared. Pilot assignment is required before dispatch!"
                              >
                                <option value="" disabled>
                                  ⚠️ Assign Pilot (Must)
                                </option>
                                {availablePilots.map((p) => (
                                  <option key={p.id} value={p.id} className="bg-[#151917] text-[#e5f4eb]">
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            /* Quick In-Row Assign Dropdown for Placed */
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  bulkAssignRider([order.id], e.target.value, {
                                    updateStatus: isPlaced ? 'PREPARING' : undefined,
                                  });
                                  const p = ridersList.find((r) => r.id === e.target.value);
                                  setBulkFeedbackToast(`⚡ Assigned ${p?.name} to Order #${order.orderNumber}!`);
                                }
                              }}
                              className="bg-[#0c0e0d] hover:bg-[#1a201c] border border-emerald-500/30 hover:border-[#75cf5e] text-emerald-300 rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                            >
                              <option value="" disabled>
                                + Assign Pilot
                              </option>
                              {availablePilots.map((p) => (
                                <option key={p.id} value={p.id} className="bg-[#151917] text-[#e5f4eb]">
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )
                        ) : (
                          <span className="text-[#88998f] italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {isPlaced && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0c0e0d] font-bold text-[10px] transition-all cursor-pointer shadow-xs"
                            >
                              Accept
                            </button>
                          )}
                          {isPreparing && (
                            order.riderName && order.riderName !== 'Assigning pilot...' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateOrderStatus(order.id, 'OUT_FOR_DELIVERY', {
                                    riderName: order.riderName,
                                    riderPhone: order.riderPhone,
                                    riderId: order.riderId,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-bold text-[10px] transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                title={`Dispatch order with ${order.riderName}`}
                              >
                                <Bike className="w-3 h-3" />
                                <span>Dispatch</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDispatchModalOrder(order)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0c0e0d] font-black text-[10px] transition-all cursor-pointer shadow-xs flex items-center gap-1 animate-pulse"
                                title="Order is prepared and ready for delivery. Assign a pilot to dispatch!"
                              >
                                <Bike className="w-3 h-3" />
                                <span>Assign &amp; Dispatch</span>
                              </button>
                            )
                          )}
                          {isOutForDelivery && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all cursor-pointer shadow-xs"
                            >
                              Deliver
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="p-1.5 rounded-lg bg-[#0c0e0d] hover:bg-[#222925] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] transition-colors cursor-pointer"
                            title="View Full Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Minimal Pagination Bar */}
        <div className="bg-[#0c0e0d] px-4 py-3 border-t border-[#1c211e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#88998f]">
          <div>
            <span>
              Showing <strong className="text-[#e5f4eb]">{totalOrders > 0 ? startIndex + 1 : 0}</strong> to{' '}
              <strong className="text-[#e5f4eb]">
                {Math.min(startIndex + pageSize, totalOrders)}
              </strong>{' '}
              of <strong className="text-[#e5f4eb]">{totalOrders}</strong> orders
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg bg-[#151917] hover:bg-[#1f2421] disabled:opacity-40 disabled:pointer-events-none text-[#e5f4eb] border border-[#1c211e] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  activePage === num
                    ? 'bg-[#75cf5e] text-[#0c0e0d]'
                    : 'bg-[#151917] hover:bg-[#1f2421] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e]'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg bg-[#151917] hover:bg-[#1f2421] disabled:opacity-40 disabled:pointer-events-none text-[#e5f4eb] border border-[#1c211e] cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Prepared Order Ready for Delivery - Require Pilot Selection */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#151917] border border-[#1c211e] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#e5f4eb] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#1c211e] bg-[#111413] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-black text-sm text-[#75cf5e]">
                      {dispatchModalOrder.orderNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-950/80 text-amber-400 border border-amber-500/40">
                      Prepared &bull; Ready for Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-[#88998f]">
                    {dispatchModalOrder.customerName} &bull; {dispatchModalOrder.addressDetails.hostelPgOrFlat}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="p-1.5 rounded-xl bg-[#0c0e0d] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mandatory Instruction Banner */}
            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">Assign Delivery Pilot (Required)</p>
                <p className="text-[11px] text-amber-300/80">
                  Food is prepared and packed at the counter. Select which pilot is carrying this order to dispatch live tracking.
                </p>
              </div>
            </div>

            {/* Order Brief Summary */}
            <div className="p-4 border-b border-[#1c211e] bg-[#0c0e0d] flex items-center justify-between text-xs">
              <div className="truncate pr-3">
                <span className="text-[#88998f]">Items: </span>
                <span className="font-semibold text-[#e5f4eb] truncate">
                  {dispatchModalOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[#88998f] block text-[10px]">Total Bill</span>
                <span className="font-mono font-black text-sm text-[#75cf5e]">
                  ₹{dispatchModalOrder.total}
                </span>
              </div>
            </div>

            {/* Pilot Roster Selection */}
            <div className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
              <h4 className="text-[10px] font-bold text-[#88998f] uppercase tracking-wider">
                Select Available Pilot
              </h4>

              {availablePilots.length === 0 ? (
                <div className="p-6 text-center text-[#88998f] text-xs">
                  No registered pilots found for this hub. Please add a pilot in the Riders tab.
                </div>
              ) : (
                availablePilots.map((pilot) => {
                  const activeLoad = getPilotActiveLoad(pilot.name);
                  const isAvailable = pilot.status === 'AVAILABLE';

                  return (
                    <div
                      key={pilot.id}
                      className="p-3 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] border border-[#1c211e] hover:border-[#75cf5e]/40 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAvailable
                              ? 'bg-emerald-950/80 text-[#75cf5e] border border-[#239a4e]/40'
                              : 'bg-sky-950/80 text-sky-400 border border-sky-500/40'
                          }`}
                        >
                          <Bike className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#e5f4eb] truncate">
                              {pilot.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                isAvailable
                                  ? 'bg-emerald-950/80 text-[#75cf5e]'
                                  : 'bg-sky-950/80 text-sky-400'
                              }`}
                            >
                              {pilot.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#88998f] truncate mt-0.5">
                            {pilot.vehicle} &bull; {activeLoad} active {activeLoad === 1 ? 'load' : 'loads'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            bulkAssignRider([dispatchModalOrder.id], pilot.id, {
                              updateStatus: 'OUT_FOR_DELIVERY',
                            });
                            setBulkFeedbackToast(
                              `⚡ Dispatched Order #${dispatchModalOrder.orderNumber} with ${pilot.name}!`
                            );
                            setDispatchModalOrder(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            bulkAssignRider([dispatchModalOrder.id], pilot.id);
                            setBulkFeedbackToast(
                              `⚡ Assigned ${pilot.name} to Order #${dispatchModalOrder.orderNumber} (Ready in kitchen)`
                            );
                            setDispatchModalOrder(null);
                          }}
                          className="px-2 py-1.5 rounded-lg bg-[#151917] hover:bg-[#202723] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] text-[10px] font-bold transition-colors cursor-pointer"
                          title="Assign pilot without immediately dispatching"
                        >
                          Assign Only
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#1c211e] bg-[#111413] flex justify-end">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0c0e0d] hover:bg-[#1a201c] text-[#88998f] hover:text-[#e5f4eb] border border-[#1c211e] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
