import { NextRequest, NextResponse } from 'next/server';
import { getSession, COOKIE_NAME } from '@/lib/auth/session';
import { getUserById } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
