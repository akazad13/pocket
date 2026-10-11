import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  getCookieValue,
  makeCookieHeader,
  validateUsername,
  validatePassword,
  validateDisplayName,
  generateSalt,
  hashPassword,
  verifyUserPassword,
  getAuthenticatedUser,
  AUTH_COOKIE_NAME,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD
} from '../../lib/auth';

test('validateUsername validates valid usernames and rejects invalid formats', () => {
  assert.equal(validateUsername('kalam'), 'kalam');
  assert.equal(validateUsername('Alice_99'), 'alice_99');
  assert.equal(validateUsername('user-one'), 'user-one');

  assert.throws(() => validateUsername(''), /between 3 and 30/);
  assert.throws(() => validateUsername('ab'), /between 3 and 30/);
  assert.throws(() => validateUsername('a'.repeat(35)), /between 3 and 30/);
  assert.throws(() => validateUsername('kalam@email'), /letters, numbers/);
  assert.throws(() => validateUsername('user space'), /letters, numbers/);
  assert.throws(() => validateUsername(null), /required/);
});

test('validatePassword validates length requirements', () => {
  assert.equal(validatePassword('secret123'), 'secret123');
  assert.throws(() => validatePassword('12345'), /at least 6 characters/);
  assert.throws(() => validatePassword(null), /required/);
  assert.throws(() => validatePassword('a'.repeat(150)), /exceed 128/);
});

test('generateSalt, hashPassword, and verifyUserPassword work correctly', async () => {
  const salt = generateSalt();
  assert.equal(typeof salt, 'string');
  assert.equal(salt.length, 32); // 16 bytes in hex = 32 chars

  const hash = await hashPassword('my-strong-password', salt);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64); // 256 bits = 32 bytes in hex = 64 chars

  const matches = await verifyUserPassword('my-strong-password', salt, hash);
  assert.equal(matches, true);

  const wrong = await verifyUserPassword('wrong-password', salt, hash);
  assert.equal(wrong, false);
});

test('verifyCredentials validates default credentials and rejects wrong inputs', () => {
  assert.equal(verifyCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD), true);
  assert.equal(verifyCredentials('ADMIN', DEFAULT_PASSWORD), true);
  assert.equal(verifyCredentials(DEFAULT_USERNAME, 'wrongpassword'), false);
  assert.equal(verifyCredentials('unknownuser', DEFAULT_PASSWORD), false);
  assert.equal(verifyCredentials('', ''), false);
  assert.equal(verifyCredentials(null, undefined), false);
});

test('createSessionToken and verifySessionToken roundtrip correctly', () => {
  const token = createSessionToken('kalam');
  const res = verifySessionToken(token);
  assert.equal(res.valid, true);
  assert.equal(res.username, 'kalam');
});

test('verifySessionToken rejects tampered and expired tokens', () => {
  const token = createSessionToken('kalam');
  assert.equal(verifySessionToken(token + 'tampered').valid, false);
  assert.equal(verifySessionToken('invalid.token').valid, false);
  assert.equal(verifySessionToken(null).valid, false);

  const pastMs = Date.now() - 1000000;
  const expiredToken = createSessionToken('kalam', pastMs - 8 * 24 * 60 * 60 * 1000);
  assert.equal(verifySessionToken(expiredToken).valid, false);
});

test('getAuthenticatedUser extracts username or falls back to admin', () => {
  const token = createSessionToken('alice');
  const reqWithAuth = new Request('http://127.0.0.1/api/expenses', {
    headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` }
  });
  assert.equal(getAuthenticatedUser(reqWithAuth), 'alice');

  const reqWithoutAuth = new Request('http://127.0.0.1/api/expenses');
  assert.equal(getAuthenticatedUser(reqWithoutAuth), DEFAULT_USERNAME);
});

test('getCookieValue extracts cookie accurately', () => {
  const header = 'theme=dark; pocket_session=abc123token; other=1';
  assert.equal(getCookieValue(header, 'pocket_session'), 'abc123token');
  assert.equal(getCookieValue(header, 'theme'), 'dark');
  assert.equal(getCookieValue(header, 'missing'), null);
  assert.equal(getCookieValue('', 'pocket_session'), null);
  assert.equal(getCookieValue(null, 'pocket_session'), null);
});

test('makeCookieHeader generates compliant header string', () => {
  const cookie = makeCookieHeader('pocket_session', 'my-token', 3600);
  assert.match(cookie, /pocket_session=my-token/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=3600/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('validateDisplayName validates length and sanitizes whitespace', () => {
  assert.equal(validateDisplayName('Kalam Khan'), 'Kalam Khan');
  assert.equal(validateDisplayName('  Alice   Wonder  '), 'Alice Wonder');
  assert.throws(() => validateDisplayName(''), /between 1 and 60/);
  assert.throws(() => validateDisplayName('   '), /between 1 and 60/);
  assert.throws(() => validateDisplayName(null), /required/);
  assert.throws(() => validateDisplayName('a'.repeat(70)), /between 1 and 60/);
});
