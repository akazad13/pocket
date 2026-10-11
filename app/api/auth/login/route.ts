import {
  verifyCredentials,
  createSessionToken,
  makeCookieHeader,
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS
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

  const {username, password} = body;
  if (!username || !password) {
    return Response.json({error: 'Enter both username and password.'}, {status: 400});
  }

  const valid = verifyCredentials(username, password);
  if (!valid) {
    return Response.json({error: 'Incorrect username or password.'}, {status: 401});
  }

  const token = createSessionToken(username.trim());
  const setCookie = makeCookieHeader(AUTH_COOKIE_NAME, token, SESSION_MAX_AGE_SECONDS);

  return Response.json(
    {ok: true, user: {username: username.trim()}},
    {
      status: 200,
      headers: {
        'Set-Cookie': setCookie,
        'Cache-Control': 'no-store'
      }
    }
  );
}
