// Microservices Architecture Configuration
// Controls whether services use in-memory fast development storage or cloud Google Firestore

export type DatabaseMode = 'development' | 'firestore';

export const DATABASE_MODE: DatabaseMode =
  (process.env.DATABASE_MODE as DatabaseMode) || 'development';

export const isFirestoreEnabled = DATABASE_MODE === 'firestore';
