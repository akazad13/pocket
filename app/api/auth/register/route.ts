import {database} from '@/lib/database';
import {
  validateUsername,
  validatePassword,
  generateSalt,
  hashPassword,
  createSessionToken,
  makeCookieHeader,
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  DEFAULT_USERNAME
} from '@/lib/auth';
import {categories as defaultCategories} from '@/lib/expenses';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }

  let body: {username?: unknown; password?: unknown; name?: unknown};
  try {
    body = await request.json() as {username?: unknown; password?: unknown; name?: unknown};
    if (!body || typeof body !== 'object') throw new Error();
  } catch {
    return Response.json({error: 'Invalid request payload.'}, {status: 400});
  }

  let username: string;
  let password: string;
  try {
    username = validateUsername(body.username);
    password = validatePassword(body.password);
  } catch (err) {
    return Response.json({error: err instanceof Error ? err.message : 'Invalid credentials'}, {status: 400});
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const displayName = rawName ? rawName.slice(0, 50) : username;

  try {
    const db = database();

    // Check if username already exists in users table
    const existing = await db
      .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first<{id: string}>();

    if (existing) {
      return Response.json({error: 'This username is already taken. Please choose another.'}, {status: 409});
    }

    // Disallow registering 'admin' if admin already configured
    if (username === DEFAULT_USERNAME) {
      return Response.json({error: 'The admin username is reserved. Please log in directly.'}, {status: 409});
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert user and seed default starter categories for their isolated workspace
    await db.batch([
      db.prepare('INSERT INTO users (id, username, password_hash, salt, name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(userId, username, hash, salt, displayName, now),
      ...defaultCategories.map(cat =>
        db.prepare('INSERT OR IGNORE INTO custom_categories (key, name, user_id) VALUES (?, ?, ?)')
          .bind(`${username}:${cat.toLowerCase()}`, cat, username)
      )
    ]);

    const token = createSessionToken(username);
    const cookieHeader = makeCookieHeader(AUTH_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS);

    return new Response(JSON.stringify({
      ok: true,
      user: {
        id: userId,
        username,
        name: displayName
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return Response.json({error: 'Could not complete registration. Please try again.'}, {status: 500});
  }
}
