import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteAllUserSessions, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      await deleteAllUserSessions(session.userId);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
