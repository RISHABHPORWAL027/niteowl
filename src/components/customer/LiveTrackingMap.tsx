'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  Bike,
  Sparkles,
  Gauge,
  FastForward,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {
  BHAWARKUA_HUB_COORDS,
  getRouteForLandmark,
  interpolatePosition,
} from '@/lib/realtimeSync';
import { OrderStatus } from '@/types/database';

interface LiveTrackingMapProps {
  orderStatus: OrderStatus;
  landmarkName?: string;
  riderName?: string;
  onProgressUpdate?: (progress: number, remainingMins: number) => void;
  className?: string;
}

export function LiveTrackingMap({
  orderStatus,
  landmarkName = 'Bholaram Ustad Marg',
  riderName = 'Pilot Suresh',
  onProgressUpdate,
  className = '',
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [isReady, setIsReady] = useState(false);
  const [driverProgress, setDriverProgress] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x normal, 5x fast

  const routeData = getRouteForLandmark(landmarkName);
  const waypoints = routeData.waypoints;
  const destination = routeData.destination;

  // Initialize Leaflet Map with Google Maps Roadmap Tiles
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      // 1. Initialize Map
      const map = L.map(containerRef.current, {
        center: [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // 2. Google Maps Road Tile Layer
      L.tileLayer(
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }
      ).addTo(map);

      // 3. Draw Route Polyline
      // Outer glow polyline
      L.polyline(waypoints, {
        color: '#239a4e',
        weight: 8,
        opacity: 0.25,
      }).addTo(map);

      // Inner sharp route polyline
      const poly = L.polyline(waypoints, {
        color: '#239a4e',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.9,
      }).addTo(map);
      routePolylineRef.current = poly;

      // 4. Kitchen Hub Marker (Origin)
      const hubIcon = L.divIcon({
        className: 'custom-hub-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #ffffff; border: 2.5px solid #239a4e; box-shadow: 0 4px 12px rgba(35,154,78,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px;">
              🦉
            </div>
            <div style="margin-top: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(12,14,13,0.9); color: #ffffff; font-size: 9px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);">
              Bhawarkua Hub
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng], {
        icon: hubIcon,
        zIndexOffset: 100,
      })
        .addTo(map)
        .bindPopup('<strong>Bhawarkua Central Hub</strong><br/>Midnight Kitchen');

      // 5. Customer Delivery Destination Marker
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #111827; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 16px;">
              🏠
            </div>
            <div style="margin-top: 4px; padding: 2px 6px; border-radius: 6px; background: #ffffff; color: #111827; font-size: 9px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid #e5e7eb; max-width: 130px; overflow: hidden; text-overflow: ellipsis;">
              ${landmarkName}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([destination.lat, destination.lng], {
        icon: destIcon,
        zIndexOffset: 100,
      })
        .addTo(map)
        .bindPopup(`<strong>Delivery Point</strong><br/>${landmarkName}`);

      // 6. Live Rider / Pilot Marker
      const riderIcon = L.divIcon({
        className: 'custom-rider-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
            <!-- Pulsing radar ring -->
            <div style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(35,154,78,0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            
            <!-- Motorbike Pin -->
            <div style="position: relative; width: 38px; height: 38px; border-radius: 50%; background: #239a4e; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(35,154,78,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #ffffff;">
              🏍️
            </div>
            
            <!-- Driver Tag -->
            <div style="margin-top: 3px; padding: 2px 7px; border-radius: 9999px; background: #ffffff; border: 1.5px solid #239a4e; color: #111827; font-size: 9px; font-weight: 900; box-shadow: 0 2px 6px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
              <span style="width: 5px; height: 5px; border-radius: 50%; background: #239a4e;"></span>
              <span>${riderName}</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const initialPos =
        orderStatus === 'OUT_FOR_DELIVERY'
          ? interpolatePosition(waypoints, 0.2)
          : orderStatus === 'DELIVERED'
          ? destination
          : BHAWARKUA_HUB_COORDS;

      const riderMarker = L.marker([initialPos.lat, initialPos.lng], {
        icon: riderIcon,
        zIndexOffset: 500,
      }).addTo(map);

      riderMarkerRef.current = riderMarker;

      // Fit bounds to show both Hub and Destination comfortably
      const bounds = L.latLngBounds([
        [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
        [destination.lat, destination.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });

      mapRef.current = map;
      setIsReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [landmarkName]);

  // Automatic Smooth Movement along Route when status is OUT_FOR_DELIVERY
  useEffect(() => {
    if (!isReady || !riderMarkerRef.current) return;

    if (orderStatus === 'DELIVERED') {
      setDriverProgress(1);
      riderMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      if (onProgressUpdate) onProgressUpdate(1, 0);
      return;
    }

    if (orderStatus !== 'OUT_FOR_DELIVERY') {
      setDriverProgress(0);
      riderMarkerRef.current.setLatLng([
        BHAWARKUA_HUB_COORDS.lat,
        BHAWARKUA_HUB_COORDS.lng,
      ]);
      if (onProgressUpdate) onProgressUpdate(0, 11);
      return;
    }

    // Auto-advance progress every 1.5s
    const stepInterval = 1500 / simSpeed;
    const progressStep = 0.035 * simSpeed;

    const interval = setInterval(() => {
      setDriverProgress((prev) => {
        const next = Math.min(prev + progressStep, 1);
        const pos = interpolatePosition(waypoints, next);

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([pos.lat, pos.lng]);
        }

        // Calculate dynamic ETA (from ~11 mins down to 0)
        const remainingMins = Math.max(1, Math.round((1 - next) * 11));
        if (onProgressUpdate) {
          onProgressUpdate(next, remainingMins);
        }

        return next;
      });
    }, stepInterval);

    return () => clearInterval(interval);
  }, [isReady, orderStatus, simSpeed, waypoints, destination]);

  // Zoom / Recenter Handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = async () => {
    if (!mapRef.current) return;
    const L = (await import('leaflet')).default;
    const bounds = L.latLngBounds([
      [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
      [destination.lat, destination.lng],
    ]);
    mapRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
  };

  const remainingMinsDisplay = Math.max(
    1,
    Math.round((1 - driverProgress) * 11)
  );

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-md ${className}`}>
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />

      {/* Top Overlay Badge: Live GPS Status */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 text-[#239a4e] text-xs font-bold shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#239a4e] animate-ping" />
          <span>
            {orderStatus === 'OUT_FOR_DELIVERY'
              ? `PILOT EN ROUTE (~${remainingMinsDisplay} MINS)`
              : orderStatus === 'DELIVERED'
              ? 'ARRIVED AT DESTINATION'
              : 'KITCHEN PREPARING'}
          </span>
        </div>
      </div>

      {/* Top Right Simulation Speed Switcher (for easy testing) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-2xl border border-gray-200 shadow-md">
        <button
          type="button"
          onClick={() => setSimSpeed(1)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            simSpeed === 1
              ? 'bg-[#239a4e] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Normal real-time speed"
        >
          1x
        </button>
        <button
          type="button"
          onClick={() => setSimSpeed(5)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
            simSpeed === 5
              ? 'bg-[#239a4e] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Fast-forward GPS speed"
        >
          <FastForward className="w-3 h-3" />
          <span>5x</span>
        </button>
      </div>

      {/* Bottom Map Floating Controls (Zoom & Recenter) */}
      <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-gray-700 hover:text-[#239a4e] shadow-md border border-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Center on Route"
        >
          <Navigation className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-gray-700 shadow-md border border-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Distance Gauge */}
      <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-md flex items-center gap-2 text-xs">
        <Bike className="w-4 h-4 text-[#239a4e]" />
        <div className="text-[11px] font-bold text-gray-800">
          <span>{orderStatus === 'DELIVERED' ? '0.0 km' : `${((1 - driverProgress) * 1.1).toFixed(1)} km left`}</span>
          <span className="text-gray-400 font-normal"> to gate</span>
        </div>
      </div>
    </div>
  );
}
