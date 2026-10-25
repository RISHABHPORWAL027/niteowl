// Cloud Firestore Seeder for NiteOwl (Bhawarkua Hub)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyA0Gho4NlmEd3RCuGya1baIwq3q4Quy6uk',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'niteowl-f4f78.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'niteowl-f4f78',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'niteowl-f4f78.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '826812245363',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:826812245363:web:c7443dcd714b2b9359d106',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data Definitions (Strictly Bhawarkua Hub)
const BHAWARKUA_OUTLET = {
  id: 'outlet-bhawarkua',
  name: 'Bhawarkua Hub',
  slug: 'bhawarkua-indore',
  address: 'Near Tower Square, Bhawarkua Main Rd, Indore, MP 452001',
  lat: 22.6926,
  lng: 75.8676,
  openingTime: '19:00',
  closingTime: '04:00',
  isStoreOpen: true,
  isRushPaused: false,
  surgeMultiplier: 1.0,
};

const BHAWARKUA_ZONES = [
  {
    id: 'zone-bhw-1',
    outletId: 'outlet-bhawarkua',
    name: 'Zone 1: Bholaram Core (< 800m)',
    zoneCode: 'ZONE_1',
    radiusKm: 0.8,
    minRadiusKm: 0.0,
    landmarksCovered: [
      'Bholaram Ustad Marg',
      'Tower Square Crossing',
      'Panchsheel Colony',
      'Ganesh Nagar',
      'Radha Krishna Complex',
      'Maa Gayatri PG',
    ],
    minOrderValue: 89,
    deliveryFee: 0,
    freeDeliveryThreshold: 89,
    estimatedDeliveryMins: 12,
    isActive: true,
  },
  {
    id: 'zone-bhw-2',
    outletId: 'outlet-bhawarkua',
    name: 'Zone 2: Vishnu Puri & Transit (800m - 1.5km)',
    zoneCode: 'ZONE_2',
    radiusKm: 1.5,
    minRadiusKm: 0.8,
    landmarksCovered: [
      'Vishnu Puri NX',
      'Indrapuri Colony',
      'Rajiv Gandhi Square',
      'Shivani Residency',
      'DAVV Takshashila Enclave',
      'Professor Colony',
    ],
    minOrderValue: 89,
    deliveryFee: 15,
    freeDeliveryThreshold: 149,
    estimatedDeliveryMins: 18,
    isActive: true,
  },
  {
    id: 'zone-bhw-3',
    outletId: 'outlet-bhawarkua',
    name: 'Zone 3: Outer Radius (1.5km - 2.0km)',
    zoneCode: 'ZONE_3',
    radiusKm: 2.0,
    minRadiusKm: 1.5,
    landmarksCovered: [
      'Navlakha Bus Stand',
      'Holkar Square Residences',
      'Sapna Sangeeta Rd Junction',
      'Agrasen Square South',
      'Chitawad Crossing',
    ],
    minOrderValue: 89,
    deliveryFee: 25,
    freeDeliveryThreshold: 199,
    estimatedDeliveryMins: 25,
    isActive: true,
  },
];

const RIDERS = [
  {
    id: 'rider-suresh',
    name: 'Pilot Suresh (#12)',
    phone: '+91 98261 44556',
    outletId: 'outlet-bhawarkua',
    preferredZoneCodes: ['ZONE_1', 'ZONE_2'],
    vehicle: 'TVS Ntorq • MP-09-NW-2026',
    status: 'AVAILABLE',
    rating: 4.9,
    baseDeliveredCount: 142,
    joinedDate: 'Aug 2025',
  },
  {
    id: 'rider-rahul',
    name: 'Pilot Rahul (#08)',
    phone: '+91 98263 11223',
    outletId: 'outlet-bhawarkua',
    preferredZoneCodes: ['ZONE_1'],
    vehicle: 'Honda Activa 6G • MP-09-AA-4412',
    status: 'AVAILABLE',
    rating: 4.8,
    baseDeliveredCount: 96,
    joinedDate: 'Nov 2025',
  },
  {
    id: 'rider-vikram',
    name: 'Pilot Vikram (#15)',
    phone: '+91 98268 99887',
    outletId: 'outlet-bhawarkua',
    preferredZoneCodes: ['ZONE_2', 'ZONE_3'],
    vehicle: 'Bajaj Pulsar 150 • MP-09-CZ-8890',
    status: 'ON_DELIVERY',
    rating: 4.95,
    baseDeliveredCount: 188,
    joinedDate: 'Jun 2025',
  },
];

