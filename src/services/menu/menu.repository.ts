import fs from 'fs';
import path from 'path';
import { MenuItem } from '@/types/database';
import { MOCK_MENU_ITEMS } from '@/lib/mockData';
import { MenuFilter } from './menu.types';
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

export interface IMenuRepository {
  findAll(filter?: MenuFilter): Promise<MenuItem[]>;
  findById(id: string): Promise<MenuItem | null>;
  create(item: MenuItem): Promise<MenuItem>;
  update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null>;
  delete(id: string): Promise<boolean>;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'menu.json');

function readFromDisk(): MenuItem[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[MenuRepo] Error reading menu from disk, falling back:', e);
  }
  // Initial seed: MOCK_MENU_ITEMS
  writeToDisk(MOCK_MENU_ITEMS);
  return [...MOCK_MENU_ITEMS];
}

function writeToDisk(items: MenuItem[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[MenuRepo] Error writing menu to disk:', e);
  }
}

// ==============================================================================
// 1. DEVELOPMENT & PERSISTENT FILE REPOSITORY
// ==============================================================================
export class PersistentMenuRepository implements IMenuRepository {
  private menu: MenuItem[] = readFromDisk();

  async findAll(filter?: MenuFilter): Promise<MenuItem[]> {
    this.menu = readFromDisk();
    let result = [...this.menu];

    if (filter?.outletId && filter.outletId !== 'ALL') {
      result = result.filter(
        (i) => !i.outletId || i.outletId === filter.outletId
      );
    }

    if (filter?.category && filter.category !== 'ALL') {
      result = result.filter((i) => i.category === filter.category);
    }

    if (filter?.isVeg !== undefined) {
      result = result.filter((i) => i.isVeg === filter.isVeg);
    }

    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async findById(id: string): Promise<MenuItem | null> {
    this.menu = readFromDisk();
    const item = this.menu.find((i) => i.id === id);
    return item ? { ...item } : null;
  }

  async create(item: MenuItem): Promise<MenuItem> {
    this.menu = readFromDisk();
    const existingIndex = this.menu.findIndex((i) => i.id === item.id);
    if (existingIndex > -1) {
      this.menu[existingIndex] = item;
    } else {
      this.menu.push(item);
    }
    writeToDisk(this.menu);
    return { ...item };
  }

  async update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    this.menu = readFromDisk();
    const idx = this.menu.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = { ...this.menu[idx], ...updates };
    this.menu[idx] = updated;
    writeToDisk(this.menu);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    this.menu = readFromDisk();
    const prevLen = this.menu.length;
    this.menu = this.menu.filter((i) => i.id !== id);
    if (this.menu.length !== prevLen) {
      writeToDisk(this.menu);
      return true;
    }
    return false;
  }
}

// ==============================================================================
// 2. FIRESTORE CLOUD REPOSITORY
// ==============================================================================
export class FirestoreMenuRepository implements IMenuRepository {
  private fallback = new PersistentMenuRepository();

  async findAll(filter?: MenuFilter): Promise<MenuItem[]> {
    if (!firestoreDb) return this.fallback.findAll(filter);

    try {
      const snap = await getDocs(collection(firestoreDb, 'menu'));
      if (snap.empty) return this.fallback.findAll(filter);
      const items: MenuItem[] = [];
      snap.forEach((d) => items.push(d.data() as MenuItem));

      let result = items;
      if (filter?.outletId && filter.outletId !== 'ALL') {
        result = result.filter((i) => !i.outletId || i.outletId === filter.outletId);
      }
      if (filter?.category && filter.category !== 'ALL') {
        result = result.filter((i) => i.category === filter.category);
      }
      if (filter?.isVeg !== undefined) {
        result = result.filter((i) => i.isVeg === filter.isVeg);
      }
      if (filter?.search?.trim()) {
        const q = filter.search.toLowerCase().trim();
        result = result.filter(
          (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
        );
      }
      return result;
    } catch (e) {
      return this.fallback.findAll(filter);
    }
  }

  async findById(id: string): Promise<MenuItem | null> {
    if (!firestoreDb) return this.fallback.findById(id);

    try {
      const snap = await getDoc(doc(firestoreDb, 'menu', id));
      return snap.exists() ? (snap.data() as MenuItem) : null;
    } catch (e) {
      return this.fallback.findById(id);
    }
  }

  async create(item: MenuItem): Promise<MenuItem> {
    if (!firestoreDb) return this.fallback.create(item);

    try {
      await setDoc(doc(firestoreDb, 'menu', item.id), item);
      return item;
    } catch (e) {
      return this.fallback.create(item);
    }
  }

  async update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    if (!firestoreDb) return this.fallback.update(id, updates);

    try {
      await updateDoc(doc(firestoreDb, 'menu', id), updates);
      return await this.findById(id);
    } catch (e) {
      return this.fallback.update(id, updates);
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!firestoreDb) return this.fallback.delete(id);

    try {
      await deleteDoc(doc(firestoreDb, 'menu', id));
      return true;
    } catch (e) {
      return this.fallback.delete(id);
    }
  }
}

export const menuRepository: IMenuRepository = isFirestoreEnabled
  ? new FirestoreMenuRepository()
  : new PersistentMenuRepository();
