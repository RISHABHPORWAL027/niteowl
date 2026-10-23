// Firebase Client SDK Setup & Google Authentication Helper

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Guard against SSR / re-initialization in Next.js
let app: FirebaseApp;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let firestoreDb: Firestore | null = null;

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

if (typeof window !== 'undefined' || isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestoreDb = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.warn('Firebase initialization warning:', error);
  }
}

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase is not initialized. Please verify your NEXT_PUBLIC_FIREBASE_* credentials in .env.local'
    );
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Initialize reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  if (!auth) return null;
  if (typeof window === 'undefined') return null;

  try {
    const existing = (window as any).recaptchaVerifier;
    if (existing) {
      try {
        existing.clear();
      } catch (e) {
        // ignore
      }
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // Recaptcha resolved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired');
      },
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.warn('Recaptcha setup warning:', error);
    return null;
  }
}

/**
 * Send Phone OTP via Firebase
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export { app, auth, firestoreDb, googleProvider };
export type { ConfirmationResult, RecaptchaVerifier };
