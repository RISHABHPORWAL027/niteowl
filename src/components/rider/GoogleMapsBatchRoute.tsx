'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { BHAWARKUA_HUB_COORDS } from '@/lib/realtimeSync';
import { BatchStop } from '@/lib/batchRouting';

interface GoogleMapsBatchRouteProps {
  stops: BatchStop[];
  activeStopIndex: number;
  onSelectStop: (index: number) => void;
  riderName?: string;
  isJourneyStarted?: boolean;
  className?: string;
}

export function GoogleMapsBatchRoute({
  stops,
  activeStopIndex,
  onSelectStop,
  riderName = 'Pilot Suresh',
  isJourneyStarted = false,
  className = '',
}: GoogleMapsBatchRouteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const riderMarkerRef = useRef<any>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isReady, setIsReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      // Center map between Hub and stops, or default to Bhawarkua
      const centerLat = stops.length > 0
        ? (BHAWARKUA_HUB_COORDS.lat + stops[0].coords.lat) / 2
        : BHAWARKUA_HUB_COORDS.lat;
      const centerLng = stops.length > 0
        ? (BHAWARKUA_HUB_COORDS.lng + stops[0].coords.lng) / 2
        : BHAWARKUA_HUB_COORDS.lng;

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Google Maps Tile Layer
      // lyrs=m (Standard Roadmap), lyrs=s (Satellite), lyrs=y (Hybrid)
      const tileCode = mapType === 'satellite' ? 's' : mapType === 'hybrid' ? 'y' : 'm';
      L.tileLayer(`https://mt1.google.com/vt/lyrs=${tileCode}&x={x}&y={y}&z={z}`, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);

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
  }, []);

  // Update Markers and Route Lines whenever stops or activeStopIndex changes
  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    let isMounted = true;

    async function updateLayers() {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapRef.current) return;

      const map = mapRef.current;

      // 1. Clear old markers and polylines
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.remove());
      polylinesRef.current = [];
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove();
        riderMarkerRef.current = null;
      }

      // 2. Kitchen Hub Origin Marker
      const hubIcon = L.divIcon({
        className: 'custom-hub-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #0c0e0d; border: 3px solid #239a4e; box-shadow: 0 4px 14px rgba(35,154,78,0.5); display: flex; align-items: center; justify-content: center; font-size: 20px;">
              🦉
            </div>
            <div style="margin-top: 3px; padding: 2px 7px; border-radius: 9999px; background: rgba(12,14,13,0.95); color: #75cf5e; font-size: 9px; font-weight: 900; white-space: nowrap; border: 1px solid #239a4e;">
              Bhawarkua Kitchen
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const hubMarker = L.marker([BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng], {
        icon: hubIcon,
        zIndexOffset: 200,
      }).addTo(map);
      markersRef.current.push(hubMarker);

      // 3. Connect Multi-Stop Points Polyline
      const fullPoints: [number, number][] = [
        [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
        ...stops.map((s) => [s.coords.lat, s.coords.lng] as [number, number]),
      ];

      if (fullPoints.length >= 2) {
        // Outer glowing path
        const glowPoly = L.polyline(fullPoints, {
          color: '#239a4e',
          weight: 7,
          opacity: 0.3,
        }).addTo(map);
        polylinesRef.current.push(glowPoly);

        // Core sharp dashed path
        const corePoly = L.polyline(fullPoints, {
          color: '#75cf5e',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.9,
        }).addTo(map);
        polylinesRef.current.push(corePoly);
      }

      // 4. Place Numbered Google-Style Delivery Stop Pins
      const allBoundsPoints: [number, number][] = [
        [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
      ];

      stops.forEach((stop, index) => {
        const isCurrent = index === activeStopIndex && isJourneyStarted && !stop.isDelivered;
        const isDelivered = stop.isDelivered;

        allBoundsPoints.push([stop.coords.lat, stop.coords.lng]);

        // Pin styling:
        // - Delivered: Green with checkmark
        // - Current Active: High-contrast pulsing amber/emerald with radar ring
        // - Upcoming: Sleek dark pin with bold white number
        const bgColor = isDelivered
          ? '#239a4e'
          : isCurrent
          ? '#eab308' // Amber focus
          : '#1e293b';

        const labelContent = isDelivered
          ? '✓'
          : `${stop.stopNumber}`;

        const pinHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            ${
              isCurrent
                ? `<div style="position: absolute; top: -6px; width: 48px; height: 48px; border-radius: 50%; background: rgba(234,179,8,0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ''
            }
            <div style="position: relative; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: ${bgColor}; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); color: #ffffff; font-size: ${isDelivered ? '14px' : '12px'}; font-weight: 900; line-height: 1;">
                ${labelContent}
              </span>
            </div>
            <div style="margin-top: 2px; padding: 2px 6px; border-radius: 6px; background: rgba(12,14,13,0.95); color: #ffffff; font-size: 9px; font-weight: 800; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); max-width: 120px; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${isDelivered ? 'Delivered' : `Stop #${stop.stopNumber}`}
            </div>
          </div>
        `;

        const stopIcon = L.divIcon({
          className: `custom-stop-marker-${index}`,
          html: pinHtml,
          iconSize: [36, 46],
          iconAnchor: [18, 46],
        });

        const marker = L.marker([stop.coords.lat, stop.coords.lng], {
          icon: stopIcon,
          zIndexOffset: isCurrent ? 500 : isDelivered ? 100 : 300,
        }).addTo(map);

        marker.on('click', () => {
          onSelectStop(index);
        });

        markersRef.current.push(marker);
      });

      // 5. Rider Motorbike Marker on Active Leg
      if (isJourneyStarted && stops.length > 0 && activeStopIndex < stops.length) {
        const targetStop = stops[activeStopIndex];
        const prevCoord = activeStopIndex === 0
          ? BHAWARKUA_HUB_COORDS
          : stops[activeStopIndex - 1].coords;

        // Position rider ~40% along current leg
        const riderLat = prevCoord.lat + (targetStop.coords.lat - prevCoord.lat) * 0.45;
        const riderLng = prevCoord.lng + (targetStop.coords.lng - prevCoord.lng) * 0.45;

        const riderIcon = L.divIcon({
          className: 'custom-rider-batch-marker',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
              <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(117,207,94,0.3); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #239a4e; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(35,154,78,0.7); display: flex; align-items: center; justify-content: center; font-size: 16px;">
                🏍️
              </div>
              <div style="margin-top: 2px; padding: 1.5px 6px; border-radius: 9999px; background: #ffffff; color: #0c0e0d; font-size: 8px; font-weight: 900; border: 1px solid #239a4e; white-space: nowrap;">
                En Route &rarr; Stop #${activeStopIndex + 1}
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const riderMarker = L.marker([riderLat, riderLng], {
          icon: riderIcon,
          zIndexOffset: 600,
        }).addTo(map);

        riderMarkerRef.current = riderMarker;
      }

      // 6. Fit Bounds to display all stops comfortably
      if (allBoundsPoints.length > 1) {
        const bounds = L.latLngBounds(allBoundsPoints);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 17 });
      }
    }

    updateLayers();

    return () => {
      isMounted = false;
    };
  }, [isReady, stops, activeStopIndex, isJourneyStarted]);

  // Handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = async () => {
    if (!mapRef.current) return;
    const L = (await import('leaflet')).default;
    const allBoundsPoints: [number, number][] = [
      [BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng],
      ...stops.map((s) => [s.coords.lat, s.coords.lng] as [number, number]),
    ];
    if (allBoundsPoints.length > 1) {
      mapRef.current.fitBounds(L.latLngBounds(allBoundsPoints), { padding: [50, 50], maxZoom: 17 });
    } else {
      mapRef.current.setView([BHAWARKUA_HUB_COORDS.lat, BHAWARKUA_HUB_COORDS.lng], 16);
    }
  };

  // Google Maps Multi-Stop Navigation URL
  const getGoogleMapsDirectionsUrl = () => {
    const origin = `${BHAWARKUA_HUB_COORDS.lat},${BHAWARKUA_HUB_COORDS.lng}`;
    if (stops.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${origin}`;
    }

    const lastStop = stops[stops.length - 1];
    const destination = `${lastStop.coords.lat},${lastStop.coords.lng}`;

    const waypoints = stops
      .slice(0, stops.length - 1)
      .map((s) => `${s.coords.lat},${s.coords.lng}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }&travelmode=two-wheeler`;
  };

  const completedCount = stops.filter((s) => s.isDelivered).length;

  return (
    <div className={`relative isolate z-0 w-full overflow-hidden rounded-3xl border border-[#1c211e] bg-[#0c0e0d] shadow-xl ${className}`}>
      {/* Map DOM Element */}
      <div ref={containerRef} className="w-full h-full min-h-[320px]" />

      {/* Top Left Overlay Badge: Multi-Stop Batch Status */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0c0e0d]/90 backdrop-blur-md border border-[#239a4e]/50 text-xs font-bold shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#75cf5e] animate-ping" />
          <span className="text-[#e5f4eb] flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#75cf5e]" />
            {stops.length === 0
              ? 'Bhawarkua Central Hub'
              : completedCount === stops.length
              ? '🎉 All Stops Completed'
              : isJourneyStarted
              ? `Heading to Stop #${activeStopIndex + 1} of ${stops.length}`
              : `Batch Route: ${stops.length} Stops Ready`}
          </span>
        </div>

        {stops.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0c0e0d]/85 backdrop-blur-md border border-[#1c211e] text-[10px] text-[#88998f] font-mono pointer-events-auto">
            <span>Progress:</span>
            <span className="text-[#75cf5e] font-black">{completedCount} / {stops.length} Delivered</span>
          </div>
        )}
      </div>

      {/* Top Right Controls: Google Maps External Button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <a
          href={getGoogleMapsDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-[#0c0e0d]/90 hover:bg-[#181d1a] backdrop-blur-md border border-[#239a4e]/40 text-[#75cf5e] text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          title="Open complete multi-stop journey in Google Maps app"
        >
          <span>Google Maps</span>
          <ExternalLink className="w-3 h-3 text-[#75cf5e]" />
        </a>
      </div>

      {/* Bottom Map Floating Controls (Recenter, Zoom) */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="w-8 h-8 rounded-xl bg-[#0c0e0d]/95 hover:bg-[#181d1a] text-[#88998f] hover:text-[#75cf5e] shadow-md border border-[#1c211e] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Fit All Stops"
        >
          <Navigation className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-xl bg-[#0c0e0d]/95 hover:bg-[#181d1a] text-[#88998f] hover:text-[#e5f4eb] shadow-md border border-[#1c211e] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-xl bg-[#0c0e0d]/95 hover:bg-[#181d1a] text-[#88998f] hover:text-[#e5f4eb] shadow-md border border-[#1c211e] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
