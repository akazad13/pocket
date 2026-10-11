// Pure auth and multi-user helpers for Pocket

export const AUTH_COOKIE_NAME = 'pocket_session';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'pocket2026';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  name: string;
  createdAt: string;
}

// Configurable credentials via environment variables or defaults
export function getConfiguredCredentials(): {username: string; passwordHashOrPlain: string} {
  const username = (typeof process !== 'undefined' && process.env?.POCKET_USERNAME) || DEFAULT_USERNAME;
  const password = (typeof process !== 'undefined' && process.env?.POCKET_PASSWORD) || DEFAULT_PASSWORD;
  return {username, passwordHashOrPlain: password};
}

/**
 * Validates a new or existing username
 */
export function validateUsername(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Username is required.');
  }
  const clean = input.trim();
  if (clean.length < 3 || clean.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    throw new Error('Username may only contain letters, numbers, underscores, and hyphens.');
  }
  return clean.toLowerCase();
}

/**
 * Validates a new password
 */
export function validatePassword(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Password is required.');
  }
  if (input.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (input.length > 128) {
    throw new Error('Password must not exceed 128 characters.');
  }
  return input;
}

/**
 * Validates display name
 */
export function validateDisplayName(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Name is required.');
  }
  const clean = input.trim().replace(/\s+/g, ' ');
  if (clean.length < 1 || clean.length > 60) {
    throw new Error('Name must be between 1 and 60 characters.');
  }
  return clean;
}

/**
 * Generates a random cryptographic salt (hex string)
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates PBKDF2 SHA-256 hash
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies a candidate password against stored salt and hash
 */
export async function verifyUserPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}

/**
 * Validates provided credentials against configured values
 */
export function verifyCredentials(inputUser: unknown, inputPass: unknown): boolean {
  if (typeof inputUser !== 'string' || typeof inputPass !== 'string') {
    return false;
  }

  const {username, passwordHashOrPlain} = getConfiguredCredentials();
  const trimUser = inputUser.trim();
  const trimPass = inputPass.trim();

  if (!trimUser || !trimPass) return false;

  return trimUser.toLowerCase() === username.toLowerCase() && trimPass === passwordHashOrPlain;
}

/**
 * Generates a deterministic signature for a session payload
 */
function createSignature(payload: string, secret: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const combined = `${payload}:${secret}`;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const SECRET_KEY = (typeof process !== 'undefined' && process.env?.POCKET_AUTH_SECRET) || 'pocket-auth-secret-key-2026';

/**
 * Creates a signed session token
 */
export function createSessionToken(username: string, nowMs = Date.now()): string {
  const expiresAtMs = nowMs + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${encodeURIComponent(username.toLowerCase())}.${expiresAtMs}`;
  const sig = createSignature(payload, SECRET_KEY);
  return `${payload}.${sig}`;
}

/**
 * Verifies a session token
 */
export function verifySessionToken(token: unknown, nowMs = Date.now()): {valid: boolean; username?: string} {
  if (typeof token !== 'string' || !token) {
    return {valid: false};
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return {valid: false};
  }

  const [encodedUsername, expiresAtStr, sig] = parts;
  const expiresAtMs = Number(expiresAtStr);

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
    return {valid: false};
  }

  const payload = `${encodedUsername}.${expiresAtStr}`;
  const expectedSig = createSignature(payload, SECRET_KEY);

  if (sig !== expectedSig) {
    return {valid: false};
  }

  return {
    valid: true,
    username: decodeURIComponent(encodedUsername).toLowerCase()
  };
}

/**
 * Parses a cookie value from a Cookie header
 */
export function getCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Creates Set-Cookie header string
 */
export function makeCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const secure = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Extracts active authenticated username from request, falling back to 'admin'
 */
export function getAuthenticatedUser(request: Request): string {
  const cookieHeader = request.headers.get('cookie');
  const token = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);
  if (token) {
    const session = verifySessionToken(token);
    if (session.valid && session.username) {
      return session.username;
    }
  }
  return DEFAULT_USERNAME;
}
