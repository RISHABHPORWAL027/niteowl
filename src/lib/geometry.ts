// Geometry & Haversine Formula for Zone-Based Concentric Coverage

import { Coordinates, Outlet, ResolvedZoneResult, Zone } from '@/types/database';

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers
 * using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Return rounded to 2 decimal places
  return Math.round(distance * 100) / 100;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats distance into a human-friendly string (e.g. "450 m" or "1.2 km")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Resolves which Outlet and Concentric Zone (Zone 1, Zone 2, Zone 3)
 * a user's coordinate falls into.
 *
 * Algorithm:
 * 1. Calculate distance from user to every active outlet.
 * 2. Find the nearest outlet.
 * 3. Sort that outlet's zones ascending by radiusKm (Zone 1: <800m, Zone 2: 800m-1.5km, Zone 3: 1.5-2.0km).
 * 4. Find the first zone whose radiusKm is >= user distance.
 * 5. If user distance > max radius of all zones (e.g. 2.0 km), mark as out of coverage.
 * 6. Check if the matched zone is currently isActive.
 */
export function resolveZoneByCoords(
  userLat: number,
  userLng: number,
  outlets: Outlet[],
  zonesMap: Record<string, Zone[]>
): ResolvedZoneResult | null {
  if (!outlets || outlets.length === 0) return null;

  // 1. Calculate distances to all open outlets
  const outletDistances = outlets
    .filter((o) => o.isStoreOpen && !o.isRushPaused)
    .map((outlet) => ({
      outlet,
      distanceKm: calculateDistanceKm(userLat, userLng, outlet.lat, outlet.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (outletDistances.length === 0) {
    // If all outlets are closed or paused, pick first outlet to show closed status
    const firstOutlet = outlets[0];
    const defaultZone = zonesMap[firstOutlet.id]?.[0];
    return {
      outlet: firstOutlet,
      zone: defaultZone,
      distanceKm: calculateDistanceKm(
        userLat,
        userLng,
        firstOutlet.lat,
        firstOutlet.lng
      ),
      isCovered: false,
      isZoneActive: false,
      message: 'All NiteOwl hubs are currently closed tonight.',
    };
  }

  const nearest = outletDistances[0];
  const outletZones = (zonesMap[nearest.outlet.id] || []).slice().sort(
    (a, b) => a.radiusKm - b.radiusKm
  );

  if (outletZones.length === 0) return null;

  // Find matching concentric zone
  let matchedZone: Zone | null = null;
  for (const zone of outletZones) {
    if (nearest.distanceKm <= zone.radiusKm) {
      matchedZone = zone;
      break;
    }
  }

  // If outside maximum coverage radius (e.g. > 2.0 km)
  if (!matchedZone) {
    const maxZone = outletZones[outletZones.length - 1];
    return {
      outlet: nearest.outlet,
      zone: maxZone,
      distanceKm: nearest.distanceKm,
      isCovered: false,
      isZoneActive: false,
      message: `You are ${formatDistance(
        nearest.distanceKm
      )} away. Our max midnight delivery radius from ${
        nearest.outlet.name
      } is ${maxZone.radiusKm} km.`,
    };
  }

  // Zone found. Check if manager paused this zone
  if (!matchedZone.isActive) {
    return {
      outlet: nearest.outlet,
      zone: matchedZone,
      distanceKm: nearest.distanceKm,
      isCovered: true,
      isZoneActive: false,
      message: `${matchedZone.name} is temporarily paused tonight due to high kitchen rush or midnight rain. Zone 1 is prioritizing express orders.`,
    };
  }

  return {
    outlet: nearest.outlet,
    zone: matchedZone,
    distanceKm: nearest.distanceKm,
    isCovered: true,
    isZoneActive: true,
  };
}

/**
 * Fallback resolver: matches user by selected Landmark / Customer Location name.
 * Searches across all zones of all outlets for a matching landmark.
 */
export function resolveZoneByLandmark(
  landmark: string,
  outlets: Outlet[],
  zonesMap: Record<string, Zone[]>
): ResolvedZoneResult | null {
  const search = landmark.toLowerCase().trim();

  for (const outlet of outlets) {
    const zones = zonesMap[outlet.id] || [];
    for (const zone of zones) {
      const match = zone.landmarksCovered.some(
        (lm) => lm.toLowerCase().includes(search) || search.includes(lm.toLowerCase())
      );
      if (match) {
        return {
          outlet,
          zone,
          distanceKm: zone.radiusKm * 0.75, // approximate distance
          isCovered: true,
          isZoneActive: zone.isActive,
          message: zone.isActive
            ? undefined
            : `${zone.name} is temporarily paused tonight.`,
        };
      }
    }
  }

  // Default to first outlet Zone 1 if unknown
  const defaultOutlet = outlets[0];
  const defaultZone = zonesMap[defaultOutlet.id]?.[0];
  if (!defaultZone) return null;

  return {
    outlet: defaultOutlet,
    zone: defaultZone,
    distanceKm: 0.5,
    isCovered: true,
    isZoneActive: defaultZone.isActive,
  };
}
