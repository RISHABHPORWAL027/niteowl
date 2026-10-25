import { Order } from '@/types/database';
import { BHAWARKUA_HUB_COORDS, INDORE_LANDMARK_COORDS } from './realtimeSync';

export interface BatchStop {
  order: Order;
  stopNumber: number; // 1, 2, 3...
  coords: { lat: number; lng: number };
  distanceFromPrevKm: number;
  cumulativeDistanceKm: number;
  estimatedMinutes: number;
  isDelivered: boolean;
}

/**
 * Great-circle distance between two GPS coordinates in kilometers
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Resolve exact coordinates for an order based on address details and Indore landmarks
 */
export function getOrderCoordinates(order: Order, indexOffset = 0): { lat: number; lng: number } {
  // 1. Direct coordinates if present in order
  const addrAny = order.addressDetails as any;
  if (addrAny.lat && addrAny.lng) {
    return { lat: Number(addrAny.lat), lng: Number(addrAny.lng) };
  }

  const query = `${order.addressDetails.hostelPgOrFlat || ''} ${order.addressDetails.landmark || ''}`.toLowerCase();

  // 2. Specific Bhawarkua Landmark matches
  if (query.includes('bholaram')) {
    return { lat: 22.6955 + indexOffset * 0.0008, lng: 75.8635 + indexOffset * 0.0005 };
  }
  if (query.includes('maa gayatri') || query.includes('gayatri')) {
    return { lat: 22.6942, lng: 75.8628 };
  }
  if (query.includes('panchsheel')) {
    return { lat: 22.6962, lng: 75.8658 };
  }
  if (query.includes('radha krishna')) {
    return { lat: 22.6950, lng: 75.8642 };
  }
  if (query.includes('tower square') || query.includes('tower')) {
    return { lat: 22.6975, lng: 75.8710 };
  }
  if (query.includes('vishnu puri') || query.includes('vishnupuri')) {
    return { lat: 22.6882, lng: 75.8638 };
  }
  if (query.includes('rajiv gandhi')) {
    return { lat: 22.6845, lng: 75.8592 };
  }
  if (query.includes('navlakha')) {
    return { lat: 22.6990, lng: 75.8760 };
  }
  if (query.includes('sapna sangeeta')) {
    return { lat: 22.7030, lng: 75.8720 };
  }
  if (query.includes('holkar')) {
    return { lat: 22.6980, lng: 75.8690 };
  }

  // 3. Match from INDORE_LANDMARK_COORDS
  for (const [key, val] of Object.entries(INDORE_LANDMARK_COORDS)) {
    if (query.includes(key.toLowerCase())) {
      return { lat: val.lat + indexOffset * 0.0005, lng: val.lng + indexOffset * 0.0005 };
    }
  }

  // 4. Default to Zone 1 Bholaram with slight deterministic offset
  const baseLat = 22.6948;
  const baseLng = 75.8640;
  const hash = order.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const offsetLat = ((hash % 10) - 5) * 0.0004;
  const offsetLng = (((hash >> 2) % 10) - 5) * 0.0004;

  return {
    lat: Number((baseLat + offsetLat).toFixed(6)),
    lng: Number((baseLng + offsetLng).toFixed(6)),
  };
}

/**
 * Optimizes a batch of orders by nearest neighbor from the Bhawarkua Central Hub
 * Stops are sorted: Stop #1 (nearest from Hub), Stop #2 (nearest from Stop 1), etc.
 */
export function optimizeBatchRoute(
  orders: Order[],
  hubCoords = BHAWARKUA_HUB_COORDS
): BatchStop[] {
  if (!orders || orders.length === 0) return [];

  const unvisited = orders.map((order, idx) => ({
    order,
    coords: getOrderCoordinates(order, idx),
  }));

  const result: BatchStop[] = [];
  let currentPos = { lat: hubCoords.lat, lng: hubCoords.lng };
  let cumDistance = 0;

  while (unvisited.length > 0) {
    // Find nearest order to current position
    let nearestIdx = 0;
    let minDistance = getDistanceKm(
      currentPos.lat,
      currentPos.lng,
      unvisited[0].coords.lat,
      unvisited[0].coords.lng
    );

    for (let i = 1; i < unvisited.length; i++) {
      const d = getDistanceKm(
        currentPos.lat,
        currentPos.lng,
        unvisited[i].coords.lat,
        unvisited[i].coords.lng
      );
      if (d < minDistance) {
        minDistance = d;
        nearestIdx = i;
      }
    }

    const [nearest] = unvisited.splice(nearestIdx, 1);
    cumDistance += minDistance;

    // Estimate ~4 mins per km late night in Indore + 2 mins buffer
    const estMins = Math.max(4, Math.round(cumDistance * 3.8 + 2));

    result.push({
      order: nearest.order,
      stopNumber: result.length + 1,
      coords: nearest.coords,
      distanceFromPrevKm: Math.round(minDistance * 100) / 100,
      cumulativeDistanceKm: Math.round(cumDistance * 100) / 100,
      estimatedMinutes: estMins,
      isDelivered: nearest.order.orderStatus === 'DELIVERED',
    });

    currentPos = nearest.coords;
  }

  return result;
}
