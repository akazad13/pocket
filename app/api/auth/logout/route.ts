import {AUTH_COOKIE_NAME, makeCookieHeader} from '@/lib/auth';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({error: 'Invalid request origin.'}, {status: 403});
  }

  // Clear session cookie
  const clearCookie = makeCookieHeader(AUTH_COOKIE_NAME, '', 0);

  return Response.json(
    {ok: true},
    {
      status: 200,
      headers: {
        'Set-Cookie': clearCookie,
        'Cache-Control': 'no-store'
      }
    }
  );
}
