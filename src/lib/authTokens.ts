// Cryptographic Authentication & Token Verification Utilities
// High-security HMAC-SHA256 session token generation and verification

export const ADMIN_COOKIE_NAME = 'niteowl_admin_token';
export const RIDER_COOKIE_NAME = 'niteowl_rider_token';

const ADMIN_SECRET =
  process.env.ADMIN_SECRET_KEY || 'niteowl_super_secret_admin_key_indore_2026_ops';

const RIDER_SECRET =
  process.env.RIDER_SECRET_KEY || 'niteowl_super_secret_rider_fleet_key_indore_2026';

function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return atob(base64);
}

async function getHmacSha256(keyStr: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const signatureBytes = new Uint8Array(signatureBuffer);
  let binary = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  return toBase64Url(binary);
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface TokenPayload {
  role: 'ADMIN' | 'RIDER' | 'CUSTOMER';
  id: string;
  name?: string;
  outletId?: string;
  iat: number;
  exp: number;
}

/**
 * Sign an admin session token (valid for 12 hours)
 */
export async function signAdminToken(details?: {
  id?: string;
  name?: string;
  outletId?: string;
}): Promise<string> {
  const now = Date.now();
  const payload: TokenPayload = {
    role: 'ADMIN',
    id: details?.id || 'admin-root',
    name: details?.name || 'Hub Manager (Bhawarkua)',
    outletId: details?.outletId || 'outlet-bhawarkua',
    iat: now,
    exp: now + 12 * 60 * 60 * 1000, // 12 hours validity
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const sig = await getHmacSha256(ADMIN_SECRET, payloadEncoded);
  return `${payloadEncoded}.${sig}`;
}

/**
 * Verify an admin session token
 */
export async function verifyAdminToken(token: string | null | undefined): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  const expectedSig = await getHmacSha256(ADMIN_SECRET, payloadEncoded);

  if (!timingSafeEqual(signature, expectedSig)) {
    return null;
  }

  try {
    const payload: TokenPayload = JSON.parse(fromBase64Url(payloadEncoded));
    if (payload.role !== 'ADMIN') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Sign a rider pilot session token (valid for 16 hours)
 */
export async function signRiderToken(pilotId: string, pilotName?: string): Promise<string> {
  const now = Date.now();
  const payload: TokenPayload = {
    role: 'RIDER',
    id: pilotId,
    name: pilotName || pilotId,
    outletId: 'outlet-bhawarkua',
    iat: now,
    exp: now + 16 * 60 * 60 * 1000, // 16-hour shift
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const sig = await getHmacSha256(RIDER_SECRET, payloadEncoded);
  return `${payloadEncoded}.${sig}`;
}

/**
 * Verify a rider pilot token
 */
export async function verifyRiderToken(token: string | null | undefined): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  const expectedSig = await getHmacSha256(RIDER_SECRET, payloadEncoded);

  if (!timingSafeEqual(signature, expectedSig)) {
    return null;
  }

  try {
    const payload: TokenPayload = JSON.parse(fromBase64Url(payloadEncoded));
    if (payload.role !== 'RIDER') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract and verify authorization for API route requests
 * Accepts either:
 * 1. Bearer token in 'Authorization' header
 * 2. 'niteowl_admin_token' or 'niteowl_rider_token' in cookies
 */
export async function verifyRequestAuth(req: Request): Promise<{
  isAdmin: boolean;
  isRider: boolean;
  pilotId?: string;
  adminPayload?: TokenPayload;
}> {
  // Check cookies
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => Boolean(k))
  );

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const adminToken = bearerToken || cookies[ADMIN_COOKIE_NAME];
  const riderToken = bearerToken || cookies[RIDER_COOKIE_NAME];

  const adminPayload = await verifyAdminToken(adminToken);
  if (adminPayload) {
    return {
      isAdmin: true,
      isRider: false,
      adminPayload,
    };
  }

  const riderPayload = await verifyRiderToken(riderToken);
  if (riderPayload) {
    return {
      isAdmin: false,
      isRider: true,
      pilotId: riderPayload.id,
    };
  }

  return {
    isAdmin: false,
    isRider: false,
  };
}
