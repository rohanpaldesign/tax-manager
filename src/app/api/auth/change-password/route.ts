import { NextRequest, NextResponse } from 'next/server';
import { getSession, COOKIE_NAME } from '@/lib/auth/session';
import { getUserByEmail, getUserById, updateUserPassword } from '@/lib/db/users';
import { verifyPassword, hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Need passwordHash — fetch by email to get the full record
  const fullUser = await getUserByEmail(user.email);
  if (!fullUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, fullUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(session.userId, passwordHash);

  return NextResponse.json({ ok: true });
}
