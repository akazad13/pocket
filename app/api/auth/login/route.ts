import {database} from '@/lib/database';
import {
  verifyCredentials,
  verifyUserPassword,
  createSessionToken,
  makeCookieHeader,
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  DEFAULT_USERNAME
} from '@/lib/auth';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }

  let body: {username?: string; password?: string};
  try {
    body = await request.json() as {username?: string; password?: string};
  } catch {
    return Response.json({error: 'Invalid request payload.'}, {status: 400});
  }

  const rawUsername = typeof body.username === 'string' ? body.username.trim() : '';
  const rawPassword = typeof body.password === 'string' ? body.password : '';
  if (!rawUsername || !rawPassword) {
    return Response.json({error: 'Enter both username and password.'}, {status: 400});
  }

  try {
    const db = database();
    const user = await db
      .prepare('SELECT id, username, password_hash AS passwordHash, salt, name FROM users WHERE username = ? COLLATE NOCASE')
      .bind(rawUsername)
      .first<{id: string; username: string; passwordHash: string; salt: string; name: string}>();

    let authenticated = false;
    let finalUsername = rawUsername;
    let finalName = rawUsername;

    if (user) {
      authenticated = await verifyUserPassword(rawPassword, user.salt, user.passwordHash);
      if (authenticated) {
        finalUsername = user.username;
        finalName = user.name || user.username;
      }
    } else if (rawUsername.toLowerCase() === DEFAULT_USERNAME.toLowerCase()) {
      authenticated = verifyCredentials(rawUsername, rawPassword);
      if (authenticated) {
        finalUsername = DEFAULT_USERNAME;
        finalName = 'Admin';
      }
    }

    if (!authenticated) {
      return Response.json({error: 'Incorrect username or password.'}, {status: 401});
    }

    const token = createSessionToken(finalUsername);
    const setCookie = makeCookieHeader(AUTH_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS);

    return Response.json(
      {ok: true, user: {username: finalUsername, name: finalName}},
      {
        status: 200,
        headers: {
          'Set-Cookie': setCookie,
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({error: 'Authentication failed. Please try again.'}, {status: 500});
  }
}
