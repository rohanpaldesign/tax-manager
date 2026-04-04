import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db/client';

export const COOKIE_NAME = 'tm_session';

const SESSION_TTL_NORMAL = 24 * 60 * 60 * 1000; // 24 hours in ms
const SESSION_TTL_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export function cookieOptions(rememberMe: boolean): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: rememberMe ? 30 * 24 * 3600 : 24 * 3600,
  };
}

export async function createSession(userId: string, rememberMe: boolean): Promise<string> {
  const db = getDb();
  if (!db) return randomUUID(); // stateless mode — return id without persisting

  const id = randomUUID();
  const ttl = rememberMe ? SESSION_TTL_REMEMBER : SESSION_TTL_NORMAL;
  const expiresAt = new Date(Date.now() + ttl).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, expires_at, remember_me) VALUES (?, ?, ?, ?)`,
    args: [id, userId, expiresAt, rememberMe ? 1 : 0],
  });

  return id;
}

export async function getSession(
  sessionId: string
): Promise<{ userId: string; role: string } | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute({
    sql: `SELECT s.user_id, s.expires_at, u.role
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.id = ?`,
    args: [sessionId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as { user_id: string; expires_at: string; role: string };
  const expiresAt = new Date(row.expires_at);

  if (expiresAt < new Date()) {
    // Expired — clean up
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [sessionId] });
    return null;
  }

  return { userId: row.user_id, role: row.role };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [sessionId] });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute({ sql: `DELETE FROM sessions WHERE user_id = ?`, args: [userId] });
}
