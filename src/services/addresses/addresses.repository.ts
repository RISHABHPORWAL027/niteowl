import fs from 'fs';
import path from 'path';
import { SavedAddress } from '@/types/database';
import { AddressFilter } from './addresses.types';
import { isFirestoreEnabled } from '../config';
import { firestoreDb } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

export interface IAddressesRepository {
  findAll(filter?: AddressFilter): Promise<SavedAddress[]>;
  findById(id: string): Promise<SavedAddress | null>;
  create(address: SavedAddress): Promise<SavedAddress>;
  update(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | null>;
  delete(id: string): Promise<boolean>;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'addresses.json');

function readFromDisk(): SavedAddress[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[AddressesRepo] Error reading addresses from disk:', e);
  }
  return [];
}

function writeToDisk(addresses: SavedAddress[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(addresses, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AddressesRepo] Error writing addresses to disk:', e);
  }
}

// ==============================================================================
// 1. DEVELOPMENT / PERSISTENT FILE-BACKED REPOSITORY
// ==============================================================================
export class PersistentAddressesRepository implements IAddressesRepository {
  private addresses: SavedAddress[] = readFromDisk();

  async findAll(filter?: AddressFilter): Promise<SavedAddress[]> {
    // Re-sync with disk in case another process modified it
    this.addresses = readFromDisk();
    let result = [...this.addresses];

    if (filter?.userId) {
      result = result.filter(
        (a) => a.userId === filter.userId || !a.userId // match specific user or guest
      );
    }

    if (filter?.tag) {
      result = result.filter((a) => a.tag === filter.tag);
    }

    return result;
  }

  async findById(id: string): Promise<SavedAddress | null> {
    this.addresses = readFromDisk();
    const found = this.addresses.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  async create(address: SavedAddress): Promise<SavedAddress> {
    this.addresses = readFromDisk();
    // Prepend new address
    this.addresses = [address, ...this.addresses.filter((a) => a.id !== address.id)];
    writeToDisk(this.addresses);
    return { ...address };
  }

  async update(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | null> {
    this.addresses = readFromDisk();
    const idx = this.addresses.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const updated: SavedAddress = {
      ...this.addresses[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addresses[idx] = updated;
    writeToDisk(this.addresses);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    this.addresses = readFromDisk();
    const prevLen = this.addresses.length;
    this.addresses = this.addresses.filter((a) => a.id !== id);
    if (this.addresses.length !== prevLen) {
      writeToDisk(this.addresses);
      return true;
    }
    return false;
  }
}

// ==============================================================================
// 2. FIRESTORE CLOUD REPOSITORY
// ==============================================================================
export class FirestoreAddressesRepository implements IAddressesRepository {
  private fallback = new PersistentAddressesRepository();

  async findAll(filter?: AddressFilter): Promise<SavedAddress[]> {
    if (!firestoreDb) return this.fallback.findAll(filter);

    try {
      const col = collection(firestoreDb, 'addresses');
      let q = query(col);
      if (filter?.userId) {
        q = query(q, where('userId', '==', filter.userId));
      }
      const snap = await getDocs(q);
      if (snap.empty) return this.fallback.findAll(filter);

      const list: SavedAddress[] = [];
      snap.forEach((d) => list.push(d.data() as SavedAddress));
      return list;
    } catch (e) {
      return this.fallback.findAll(filter);
    }
  }

  async findById(id: string): Promise<SavedAddress | null> {
    if (!firestoreDb) return this.fallback.findById(id);

    try {
      const snap = await getDoc(doc(firestoreDb, 'addresses', id));
      return snap.exists() ? (snap.data() as SavedAddress) : null;
    } catch (e) {
      return this.fallback.findById(id);
    }
  }

  async create(address: SavedAddress): Promise<SavedAddress> {
    if (!firestoreDb) return this.fallback.create(address);

    try {
      await setDoc(doc(firestoreDb, 'addresses', address.id), address);
      return address;
    } catch (e) {
      return this.fallback.create(address);
    }
  }

  async update(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | null> {
    if (!firestoreDb) return this.fallback.update(id, updates);

    try {
      const addrDoc = doc(firestoreDb, 'addresses', id);
      await updateDoc(addrDoc, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return await this.findById(id);
    } catch (e) {
      return this.fallback.update(id, updates);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!firestoreDb) return this.fallback.delete(id);

    try {
      await deleteDoc(doc(firestoreDb, 'addresses', id));
      return true;
    } catch (e) {
      return this.fallback.delete(id);
    }
  }
}

export const addressesRepository: IAddressesRepository = isFirestoreEnabled
  ? new FirestoreAddressesRepository()
  : new PersistentAddressesRepository();
