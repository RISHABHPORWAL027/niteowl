import fs from 'fs';
import path from 'path';
import { Outlet, Zone } from '@/types/database';
import { INITIAL_OUTLETS, INITIAL_ZONES } from '@/lib/mockData';
import { isFirestoreEnabled } from '../config';
import { firestoreDb } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export interface IHubsRepository {
  findOutlets(): Promise<Outlet[]>;
  findOutletById(id: string): Promise<Outlet | null>;
  updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null>;
  findZones(outletId?: string): Promise<Record<string, Zone[]>>;
  updateZone(outletId: string, zoneId: string, updates: Partial<Zone>): Promise<Zone | null>;
}

const OUTLETS_FILE = path.join(process.cwd(), 'data', 'outlets.json');
const ZONES_FILE = path.join(process.cwd(), 'data', 'zones.json');

function readOutletsFromDisk(): Outlet[] {
  try {
    if (fs.existsSync(OUTLETS_FILE)) {
      const raw = fs.readFileSync(OUTLETS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[HubsRepo] Error reading outlets from disk:', e);
  }
  writeOutletsToDisk(INITIAL_OUTLETS);
  return [...INITIAL_OUTLETS];
}

function writeOutletsToDisk(outlets: Outlet[]) {
  try {
    const dir = path.dirname(OUTLETS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTLETS_FILE, JSON.stringify(outlets, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[HubsRepo] Error writing outlets to disk:', e);
  }
}

function readZonesFromDisk(): Record<string, Zone[]> {
  try {
    if (fs.existsSync(ZONES_FILE)) {
      const raw = fs.readFileSync(ZONES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('[HubsRepo] Error reading zones from disk:', e);
  }
  writeZonesToDisk(INITIAL_ZONES);
  return { ...INITIAL_ZONES };
}

function writeZonesToDisk(zones: Record<string, Zone[]>) {
  try {
    const dir = path.dirname(ZONES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ZONES_FILE, JSON.stringify(zones, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[HubsRepo] Error writing zones to disk:', e);
  }
}

// Development In-Memory & Persistent Repository
export class PersistentHubsRepository implements IHubsRepository {
  private outlets: Outlet[] = readOutletsFromDisk();
  private zonesMap: Record<string, Zone[]> = readZonesFromDisk();

  async findOutlets(): Promise<Outlet[]> {
    this.outlets = readOutletsFromDisk();
    return [...this.outlets];
  }

  async findOutletById(id: string): Promise<Outlet | null> {
    this.outlets = readOutletsFromDisk();
    const found = this.outlets.find((o) => o.id === id);
    return found ? { ...found } : null;
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    this.outlets = readOutletsFromDisk();
    const idx = this.outlets.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const updated = { ...this.outlets[idx], ...updates };
    this.outlets[idx] = updated;
    writeOutletsToDisk(this.outlets);
    return { ...updated };
  }

  async findZones(outletId?: string): Promise<Record<string, Zone[]>> {
    this.zonesMap = readZonesFromDisk();
    if (outletId && outletId !== 'ALL') {
      return { [outletId]: this.zonesMap[outletId] || [] };
    }
    return { ...this.zonesMap };
  }

  async updateZone(
    outletId: string,
    zoneId: string,
    updates: Partial<Zone>
  ): Promise<Zone | null> {
    this.zonesMap = readZonesFromDisk();
    const currentList = this.zonesMap[outletId] || [];
    const idx = currentList.findIndex((z) => z.id === zoneId);
    if (idx === -1) return null;

    const updated = { ...currentList[idx], ...updates };
    currentList[idx] = updated;
    this.zonesMap[outletId] = currentList;
    writeZonesToDisk(this.zonesMap);
    return { ...updated };
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Database timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Firestore Cloud Repository
export class FirestoreHubsRepository implements IHubsRepository {
  private fallback = new PersistentHubsRepository();

  async findOutlets(): Promise<Outlet[]> {
    if (!firestoreDb) return this.fallback.findOutlets();

    try {
      const snap = await withTimeout(getDocs(collection(firestoreDb, 'outlets')));
      if (snap.empty) return this.fallback.findOutlets();
      const outlets: Outlet[] = [];
      snap.forEach((d) => outlets.push(d.data() as Outlet));
      return outlets;
    } catch (e) {
      return this.fallback.findOutlets();
    }
  }

  async findOutletById(id: string): Promise<Outlet | null> {
    if (!firestoreDb) return this.fallback.findOutletById(id);

    try {
      const snap = await withTimeout(getDoc(doc(firestoreDb, 'outlets', id)));
      return snap.exists() ? (snap.data() as Outlet) : null;
    } catch (e) {
      return this.fallback.findOutletById(id);
    }
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    if (!firestoreDb) return this.fallback.updateOutlet(id, updates);

    try {
      await withTimeout(updateDoc(doc(firestoreDb, 'outlets', id), updates));
      return await this.findOutletById(id);
    } catch (e) {
      return this.fallback.updateOutlet(id, updates);
    }
  }

  async findZones(outletId?: string): Promise<Record<string, Zone[]>> {
    return this.fallback.findZones(outletId);
  }

  async updateZone(
    outletId: string,
    zoneId: string,
    updates: Partial<Zone>
  ): Promise<Zone | null> {
    return this.fallback.updateZone(outletId, zoneId, updates);
  }
}

export const hubsRepository: IHubsRepository = isFirestoreEnabled
  ? new FirestoreHubsRepository()
  : new PersistentHubsRepository();
