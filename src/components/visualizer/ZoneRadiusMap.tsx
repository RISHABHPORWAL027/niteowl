'use client';

import React from 'react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { Layers, Info } from 'lucide-react';

export function ZoneRadiusMap() {
  const {
    currentOutlet,
    zonesMap,
    currentZone,
    selectedLandmark,
    selectLandmarkManual,
  } = useNiteOwlStore();

  const outletZones = zonesMap[currentOutlet.id] || [];
  const zone1 = outletZones[0];
  const zone2 = outletZones[1];
  const zone3 = outletZones[2];

  const scale = 250 / 2.0; // 125 px per km
  const rZone1 = (zone1?.radiusKm || 0.8) * scale;
  const rZone2 = (zone2?.radiusKm || 1.5) * scale;
  const rZone3 = (zone3?.radiusKm || 2.0) * scale;

  const landmarks = [
    {
      name: 'Bholaram Ustad Marg',
      zone: 'ZONE_1',
      x: 300 - 35,
      y: 300 - 45,
      dist: '380 m',
    },
    {
      name: 'Tower Square Crossing',
      zone: 'ZONE_1',
      x: 300 + 40,
      y: 300 - 55,
      dist: '550 m',
    },
    {
      name: 'Maa Gayatri PG',
      zone: 'ZONE_1',
      x: 300 - 50,
      y: 300 + 35,
      dist: '620 m',
    },
    {
      name: 'Vishnu Puri NX',
      zone: 'ZONE_2',
      x: 300 + 110,
      y: 300 + 60,
      dist: '1.2 km',
    },
    {
      name: 'Rajiv Gandhi Square',
      zone: 'ZONE_2',
      x: 300 - 100,
      y: 300 - 95,
      dist: '1.4 km',
    },
    {
      name: 'Navlakha Bus Stand',
      zone: 'ZONE_3',
      x: 300 + 160,
      y: 300 - 110,
      dist: '1.7 km',
    },
    {
      name: 'Holkar Science College',
      zone: 'ZONE_3',
      x: 300 - 150,
      y: 300 + 140,
      dist: '1.9 km',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-6 bg-[#0c0e0d]">
      <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#75cf5e]">
            <Layers className="w-4 h-4" />
            <span>Geometric Concentric Coverage Radar</span>
          </div>
          <h2 className="text-xl font-black text-[#e5f4eb] mt-1">
            {currentOutlet.name} — Micro-Zone Radius Visualizer
          </h2>
          <p className="text-xs text-[#88998f] mt-1">
            Concentric zones centered at Lat: {currentOutlet.lat}, Lng: {currentOutlet.lng}. Click any landmark pin to test location.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c0e0d] border border-[#239a4e]/40 text-[#75cf5e] font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#75cf5e]" />
            <span>Zone 1 (&lt;800m)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c0e0d] border border-[#239a4e]/20 text-[#88998f] font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#239a4e]" />
            <span>Zone 2 (800m-1.5km)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c0e0d] border border-[#333333] text-[#88998f] font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
            <span>Zone 3 (1.5-2.0km)</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Concentric Radar */}
      <div className="relative w-full aspect-square max-w-2xl mx-auto bg-[#0c0e0d] rounded-3xl border border-[#1c211e] p-4 shadow-2xl flex items-center justify-center overflow-hidden">
        {/* Ambient Radar Background Grid */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#239a4e_1px,transparent_1px),linear-gradient(to_bottom,#239a4e_1px,transparent_1px)] bg-[size:30px_30px]" />

        <svg
          viewBox="0 0 600 600"
          className="w-full h-full select-none"
        >
          {/* Axis lines */}
          <line
            x1="50"
            y1="300"
            x2="550"
            y2="300"
            stroke="#1c211e"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="300"
            y1="50"
            x2="300"
            y2="550"
            stroke="#1c211e"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Zone 3 Ring (1.5km - 2.0km) */}
          <circle
            cx="300"
            cy="300"
            r={rZone3}
            fill={zone3?.isActive ? 'rgba(35, 154, 78, 0.05)' : 'rgba(239, 68, 68, 0.05)'}
            stroke={zone3?.isActive ? '#333333' : '#ef4444'}
            strokeWidth="2"
            strokeDasharray={zone3?.isActive ? 'none' : '6 6'}
          />

          {/* Zone 2 Ring (800m - 1.5km) */}
          <circle
            cx="300"
            cy="300"
            r={rZone2}
            fill={zone2?.isActive ? 'rgba(35, 154, 78, 0.1)' : 'rgba(239, 68, 68, 0.05)'}
            stroke={zone2?.isActive ? '#239a4e' : '#ef4444'}
            strokeWidth="2"
            strokeDasharray={zone2?.isActive ? 'none' : '6 6'}
          />

          {/* Zone 1 Ring (<800m Core) */}
          <circle
            cx="300"
            cy="300"
            r={rZone1}
            fill={zone1?.isActive ? 'rgba(117, 207, 94, 0.15)' : 'rgba(239, 68, 68, 0.05)'}
            stroke={zone1?.isActive ? '#75cf5e' : '#ef4444'}
            strokeWidth="2.5"
          />

          {/* Zone Labels on Radar */}
          <text
            x="305"
            y={300 - rZone1 + 16}
            fill="#75cf5e"
            fontSize="11"
            fontWeight="bold"
          >
            Zone 1 (&lt; 800m)
          </text>
          <text
            x="305"
            y={300 - rZone2 + 16}
            fill="#239a4e"
            fontSize="11"
            fontWeight="bold"
          >
            Zone 2 (1.5 km)
          </text>
          <text
            x="305"
            y={300 - rZone3 + 16}
            fill="#88998f"
            fontSize="11"
            fontWeight="bold"
          >
            Zone 3 (2.0 km Max)
          </text>

          {/* Center NiteOwl Hub Pin */}
          <g transform="translate(300, 300)">
            <circle r="20" fill="#75cf5e" className="animate-pulse opacity-25" />
            <circle r="14" fill="#75cf5e" stroke="#0c0e0d" strokeWidth="2" />
            <text
              y="4"
              textAnchor="middle"
              fontSize="12"
              fill="#0c0e0d"
              fontWeight="bold"
            >
              🦉
            </text>
            <text
              y="28"
              textAnchor="middle"
              fontSize="11"
              fill="#75cf5e"
              fontWeight="bold"
            >
              {currentOutlet.name}
            </text>
          </g>

          {/* Landmark Pins */}
          {landmarks.map((lm) => {
            const isSelected = selectedLandmark === lm.name;
            return (
              <g
                key={lm.name}
                transform={`translate(${lm.x}, ${lm.y})`}
                onClick={() => selectLandmarkManual(lm.name)}
                className="cursor-pointer group"
              >
                {isSelected && (
                  <circle
                    r="16"
                    fill="none"
                    stroke="#75cf5e"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}
                <circle
                  r={isSelected ? 10 : 7}
                  fill={isSelected ? '#75cf5e' : '#1c211e'}
                  stroke={isSelected ? '#0c0e0d' : '#88998f'}
                  strokeWidth="2"
                  className="transition-all group-hover:scale-125"
                />
                <text
                  y="-12"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={isSelected ? '#75cf5e' : '#88998f'}
                  className="pointer-events-none drop-shadow"
                >
                  {lm.name.split(' ')[0]} ({lm.dist})
                </text>
              </g>
            );
          })}
        </svg>

        {/* Info overlay */}
        <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#151917]/95 backdrop-blur-md border border-[#1c211e] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#75cf5e] shrink-0" />
            <span className="text-[#88998f]">
              Selected: <strong className="text-[#e5f4eb]">{selectedLandmark}</strong> ({currentZone?.name})
            </span>
          </div>
          <span className="text-[#75cf5e] font-bold">
            {currentZone?.deliveryFee === 0 ? 'FREE Express' : `₹${currentZone?.deliveryFee} Delivery`}
          </span>
        </div>
      </div>
    </div>
  );
}
