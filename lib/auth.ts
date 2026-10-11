// Pure auth helpers for Pocket

export const AUTH_COOKIE_NAME = 'pocket_session';
export const DEFAULT_USERNAME = 'admin';
export const DEFAULT_PASSWORD = 'pocket2026';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Configurable credentials via environment variables or defaults
export function getConfiguredCredentials(): {username: string; passwordHashOrPlain: string} {
  const username = (typeof process !== 'undefined' && process.env?.POCKET_USERNAME) || DEFAULT_USERNAME;
  const password = (typeof process !== 'undefined' && process.env?.POCKET_PASSWORD) || DEFAULT_PASSWORD;
  return {username, passwordHashOrPlain: password};
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
  // Simple robust djb2 + Murmur-style hash mix for edge & server environments
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
  const payload = `${encodeURIComponent(username)}.${expiresAtMs}`;
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
    username: decodeURIComponent(encodedUsername)
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
