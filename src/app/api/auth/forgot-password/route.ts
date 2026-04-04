import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/users';
import { createPasswordResetToken } from '@/lib/auth/tokens';

const RESPONSE = {
  ok: true,
  message: 'If that email is registered, a reset link has been sent.',
};

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(RESPONSE);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    return NextResponse.json(RESPONSE);
  }

  const user = await getUserByEmail(email);
  if (user) {
    const rawToken = await createPasswordResetToken(user.id);
    const resetUrl = `http://localhost:3000/reset-password?token=${rawToken}`;
    console.log('Password reset URL:', resetUrl);
  }

  return NextResponse.json(RESPONSE);
}
