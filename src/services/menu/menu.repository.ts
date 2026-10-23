import { MenuItem } from '@/types/database';
import { MOCK_MENU_ITEMS } from '@/lib/mockData';
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

export interface IMenuRepository {
  findAll(category?: string): Promise<MenuItem[]>;
  findById(id: string): Promise<MenuItem | null>;
  update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null>;
}

// Development In-Memory Repository
export class DevelopmentMenuRepository implements IMenuRepository {
  private menu: MenuItem[] = [...MOCK_MENU_ITEMS];

  async findAll(category?: string): Promise<MenuItem[]> {
    if (category && category !== 'ALL') {
      return this.menu.filter((i) => i.category === category);
    }
    return [...this.menu];
  }

  async findById(id: string): Promise<MenuItem | null> {
    const item = this.menu.find((i) => i.id === id);
    return item ? { ...item } : null;
  }

  async update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    const idx = this.menu.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = { ...this.menu[idx], ...updates };
    this.menu[idx] = updated;
    return { ...updated };
  }
}

// Firestore Cloud Repository
export class FirestoreMenuRepository implements IMenuRepository {
  private fallback = new DevelopmentMenuRepository();

  async findAll(category?: string): Promise<MenuItem[]> {
    if (!firestoreDb) return this.fallback.findAll(category);

    try {
      const snap = await getDocs(collection(firestoreDb, 'menu'));
      if (snap.empty) return this.fallback.findAll(category);
      const items: MenuItem[] = [];
      snap.forEach((d) => items.push(d.data() as MenuItem));

      if (category && category !== 'ALL') {
        return items.filter((i) => i.category === category);
      }
      return items;
    } catch (e) {
      return this.fallback.findAll(category);
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

  async update(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    if (!firestoreDb) return this.fallback.update(id, updates);

    try {
      await updateDoc(doc(firestoreDb, 'menu', id), updates);
      return await this.findById(id);
    } catch (e) {
      return this.fallback.update(id, updates);
    }
  }
}

export const menuRepository: IMenuRepository = isFirestoreEnabled
  ? new FirestoreMenuRepository()
  : new DevelopmentMenuRepository();
