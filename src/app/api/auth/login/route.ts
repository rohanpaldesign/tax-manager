import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/users';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, COOKIE_NAME, cookieOptions } from '@/lib/auth/session';

// Track consecutive failures per email
const failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();

const MAX_FAILURES = 5;

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown; rememberMe?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const rememberMe = body.rememberMe === true;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Check lock
  const attempts = failedAttempts.get(email);
  if (attempts && attempts.count >= MAX_FAILURES) {
    return NextResponse.json(
      { error: 'Account temporarily locked. Check your email to unlock.' },
      { status: 403 }
    );
  }

  const user = await getUserByEmail(email);
  const genericError = 'Email or password is incorrect.';

  if (!user) {
    // Increment failure counter even for non-existent users (timing safe-ish)
    const entry = failedAttempts.get(email) ?? { count: 0 };
    entry.count++;
    failedAttempts.set(email, entry);
    return NextResponse.json({ error: genericError }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const entry = failedAttempts.get(email) ?? { count: 0 };
    entry.count++;
    failedAttempts.set(email, entry);
    return NextResponse.json({ error: genericError }, { status: 401 });
  }

  // Success — reset failure count
  failedAttempts.delete(email);

  const sessionId = await createSession(user.id, rememberMe);

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(COOKIE_NAME, sessionId, cookieOptions(rememberMe));
  return response;
}
