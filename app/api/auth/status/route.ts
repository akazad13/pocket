import {database} from '@/lib/database';
import {AUTH_COOKIE_NAME, getCookieValue, verifySessionToken, DEFAULT_USERNAME} from '@/lib/auth';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const sessionToken = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

  if (!sessionToken) {
    return Response.json({authenticated: false, user: null}, {headers: {'Cache-Control': 'no-store'}});
  }

  const {valid, username} = verifySessionToken(sessionToken);
  if (!valid || !username) {
    return Response.json({authenticated: false, user: null}, {headers: {'Cache-Control': 'no-store'}});
  }

  let displayName = username;
  try {
    const db = database();
    const row = await db.prepare('SELECT name FROM users WHERE username = ? COLLATE NOCASE').bind(username).first<{name: string}>();
    if (row?.name) {
      displayName = row.name;
    } else if (username.toLowerCase() === DEFAULT_USERNAME.toLowerCase()) {
      displayName = 'Admin';
    }
  } catch {}

  return Response.json(
    {
      authenticated: true,
      user: {username, name: displayName}
    },
    {headers: {'Cache-Control': 'no-store'}}
  );
}
