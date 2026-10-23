// OTP Rate Limiter: Maximum 3 attempts, then 30-minute lock

const STORAGE_KEY = 'niteowl_otp_ratelimit';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

interface RateLimitData {
  phone: string;
  attempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

function getStoredData(): Record<string, RateLimitData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredData(data: Record<string, RateLimitData>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

/**
 * Check if a phone number is currently rate-limited
 */
export function checkOtpRateLimit(phone: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
} {
  const cleanPhone = phone.replace(/\D/g, '');
  const store = getStoredData();
  const entry = store[cleanPhone];

  if (!entry) {
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  const now = Date.now();

  // Check if active lockout exists
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      attempts: entry.attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  // If lockout expired, reset attempts
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    delete store[cleanPhone];
    saveStoredData(store);
    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    attempts: entry.attempts || 0,
    maxAttempts: MAX_ATTEMPTS,
  };
}

/**
 * Record a new OTP request or verification attempt
 */
export function recordOtpAttempt(phone: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
} {
  const cleanPhone = phone.replace(/\D/g, '');
  const store = getStoredData();
  const now = Date.now();

  const current = store[cleanPhone] || {
    phone: cleanPhone,
    attempts: 0,
    lockedUntil: null,
    lastAttemptAt: now,
  };

  // If already locked
  if (current.lockedUntil && current.lockedUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((current.lockedUntil - now) / 1000),
      attempts: current.attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  const newAttempts = current.attempts + 1;
  let lockedUntil: number | null = null;

  if (newAttempts >= MAX_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_MS;
  }

  store[cleanPhone] = {
    phone: cleanPhone,
    attempts: newAttempts,
    lockedUntil,
    lastAttemptAt: now,
  };

  saveStoredData(store);

  const remainingSeconds = lockedUntil ? Math.ceil(LOCKOUT_MS / 1000) : 0;

  return {
    isLocked: Boolean(lockedUntil),
    remainingSeconds,
    attempts: newAttempts,
    maxAttempts: MAX_ATTEMPTS,
  };
}

/**
 * Clear rate limit on successful verification
 */
export function clearOtpRateLimit(phone: string): void {
  const cleanPhone = phone.replace(/\D/g, '');
  const store = getStoredData();
  delete store[cleanPhone];
  saveStoredData(store);
}

/**
 * Formats seconds into MM:SS
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
