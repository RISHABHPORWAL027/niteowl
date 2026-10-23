'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, ZoomIn, ZoomOut, Navigation, Crosshair } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface GoogleMapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

export function GoogleMapPicker({
  lat,
  lng,
  onLocationChange,
  className = '',
}: GoogleMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [isReady, setIsReady] = useState(false);

  // Initialize Leaflet Map with Google Maps Tiles
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      // Create Custom Google-style Pin Marker HTML
      const pinIcon = L.divIcon({
        className: 'custom-google-marker',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
            <div style="position: absolute; top: 0; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: #ea4335; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center;">
            </div>
            <div style="position: absolute; top: 6px; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; z-index: 2; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);"></div>
            <div style="position: absolute; bottom: -4px; width: 12px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.3); filter: blur(1px);"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      // Initialize map instance centered on [lat, lng]
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      // Google Maps Tile URL mapping:
      // m = roadmap (Standard Google Maps)
      // y = hybrid (Satellite imagery + road labels)
      // p = terrain (Physical terrain with contour)
      const tileType = mapStyle === 'satellite' ? 'y' : mapStyle === 'terrain' ? 'p' : 'm';
      const tileLayer = L.tileLayer(
        `https://mt{s}.google.com/vt/lyrs=${tileType}&x={x}&y={y}&z={z}`,
        {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 20,
        }
      ).addTo(map);

      tileLayerRef.current = tileLayer;

      // Add draggable Marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      // Handle marker drag
      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));
        onLocationChange(newLat, newLng);
      });

      // Handle map click
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));
        onLocationChange(newLat, newLng);
      });

      mapRef.current = map;
      markerRef.current = marker;
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
  }, []); // Run once on mount

  // Sync external coordinates update (e.g. GPS locating or preset tap)
  useEffect(() => {
    if (mapRef.current && markerRef.current && isReady) {
      const current = markerRef.current.getLatLng();
      if (
        Math.abs(current.lat - lat) > 0.00001 ||
        Math.abs(current.lng - lng) > 0.00001
      ) {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom(), {
          animate: true,
          duration: 0.5,
        });
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng, isReady]);

  // Switch Google Maps Layer Style (Roadmap vs Satellite vs Terrain)
  const switchMapStyle = async (newStyle: 'roadmap' | 'satellite' | 'terrain') => {
    setMapStyle(newStyle);
    if (!mapRef.current) return;

    const L = (await import('leaflet')).default;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const tileType = newStyle === 'satellite' ? 'y' : newStyle === 'terrain' ? 'p' : 'm';
    const newLayer = L.tileLayer(
      `https://mt{s}.google.com/vt/lyrs=${tileType}&x={x}&y={y}&z={z}`,
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }
    ).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 bg-[#e8ece9] shadow-inner select-none ${className}`}
    >
      {/* Real Google Maps Tile Canvas */}
      <div ref={containerRef} className="w-full h-full z-10" />

      {/* Google Attribution Badge */}
      <div className="absolute top-2.5 left-2.5 z-20 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-700 shadow-xs border border-gray-200 flex items-center gap-1 pointer-events-none">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
        <span className="text-gray-500 font-normal ml-0.5">Maps</span>
      </div>

      {/* Layer Toggle (Roadmap / Satellite) */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => switchMapStyle('roadmap')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            mapStyle === 'roadmap'
              ? 'bg-[#239a4e] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => switchMapStyle('satellite')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            mapStyle === 'satellite'
              ? 'bg-[#239a4e] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Interactive Floating Zoom Controls */}
      <div className="absolute bottom-14 right-2.5 z-20 flex flex-col gap-1 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 bg-white/95 hover:bg-white text-gray-800 rounded-lg flex items-center justify-center font-bold text-sm border border-gray-200 cursor-pointer shadow-xs active:scale-95 transition-transform"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 bg-white/95 hover:bg-white text-gray-800 rounded-lg flex items-center justify-center font-bold text-sm border border-gray-200 cursor-pointer shadow-xs active:scale-95 transition-transform"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Hint */}
      {!isReady && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 z-30">
          <span className="w-4 h-4 border-2 border-[#239a4e] border-t-transparent rounded-full animate-spin" />
          <span>Loading Google Map...</span>
        </div>
      )}
    </div>
  );
}
