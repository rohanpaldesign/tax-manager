import { NextRequest, NextResponse } from 'next/server';
import { validatePasswordResetToken, markTokenUsed } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/password';
import { updateUserPassword } from '@/lib/db/users';
import { deleteAllUserSessions } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  let body: { token?: unknown; password?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!rawToken) {
    return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const userId = await validatePasswordResetToken(rawToken);
  if (!userId) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired.' },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  await updateUserPassword(userId, passwordHash);
  await markTokenUsed(rawToken);
  await deleteAllUserSessions(userId);

  return NextResponse.json({ ok: true });
}
