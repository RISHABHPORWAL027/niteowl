import fs from 'fs';
import path from 'path';
import { Order } from '@/types/database';
import { INITIAL_ORDERS } from '@/lib/mockData';
import { OrderFilter } from './orders.types';
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

export interface IOrdersRepository {
  findAll(filter?: OrderFilter): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  create(order: Order): Promise<Order>;
  update(id: string, updates: Partial<Order>): Promise<Order | null>;
}

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

function readOrdersFromDisk(): Order[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[OrdersRepo] Error reading orders from disk:', e);
  }
  writeOrdersToDisk([]);
  return [];
}

function writeOrdersToDisk(orders: Order[]) {
  try {
    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[OrdersRepo] Error writing orders to disk:', e);
  }
}

// ==============================================================================
// 1. DEVELOPMENT / PERSISTENT FILE-BACKED REPOSITORY
// ==============================================================================
export class PersistentOrdersRepository implements IOrdersRepository {
  private orders: Order[] = readOrdersFromDisk();

  async findAll(filter?: OrderFilter): Promise<Order[]> {
    this.orders = readOrdersFromDisk();
    let result = [...this.orders];

    if (filter?.outletId && filter.outletId !== 'ALL') {
      result = result.filter((o) => o.outletId === filter.outletId);
    }

    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((o) => o.orderStatus === filter.status);
    }

    if (filter?.zoneId && filter.zoneId !== 'ALL') {
      result = result.filter((o) => o.zoneId === filter.zoneId);
    }

    if (filter?.riderId) {
      result = result.filter((o) => o.riderId === filter.riderId);
    }

    if (filter?.timeRange && filter.timeRange !== 'ALL') {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const sevenDaysMs = 7 * oneDayMs;

      result = result.filter((o) => {
        if (!o.createdAt) return true;
        const time = new Date(o.createdAt).getTime();
        if (filter.timeRange === 'DAILY') return now - time <= oneDayMs;
        if (filter.timeRange === 'WEEKLY') return now - time <= sevenDaysMs;
        return true;
      });
    }

    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.addressDetails?.hostelPgOrFlat?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  async findById(id: string): Promise<Order | null> {
    this.orders = readOrdersFromDisk();
    const found = this.orders.find((o) => o.id === id || o.orderNumber === id);
    return found ? { ...found } : null;
  }

  async create(order: Order): Promise<Order> {
    this.orders = readOrdersFromDisk();
    this.orders = [order, ...this.orders];
    writeOrdersToDisk(this.orders);
    return { ...order };
  }

  async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    this.orders = readOrdersFromDisk();
    const index = this.orders.findIndex((o) => o.id === id || o.orderNumber === id);
    if (index === -1) return null;

    const updated = {
      ...this.orders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orders[index] = updated;
    writeOrdersToDisk(this.orders);
    return { ...updated };
  }
}

// ==============================================================================
// 2. FIRESTORE CLOUD REPOSITORY
// ==============================================================================
export class FirestoreOrdersRepository implements IOrdersRepository {
  private fallbackDev = new PersistentOrdersRepository();

  private getCollection() {
    if (!firestoreDb) {
      throw new Error('Firestore DB is not initialized. Please verify Firebase credentials.');
    }
    return collection(firestoreDb, 'orders');
  }

  async findAll(filter?: OrderFilter): Promise<Order[]> {
    if (!firestoreDb) {
      return this.fallbackDev.findAll(filter);
    }

    try {
      const ordersCol = this.getCollection();
      let q = query(ordersCol);

      if (filter?.outletId && filter.outletId !== 'ALL') {
        q = query(q, where('outletId', '==', filter.outletId));
      }
      if (filter?.status && filter.status !== 'ALL') {
        q = query(q, where('orderStatus', '==', filter.status));
      }
      if (filter?.zoneId && filter.zoneId !== 'ALL') {
        q = query(q, where('zoneId', '==', filter.zoneId));
      }
      if (filter?.riderId) {
        q = query(q, where('riderId', '==', filter.riderId));
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore getDocs timeout')), 2000)
      );
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);
      const orders: Order[] = [];
      snapshot.forEach((d) => {
        orders.push(d.data() as Order);
      });

      orders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (orders.length === 0) {
        return this.fallbackDev.findAll(filter);
      }

      return orders;
    } catch (e) {
      return this.fallbackDev.findAll(filter);
    }
  }

  async findById(id: string): Promise<Order | null> {
    if (!firestoreDb) {
      return this.fallbackDev.findById(id);
    }

    try {
      const orderDoc = doc(firestoreDb, 'orders', id);
      const snapshot = await getDoc(orderDoc);
      if (snapshot.exists()) {
        return snapshot.data() as Order;
      }
      return null;
    } catch (e) {
      return this.fallbackDev.findById(id);
    }
  }

  async create(order: Order): Promise<Order> {
    if (!firestoreDb) {
      return this.fallbackDev.create(order);
    }

    try {
      const orderDoc = doc(firestoreDb, 'orders', order.id);
      await setDoc(orderDoc, order);
      return order;
    } catch (e) {
      return this.fallbackDev.create(order);
    }
  }

  async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    if (!firestoreDb) {
      return this.fallbackDev.update(id, updates);
    }

    try {
      const orderDoc = doc(firestoreDb, 'orders', id);
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(orderDoc, payload);
      return (await this.findById(id)) || null;
    } catch (e) {
      return this.fallbackDev.update(id, updates);
    }
  }
}

export const ordersRepository: IOrdersRepository = isFirestoreEnabled
  ? new FirestoreOrdersRepository()
  : new PersistentOrdersRepository();
