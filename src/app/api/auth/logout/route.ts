import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
