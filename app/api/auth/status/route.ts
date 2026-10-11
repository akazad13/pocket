import {AUTH_COOKIE_NAME, getCookieValue, verifySessionToken} from '@/lib/auth';

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

  return Response.json(
    {
      authenticated: true,
      user: {username}
    },
    {headers: {'Cache-Control': 'no-store'}}
  );
}
