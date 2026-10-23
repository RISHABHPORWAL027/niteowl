'use client';

import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  Code,
  MapPin,
  Layers,
  Server,
  Activity,
  Zap,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  endpoint: string;
  status: 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';
  latencyMs?: number;
  dataSummary?: string;
  error?: string;
}

export function ArchitectureViewer() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<
    'microservices' | 'firestore' | 'prisma' | 'mongoose' | 'geometry' | 'stitch'
  >('microservices');

  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({
    orders: { name: 'Orders Microservice', endpoint: '/api/orders', status: 'IDLE' },
    hubs: { name: 'Kitchen Hubs Microservice', endpoint: '/api/hubs', status: 'IDLE' },
    fleet: { name: 'Fleet & Logistics Microservice', endpoint: '/api/riders', status: 'IDLE' },
    menu: { name: 'Midnight Menu Microservice', endpoint: '/api/menu', status: 'IDLE' },
  });
  const [isProbing, setIsProbing] = useState(false);

  const handleCopy = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const probeAllServices = async () => {
    setIsProbing(true);
    const services = [
      { key: 'orders', endpoint: '/api/orders' },
      { key: 'hubs', endpoint: '/api/hubs' },
      { key: 'fleet', endpoint: '/api/riders' },
      { key: 'menu', endpoint: '/api/menu' },
    ];

    for (const s of services) {
      setServiceStatuses((prev) => ({
        ...prev,
        [s.key]: { ...prev[s.key], status: 'LOADING' },
      }));

      const start = performance.now();
      try {
        const res = await fetch(s.endpoint);
        const latency = Math.round(performance.now() - start);
        const data = await res.json();

        let summary = 'OK';
        if (s.key === 'orders') summary = `${data.count ?? data.orders?.length ?? 0} active orders`;
        if (s.key === 'hubs') summary = `${data.outlets?.length ?? 0} kitchen outlets operational`;
        if (s.key === 'fleet') summary = `${data.riders?.length ?? 0} pilots on roster`;
        if (s.key === 'menu') summary = `${data.items?.length ?? 0} late-night menu items`;

        setServiceStatuses((prev) => ({
          ...prev,
          [s.key]: {
            ...prev[s.key],
            status: res.ok ? 'SUCCESS' : 'ERROR',
            latencyMs: latency,
            dataSummary: summary,
            error: res.ok ? undefined : data.error || 'Request failed',
          },
        }));
      } catch (err: any) {
        setServiceStatuses((prev) => ({
          ...prev,
          [s.key]: {
            ...prev[s.key],
            status: 'ERROR',
            error: err.message || 'Connection failed',
          },
        }));
      }
    }
    setIsProbing(false);
  };

  const firestoreRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Orders Microservice Collection
    match /orders/{orderId} {
      allow read: if true;
      allow create: if request.resource.data.items.size() > 0;
      allow update: if request.resource.data.orderStatus in [
        'PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
      ];
      allow delete: if false; // Immutable audit log
    }

    // Hubs Microservice Collection
    match /outlets/{outletId} {
      allow read: if true;
      allow write: if true; // Admin restricted in prod
    }

    // Concentric Zones
    match /zones/{zoneId} {
      allow read: if true;
      allow write: if true;
    }

    // Fleet & Delivery Pilots
    match /riders/{riderId} {
      allow read: if true;
      allow write: if true;
    }

    // Midnight Catalog & Menu
    match /menu/{itemId} {
      allow read: if true;
      allow write: if false; // Catalog is read-only for customers
    }
  }
}`;

  const prismaSchemaCode = `// Prisma Schema for NiteOwl - Multi-Outlet & Zone-Based Delivery Architecture

model Outlet {
  id              String   @id @default(uuid())
  name            String   // e.g. "Bhawarkua Hub"
  slug            String   @unique
  address         String
  lat             Float    // 22.6926
  lng             Float    // 75.8676
  openingTime     String   @default("19:00") // 7:00 PM
  closingTime     String   @default("04:00") // 4:00 AM
  isStoreOpen     Boolean  @default(true)
  isRushPaused    Boolean  @default(false)
  surgeMultiplier Float    @default(1.0)
  zones           Zone[]
  inventories     OutletInventory[]
  orders          Order[]
}

model Zone {
  id                    String   @id @default(uuid())
  outletId              String
  name                  String   // e.g. "Zone 1: Bholaram Core"
  zoneCode              ZoneCode @default(ZONE_1)
  radiusKm              Float    // Upper bound: 0.8, 1.5, 2.0
  minRadiusKm           Float    @default(0.0)
  landmarksCovered      String[] // ["Bholaram", "Vishnu Puri", "Navlakha"]
  minOrderValue         Float    @default(89.0) // ₹89 min threshold
  deliveryFee           Float    @default(0.0)  // Zone 1 = ₹0, Zone 3 = ₹25
  freeDeliveryThreshold Float?   @default(149.0)
  estimatedDeliveryMins Int      @default(15)
  isActive              Boolean  @default(true) // Hub Manager live toggle
  outlet                Outlet   @relation(fields: [outletId], references: [id])
  orders                Order[]
}

