import fs from 'fs';
import path from 'path';
import { Rider, RiderStatus } from '@/types/database';
import { INITIAL_RIDERS } from '@/lib/mockData';
import { isFirestoreEnabled } from '../config';
import { firestoreDb } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';

export interface IFleetRepository {
  findAll(filter?: { outletId?: string; status?: RiderStatus | 'ALL' }): Promise<Rider[]>;
  findById(id: string): Promise<Rider | null>;
  create(rider: Rider): Promise<Rider>;
  update(id: string, updates: Partial<Rider>): Promise<Rider | null>;
}

const RIDERS_FILE = path.join(process.cwd(), 'data', 'riders.json');

function readRidersFromDisk(): Rider[] {
  try {
    if (fs.existsSync(RIDERS_FILE)) {
      const raw = fs.readFileSync(RIDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[FleetRepo] Error reading riders from disk:', e);
  }
  writeRidersToDisk(INITIAL_RIDERS);
  return [...INITIAL_RIDERS];
}

function writeRidersToDisk(riders: Rider[]) {
  try {
    const dir = path.dirname(RIDERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RIDERS_FILE, JSON.stringify(riders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[FleetRepo] Error writing riders to disk:', e);
  }
}

// Development / Persistent In-Memory Repository
export class PersistentFleetRepository implements IFleetRepository {
  private riders: Rider[] = readRidersFromDisk();

  async findAll(filter?: { outletId?: string; status?: RiderStatus | 'ALL' }): Promise<Rider[]> {
    this.riders = readRidersFromDisk();
    let result = [...this.riders];

    if (filter?.outletId && filter.outletId !== 'ALL') {
      result = result.filter((r) => r.outletId === filter.outletId);
    }
    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((r) => r.status === filter.status);
    }

    return result;
  }

  async findById(id: string): Promise<Rider | null> {
    this.riders = readRidersFromDisk();
    const found = this.riders.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async create(rider: Rider): Promise<Rider> {
    this.riders = readRidersFromDisk();
    this.riders = [rider, ...this.riders];
    writeRidersToDisk(this.riders);
    return { ...rider };
  }

  async update(id: string, updates: Partial<Rider>): Promise<Rider | null> {
    this.riders = readRidersFromDisk();
    const idx = this.riders.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated = { ...this.riders[idx], ...updates };
    this.riders[idx] = updated;
    writeRidersToDisk(this.riders);
    return { ...updated };
  }
}

// Firestore Cloud Repository
export class FirestoreFleetRepository implements IFleetRepository {
  private fallback = new PersistentFleetRepository();

  async findAll(filter?: { outletId?: string; status?: RiderStatus | 'ALL' }): Promise<Rider[]> {
    if (!firestoreDb) return this.fallback.findAll(filter);

    try {
      const col = collection(firestoreDb, 'riders');
      let q = query(col);

      if (filter?.outletId && filter.outletId !== 'ALL') {
        q = query(q, where('outletId', '==', filter.outletId));
      }
      if (filter?.status && filter.status !== 'ALL') {
        q = query(q, where('status', '==', filter.status));
      }

      const snap = await getDocs(q);
      if (snap.empty) return this.fallback.findAll(filter);

      const riders: Rider[] = [];
      snap.forEach((d) => riders.push(d.data() as Rider));
      return riders;
    } catch (e) {
      return this.fallback.findAll(filter);
    }
  }

  async findById(id: string): Promise<Rider | null> {
    if (!firestoreDb) return this.fallback.findById(id);

    try {
      const snap = await getDoc(doc(firestoreDb, 'riders', id));
      return snap.exists() ? (snap.data() as Rider) : null;
    } catch (e) {
      return this.fallback.findById(id);
    }
  }

  async create(rider: Rider): Promise<Rider> {
    if (!firestoreDb) return this.fallback.create(rider);

    try {
      await setDoc(doc(firestoreDb, 'riders', rider.id), rider);
      return rider;
    } catch (e) {
      return this.fallback.create(rider);
    }
  }

  async update(id: string, updates: Partial<Rider>): Promise<Rider | null> {
    if (!firestoreDb) return this.fallback.update(id, updates);

    try {
      await updateDoc(doc(firestoreDb, 'riders', id), updates);
      return await this.findById(id);
    } catch (e) {
      return this.fallback.update(id, updates);
    }
  }
}

export const fleetRepository: IFleetRepository = isFirestoreEnabled
  ? new FirestoreFleetRepository()
  : new PersistentFleetRepository();
