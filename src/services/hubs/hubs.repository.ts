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

// Development In-Memory Repository
export class DevelopmentHubsRepository implements IHubsRepository {
  private outlets: Outlet[] = [...INITIAL_OUTLETS];
  private zonesMap: Record<string, Zone[]> = { ...INITIAL_ZONES };

  async findOutlets(): Promise<Outlet[]> {
    return [...this.outlets];
  }

  async findOutletById(id: string): Promise<Outlet | null> {
    const found = this.outlets.find((o) => o.id === id);
    return found ? { ...found } : null;
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    const idx = this.outlets.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const updated = { ...this.outlets[idx], ...updates };
    this.outlets[idx] = updated;
    return { ...updated };
  }

  async findZones(outletId?: string): Promise<Record<string, Zone[]>> {
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
    const currentList = this.zonesMap[outletId] || [];
    const idx = currentList.findIndex((z) => z.id === zoneId);
    if (idx === -1) return null;

    const updated = { ...currentList[idx], ...updates };
    currentList[idx] = updated;
    this.zonesMap[outletId] = currentList;
    return { ...updated };
  }
}

// Firestore Cloud Repository
export class FirestoreHubsRepository implements IHubsRepository {
  private fallback = new DevelopmentHubsRepository();

  async findOutlets(): Promise<Outlet[]> {
    if (!firestoreDb) return this.fallback.findOutlets();

    try {
      const snap = await getDocs(collection(firestoreDb, 'outlets'));
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
      const snap = await getDoc(doc(firestoreDb, 'outlets', id));
      return snap.exists() ? (snap.data() as Outlet) : null;
    } catch (e) {
      return this.fallback.findOutletById(id);
    }
  }

  async updateOutlet(id: string, updates: Partial<Outlet>): Promise<Outlet | null> {
    if (!firestoreDb) return this.fallback.updateOutlet(id, updates);

    try {
      await updateDoc(doc(firestoreDb, 'outlets', id), updates);
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
  : new DevelopmentHubsRepository();