const MENU_ITEMS = [
  {
    id: 'item-maggi-cheese',
    name: 'Double Cheese Butter Maggi',
    slug: 'double-cheese-butter-maggi',
    category: 'MAGGI_NOODLES',
    description: 'Loaded with Amul butter & shredded cheese. Served piping hot in foil bowl.',
    basePrice: 70,
    imageUrl: '/images/food/cheese-maggi.jpg',
    isVeg: true,
    rating: 4.8,
    ratingCount: 420,
    prepTimeMin: 7,
    tag: 'Bestseller',
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
  {
    id: 'item-cold-brew',
    name: 'Midnight Nitro Cold Brew (350ml)',
    slug: 'midnight-nitro-cold-brew',
    category: 'CHAI_COFFEE',
    description: 'Slow brewed 18-hour Arabica blend. High caffeine punch for late-night productivity.',
    basePrice: 65,
    imageUrl: '/images/food/cold-brew.jpg',
    isVeg: true,
    rating: 4.9,
    ratingCount: 312,
    prepTimeMin: 3,
    tag: 'Midnight Fuel',
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
  {
    id: 'item-cheese-sandwich',
    name: 'Melting Corn Cheese Grilled Sandwich',
    slug: 'melting-corn-cheese-grilled-sandwich',
    category: 'SANDWICHES_BURGERS',
    description: 'Jumbo 3-layer bread packed with sweet corn, jalapenos & melted mozzarella.',
    basePrice: 85,
    imageUrl: '/images/food/cheese-sandwich.jpg',
    isVeg: true,
    rating: 4.7,
    ratingCount: 280,
    prepTimeMin: 9,
    tag: 'Midnight Special',
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
  {
    id: 'item-paneer-roll',
    name: 'Spicy Schezwan Paneer Kathi Roll',
    slug: 'spicy-schezwan-paneer-kathi-roll',
    category: 'ROLLS_WRAPS',
    description: 'Crispy paratha wrap stuffed with smoky tandoori paneer tikka & fiery mint dip.',
    basePrice: 99,
    imageUrl: '/images/food/paneer-roll.jpg',
    isVeg: true,
    rating: 4.8,
    ratingCount: 195,
    prepTimeMin: 10,
    tag: 'Chef Pick',
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
  {
    id: 'item-kulhad-chai',
    name: 'Adrak Elaichi Kulhad Chai (Flask - 2 Cups)',
    slug: 'adrak-elaichi-kulhad-chai',
    category: 'CHAI_COFFEE',
    description: 'Piping hot desi ginger-cardamom tea delivered in thermal insulated flask.',
    basePrice: 45,
    imageUrl: '/images/food/kulhad-chai.jpg',
    isVeg: true,
    rating: 4.9,
    ratingCount: 540,
    prepTimeMin: 5,
    tag: 'Bestseller',
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
  {
    id: 'item-peri-fries',
    name: 'Peri-Peri Crinkle Crispy Fries',
    slug: 'peri-peri-crinkle-crispy-fries',
    category: 'QUICK_BITES',
    description: 'Freshly fried crinkle potato fries tossed in hot peri-peri dust with garlic mayo dip.',
    basePrice: 69,
    imageUrl: '/images/food/peri-fries.jpg',
    isVeg: true,
    rating: 4.6,
    ratingCount: 175,
    prepTimeMin: 6,
    outletId: 'outlet-bhawarkua',
    isAvailableTonight: true,
  },
];

async function seed() {
  console.log('🦉 Starting NiteOwl Cloud Firestore Seeding...');
  console.log('Project ID:', firebaseConfig.projectId);

  try {
    // 1. Seed Bhawarkua Outlet
    console.log('Seeding Bhawarkua Outlet...');
    await setDoc(doc(db, 'outlets', BHAWARKUA_OUTLET.id), BHAWARKUA_OUTLET);
    console.log('✓ Outlet seeded: outlet-bhawarkua');

    // 2. Seed Concentric Zones
    console.log('Seeding Zones...');
    for (const z of BHAWARKUA_ZONES) {
      await setDoc(doc(db, 'zones', z.id), z);
      console.log(`✓ Zone seeded: ${z.name}`);
    }

    // 3. Seed Menu Items
    console.log('Seeding Menu Items...');
    for (const item of MENU_ITEMS) {
      await setDoc(doc(db, 'menu', item.id), item);
      console.log(`✓ Menu item seeded: ${item.name}`);
    }

    // 4. Seed Delivery Fleet
    console.log('Seeding Fleet Pilots...');
    for (const r of RIDERS) {
      await setDoc(doc(db, 'riders', r.id), r);
      console.log(`✓ Rider seeded: ${r.name}`);
    }

    console.log('\n🎉 SUCCESS: All data seeded to Cloud Firestore!');
    console.log('Note: Orders and addresses collections are left empty for live customer transactions.');
    process.exit(0);
  } catch (err) {
    console.error('\n⚠️ Firestore Seeding Warning:', err.code, err.message);
    if (err.message && err.message.includes('NOT_FOUND')) {
      console.log('\n👉 NOTE: Please open your Firebase Console:');
      console.log(`   https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
      console.log('   Click "Create database", choose test mode, and select your location.');
      console.log('   Then run: node scripts/seed-firestore.mjs');
    }
    process.exit(1);
  }
}

seed();
