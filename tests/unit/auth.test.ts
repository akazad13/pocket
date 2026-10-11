import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  getCookieValue,
  makeCookieHeader,
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD
} from '../../lib/auth';

test('verifyCredentials validates default credentials and rejects wrong inputs', () => {
  assert.equal(verifyCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD), true);
  assert.equal(verifyCredentials('ADMIN', DEFAULT_PASSWORD), true); // case insensitive username
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

  // Expired token
  const pastMs = Date.now() - 1000000;
  const expiredToken = createSessionToken('kalam', pastMs - 8 * 24 * 60 * 60 * 1000);
  assert.equal(verifySessionToken(expiredToken).valid, false);
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
