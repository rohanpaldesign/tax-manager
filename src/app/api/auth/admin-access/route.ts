import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession, COOKIE_NAME, cookieOptions } from '@/lib/auth/session';

const ADMIN_EMAIL = 'admin@taxmanager.local';

export async function POST(request: NextRequest) {
  const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE;
  if (!ADMIN_CODE) {
    return NextResponse.json({ error: 'Admin access not configured.' }, { status: 503 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code || code !== ADMIN_CODE) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not available.' }, { status: 503 });
  }

  // Find or create the admin user
  const existing = await db.execute({
    sql: `SELECT id FROM users WHERE email = ?`,
    args: [ADMIN_EMAIL],
  });

  let adminId: string;
  if (existing.rows.length > 0) {
    const row = existing.rows[0] as unknown as { id: string };
    adminId = row.id;
    await db.execute({
      sql: `UPDATE users SET role = 'admin' WHERE id = ?`,
      args: [adminId],
    });
  } else {
    adminId = randomUUID();
    const placeholderHash = await hashPassword(randomUUID());
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, email_verified) VALUES (?, ?, ?, 'admin', 1)`,
      args: [adminId, ADMIN_EMAIL, placeholderHash],
    });
  }

  const sessionId = await createSession(adminId, true);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, sessionId, cookieOptions(true));
  return response;
}
