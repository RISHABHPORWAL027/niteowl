// MongoDB Mongoose Schemas for NiteOwl (Alternative to Prisma/PostgreSQL)
// Includes 2dsphere geospatial indexing for ultra-fast hyper-local radius queries

/*
To use with Mongoose:
import mongoose, { Schema, Document, Model } from 'mongoose';
*/

export const OutletMongooseSchema = {
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat] GeoJSON format
      required: true,
      index: '2dsphere',
    },
  },
  openingTime: { type: String, default: '19:00' }, // 7:00 PM
  closingTime: { type: String, default: '04:00' }, // 4:00 AM
  isStoreOpen: { type: Boolean, default: true, index: true },
  isRushPaused: { type: Boolean, default: false },
  surgeMultiplier: { type: Number, default: 1.0 },
};

export const ZoneMongooseSchema = {
  outletId: { type: 'ObjectId', ref: 'Outlet', required: true, index: true },
  name: { type: String, required: true },
  zoneCode: {
    type: String,
    enum: ['ZONE_1', 'ZONE_2', 'ZONE_3', 'CUSTOM'],
    default: 'ZONE_1',
    required: true,
  },
  radiusKm: { type: Number, required: true }, // e.g. 0.8, 1.5, 2.0
  minRadiusKm: { type: Number, default: 0.0 },
  landmarksCovered: [{ type: String, index: true }], // ["Bholaram", "Vishnu Puri", "Navlakha"]
  minOrderValue: { type: Number, default: 89.0 },
  deliveryFee: { type: Number, default: 0.0 },
  freeDeliveryThreshold: { type: Number, default: 149.0 },
  estimatedDeliveryMins: { type: Number, default: 15 },
  isActive: { type: Boolean, default: true, index: true },
};

export const MenuItemMongooseSchema = {
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: [
      'MAGGI_NOODLES',
      'CHAI_COFFEE',
      'SANDWICHES_BURGERS',
      'ROLLS_WRAPS',
      'QUICK_BITES',
      'DESSERTS_BEVERAGES',
    ],
    required: true,
    index: true,
  },
  description: { type: String },
  basePrice: { type: Number, required: true },
  imageUrl: { type: String },
  isVeg: { type: Boolean, default: true },
  rating: { type: Number, default: 4.8 },
  ratingCount: { type: Number, default: 120 },
  prepTimeMin: { type: Number, default: 7 },
};

export const OutletInventoryMongooseSchema = {
  outletId: { type: 'ObjectId', ref: 'Outlet', required: true, index: true },
  menuItemId: { type: 'ObjectId', ref: 'MenuItem', required: true, index: true },
  price: { type: Number, required: true },
  isAvailableTonight: { type: Boolean, default: true, index: true },
  stockQuantity: { type: Number, default: 999 },
};

export const OrderMongooseSchema = {
  orderNumber: { type: String, required: true, unique: true, index: true },
  outletId: { type: 'ObjectId', ref: 'Outlet', required: true, index: true },
  zoneId: { type: 'ObjectId', ref: 'Zone', required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true, index: true },
  addressDetails: {
    hostelPgOrFlat: { type: String, required: true },
    roomNo: { type: String, required: true },
    floor: { type: String },
    landmark: { type: String, required: true },
    leaveAtGate: { type: Boolean, default: true },
    silentDelivery: { type: Boolean, default: true },
    maskedCall: { type: Boolean, default: true },
    riderNotes: { type: String },
  },
  items: [
    {
      menuItemId: { type: 'ObjectId', ref: 'MenuItem' },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 },
      isVeg: { type: Boolean, default: true },
      customization: { type: String },
    },
  ],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 0 },
  packagingFee: { type: Number, default: 5 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: [
      'PLACED',
      'CONFIRMED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ],
    default: 'PLACED',
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ['UPI_QR', 'UPI_INTENT', 'CASH_ON_DELIVERY'],
    default: 'UPI_QR',
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },
  riderName: { type: String, default: 'Suresh (NiteOwl Pilot)' },
  riderPhone: { type: String, default: '+919826001122' },
  estimatedMins: { type: Number, default: 15 },
  createdAt: { type: Date, default: Date.now, index: true },
};
