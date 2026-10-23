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
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';

export interface IOrdersRepository {
  findAll(filter?: OrderFilter): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  create(order: Order): Promise<Order>;
  update(id: string, updates: Partial<Order>): Promise<Order | null>;
}

// ==============================================================================
// 1. DEVELOPMENT IN-MEMORY REPOSITORY (Fast local testing & zero cloud latency)
// ==============================================================================
export class DevelopmentOrdersRepository implements IOrdersRepository {
  private orders: Order[] = [...INITIAL_ORDERS];

  async findAll(filter?: OrderFilter): Promise<Order[]> {
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
    const found = this.orders.find((o) => o.id === id || o.orderNumber === id);
    return found ? { ...found } : null;
  }

  async create(order: Order): Promise<Order> {
    this.orders = [order, ...this.orders];
    return { ...order };
  }

  async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    const index = this.orders.findIndex((o) => o.id === id || o.orderNumber === id);
    if (index === -1) return null;

    const updated = {
      ...this.orders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orders[index] = updated;
    return { ...updated };
  }
}

// ==============================================================================
// 2. FIRESTORE CLOUD REPOSITORY (Production Google Cloud Firestore)
// ==============================================================================
export class FirestoreOrdersRepository implements IOrdersRepository {
  private fallbackDev = new DevelopmentOrdersRepository();

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

      const snapshot = await getDocs(q);
      const orders: Order[] = [];
      snapshot.forEach((d) => {
        orders.push(d.data() as Order);
      });

      // In-memory sort & search
      orders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return orders;
    } catch (e) {
      console.warn('Firestore query failed, using development fallback:', e);
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
      console.warn('Firestore create failed, falling back to local memory:', e);
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

// Export Singleton Repository instance based on DATABASE_MODE
export const ordersRepository: IOrdersRepository = isFirestoreEnabled
  ? new FirestoreOrdersRepository()
  : new DevelopmentOrdersRepository();