model MenuItem {
  id          String         @id @default(uuid())
  name        String
  slug        String         @unique
  category    ItemCategory
  basePrice   Float
  imageUrl    String?
  isVeg       Boolean        @default(true)
  rating      Float          @default(4.8)
  inventories OutletInventory[]
}

model Order {
  id             String        @id @default(uuid())
  orderNumber    String        @unique // e.g. "NO-BHW-8941"
  outletId       String
  zoneId         String
  customerName   String
  customerPhone  String
  addressDetails Json          // { hostelPgOrFlat, roomNo, leaveAtGate, silentDelivery, maskedCall }
  items          Json          // [{ menuItemId, name, price, quantity }]
  subtotal       Float
  deliveryFee    Float
  packagingFee   Float         @default(5.0)
  total          Float
  orderStatus    OrderStatus   @default(PLACED)
  paymentMethod  PaymentMethod @default(RAZORPAY)
  paymentStatus  PaymentStatus @default(PAID)
  createdAt      DateTime      @default(now())
}`;

  const mongooseCode = `// MongoDB Mongoose Geospatial Schemas for NiteOwl

export const OutletMongooseSchema = {
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  isStoreOpen: { type: Boolean, default: true },
  isRushPaused: { type: Boolean, default: false },
};

export const ZoneMongooseSchema = {
  outletId: { type: 'ObjectId', ref: 'Outlet', required: true },
  name: { type: String, required: true },
  radiusKm: { type: Number, required: true },
  minRadiusKm: { type: Number, default: 0.0 },
  landmarksCovered: [{ type: String }],
  minOrderValue: { type: Number, default: 89.0 },
  deliveryFee: { type: Number, default: 0.0 },
  freeDeliveryThreshold: { type: Number, default: 149.0 },
  isActive: { type: Boolean, default: true },
};`;

  const geometryCode = `// Haversine Sphere Formula for Hyper-Local Concentric Radial Dispatch

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
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
}`;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6 text-[#e5f4eb] bg-[#0c0e0d]">
      <div className="p-6 rounded-2xl bg-[#151917] border border-[#1c211e] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#75cf5e]">
            <Server className="w-4 h-4" />
            <span>Architecture &amp; Microservices</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#1c211e] text-[#75cf5e] border border-[#75cf5e]/30">
            Microservices Decoupled
          </span>
        </div>

        <h2 className="text-2xl font-black text-[#e5f4eb]">
          NiteOwl Microservices Architecture &amp; Schemas
        </h2>
        <p className="text-xs text-[#88998f] leading-relaxed">
          Decoupled domain services for Orders, Kitchen Hubs, Fleet Logistics, Midnight Menu Catalog, and Razorpay Payments with Dual-Mode (Development In-Memory vs. Production Cloud Firestore) persistence.
        </p>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setActiveSchemaTab('microservices')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSchemaTab === 'microservices'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Microservices Overview
          </button>
          <button
            onClick={() => setActiveSchemaTab('firestore')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSchemaTab === 'firestore'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Firestore Cloud DB
          </button>
          <button
            onClick={() => setActiveSchemaTab('prisma')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSchemaTab === 'prisma'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            PostgreSQL (Prisma)
          </button>
          <button
            onClick={() => setActiveSchemaTab('mongoose')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSchemaTab === 'mongoose'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            MongoDB (Mongoose)
          </button>
          <button
            onClick={() => setActiveSchemaTab('geometry')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSchemaTab === 'geometry'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            Haversine Zone Resolver
          </button>
          <button
            onClick={() => setActiveSchemaTab('stitch')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSchemaTab === 'stitch'
                ? 'bg-[#75cf5e] text-[#0c0e0d] shadow'
                : 'bg-[#0c0e0d] border border-[#1c211e] text-[#88998f] hover:text-[#e5f4eb]'
            }`}
          >
            Stitch Screen Artifacts (5)
          </button>
        </div>
      </div>

      {/* Microservices Architecture Tab */}
      {activeSchemaTab === 'microservices' && (
        <div className="space-y-6">
          {/* Live Microservices Probe */}
          <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#e5f4eb] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#75cf5e]" />
                  Live Microservices Health &amp; Endpoint Prober
                </h3>
                <p className="text-xs text-[#88998f] mt-0.5">
                  Send concurrent HTTP probes to verify all decoupled backend services
                </p>
              </div>
              <button
                onClick={probeAllServices}
                disabled={isProbing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#75cf5e] text-[#0c0e0d] hover:bg-[#68bc53] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                {isProbing ? 'Probing Services...' : 'Ping All Microservices'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {Object.entries(serviceStatuses).map(([key, s]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-xl bg-[#0c0e0d] border border-[#1c211e] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#88998f]">{s.endpoint}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.status === 'SUCCESS'
                          ? 'bg-[#75cf5e] shadow-[0_0_8px_#75cf5e]'
                          : s.status === 'LOADING'
                          ? 'bg-amber-400 animate-ping'
                          : s.status === 'ERROR'
                          ? 'bg-red-500'
                          : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                  <div className="font-bold text-xs text-[#e5f4eb]">{s.name}</div>
                  <div className="flex items-center justify-between text-[11px] text-[#88998f]">
                    <span>
                      {s.status === 'SUCCESS' && s.latencyMs ? `${s.latencyMs}ms latency` : s.status}
                    </span>
                    {s.dataSummary && (
                      <span className="text-[#75cf5e] font-medium">{s.dataSummary}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Microservices Domain Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Orders Service */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  SVC-01
                </span>
                <span className="text-[11px] text-[#88998f]">Port / Path: /api/orders</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Orders Microservice</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                Handles order placement, lifecycle state machine (`PLACED` &rarr; `PREPARING` &rarr; `OUT_FOR_DELIVERY` &rarr; `DELIVERED`), real-time kitchen broadcast, and revenue calculations.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#88998f]">
                <div>&bull; GET /api/orders (filters)</div>
                <div>&bull; POST /api/orders (place)</div>
                <div>&bull; PATCH /api/orders/[id] (status)</div>
              </div>
            </div>

            {/* 2. Hubs & Kitchens Service */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  SVC-02
                </span>
                <span className="text-[11px] text-[#88998f]">Port / Path: /api/hubs</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Kitchen Hubs Service</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                Controls Indore dark kitchen outlets (Bhawarkua, Vijay Nagar, Geeta Bhawan), store open/close switches, rush-hour pause throttling, and concentric zone polygons.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#88998f]">
                <div>&bull; GET /api/hubs (list)</div>
                <div>&bull; PATCH /api/hubs/[id] (toggleStore)</div>
                <div>&bull; PATCH /api/hubs/[id] (toggleZone)</div>
              </div>
            </div>

            {/* 3. Fleet & Logistics Service */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  SVC-03
                </span>
                <span className="text-[11px] text-[#88998f]">Port / Path: /api/riders</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Fleet &amp; Logistics Service</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                Manages delivery pilots roster, live duty states (AVAILABLE, ON_DELIVERY, OFF_DUTY), and one-click bulk batch assignment with automated order dispatching.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#88998f]">
                <div>&bull; GET /api/riders (roster)</div>
                <div>&bull; POST /api/riders/assign (bulk)</div>
                <div>&bull; PATCH /api/riders/[id] (status)</div>
              </div>
            </div>

            {/* 4. Menu Catalog Service */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  SVC-04
                </span>
                <span className="text-[11px] text-[#88998f]">Port / Path: /api/menu</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Midnight Menu Catalog</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                High-speed midnight menu catalog with category filtering (Maggie, Rolls, Burgers, Drinks, Chai), veg/non-veg tags, and kitchen 86 item toggles.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#88998f]">
                <div>&bull; GET /api/menu (catalog)</div>
                <div>&bull; GET /api/menu?category=maggie</div>
                <div>&bull; GET /api/menu?isVeg=true</div>
              </div>
            </div>

            {/* 5. Payments Microservice */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  SVC-05
                </span>
                <span className="text-[11px] text-[#88998f]">Port / Path: /api/razorpay</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Payment Gateway Service</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                Direct Razorpay Standard Checkout API integration with server-side order generation, HMAC SHA256 signature verification, and automated testmode simulation.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#88998f]">
                <div>&bull; POST /api/razorpay/create-order</div>
                <div>&bull; POST /api/razorpay/verify-payment</div>
                <div>&bull; Webhook Signature verification</div>
              </div>
            </div>

            {/* 6. Dual-Mode Storage Engine */}
            <div className="p-5 rounded-2xl bg-[#151917] border border-[#1c211e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c211e] text-[#75cf5e]">
                  DATA-LAYER
                </span>
                <span className="text-[11px] text-[#88998f]">Dual-Mode Adapter</span>
              </div>
              <h4 className="font-bold text-base text-[#e5f4eb]">Dual-Mode Persistence</h4>
              <p className="text-xs text-[#88998f] leading-relaxed">
                Zero-friction switching between Development In-Memory repositories (fast, zero cloud cost, local testing) and Production Google Cloud Firestore.
              </p>
              <div className="pt-2 border-t border-[#1c211e] text-[11px] space-y-1 font-mono text-[#75cf5e]">
                <div>&bull; DATABASE_MODE=&quot;development&quot;</div>
                <div>&bull; DATABASE_MODE=&quot;firestore&quot;</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Firestore Cloud DB Tab */}
      {activeSchemaTab === 'firestore' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#151917] border border-[#1c211e] text-xs text-[#88998f] space-y-1">
            <span className="font-bold text-[#e5f4eb]">How to deploy to Production Cloud Firestore:</span>
            <p>1. Open <code className="text-[#75cf5e]">.env.local</code> and set <code className="text-[#75cf5e]">DATABASE_MODE=&quot;firestore&quot;</code></p>
            <p>2. Deploy security rules with: <code className="text-[#75cf5e]">firebase deploy --only firestore:rules,firestore:indexes</code></p>
          </div>

          <div className="relative rounded-2xl bg-[#0c0e0d] border border-[#1c211e] overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#151917] border-b border-[#1c211e] flex items-center justify-between text-xs">
              <span className="font-mono text-[#88998f]">firestore.rules</span>
              <button
                onClick={() => handleCopy('firestore', firestoreRulesCode)}
                className="flex items-center gap-1.5 text-xs text-[#75cf5e] hover:text-[#68bc53] font-bold cursor-pointer"
              >
                {copiedTab === 'firestore' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTab === 'firestore' ? 'Copied!' : 'Copy Rules'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{firestoreRulesCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Prisma Schema Tab */}
      {activeSchemaTab === 'prisma' && (
        <div className="relative rounded-2xl bg-[#0c0e0d] border border-[#1c211e] overflow-hidden shadow-2xl">
          <div className="p-3 bg-[#151917] border-b border-[#1c211e] flex items-center justify-between text-xs">
            <span className="font-mono text-[#88998f]">prisma/schema.prisma</span>
            <button
              onClick={() => handleCopy('prisma', prismaSchemaCode)}
              className="flex items-center gap-1.5 text-xs text-[#75cf5e] hover:text-[#68bc53] font-bold cursor-pointer"
            >
              {copiedTab === 'prisma' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTab === 'prisma' ? 'Copied!' : 'Copy Schema'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            <code>{prismaSchemaCode}</code>
          </pre>
        </div>
      )}

      {/* Mongoose Schema Tab */}
      {activeSchemaTab === 'mongoose' && (
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">src/models/mongoose.ts</span>
            <button
              onClick={() => handleCopy('mongoose', mongooseCode)}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
            >
              {copiedTab === 'mongoose' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTab === 'mongoose' ? 'Copied!' : 'Copy Schema'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            <code>{mongooseCode}</code>
          </pre>
        </div>
      )}

      {/* Geometry Resolver Tab */}
      {activeSchemaTab === 'geometry' && (
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">src/lib/geometry.ts</span>
            <button
              onClick={() => handleCopy('geometry', geometryCode)}
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
            >
              {copiedTab === 'geometry' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTab === 'geometry' ? 'Copied!' : 'Copy Logic'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            <code>{geometryCode}</code>
          </pre>
        </div>
      )}

      {/* Stitch Design Artifacts Tab */}
      {activeSchemaTab === 'stitch' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              id: '01_splash_intro',
              title: '01. Splash Intro Screen',
              img: '/stitch_screens/01_splash_intro.png',
              desc: 'High-contrast midnight onboarding with tagline and CTA',
            },
            {
              id: '02_mobile_menu',
              title: '02. Mobile Food Menu',
              img: '/stitch_screens/02_mobile_menu.png',
              desc: 'Header with zone pill, search, category pills & food cards',
            },
            {
              id: '03_customer_login',
              title: '03. Low-Friction Customer Login',
              img: '/stitch_screens/03_student_login.png',
              desc: 'OTP phone verification with one-tap address pre-fill',
            },
            {
              id: '04_mobile_checkout',
              title: '04. Mobile Checkout & Delivery Options',
              img: '/stitch_screens/04_mobile_checkout.png',
              desc: 'Gate drop, silent delivery, 100% masked calling',
            },
            {
              id: '05_live_order_tracking',
              title: '05. Live Order Tracking',
              img: '/stitch_screens/05_live_order_tracking.png',
              desc: 'Live route map from Bhawarkua Hub with pilot pulse',
            },
          ].map((screen) => (
            <div
              key={screen.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <h4 className="font-bold text-sm text-slate-100">{screen.title}</h4>
              <p className="text-xs text-slate-400">{screen.desc}</p>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-64 flex items-center justify-center">
                <img
                  src={screen.img}
                  alt={screen.title}
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
