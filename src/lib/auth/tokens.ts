import { randomUUID, createHash } from 'crypto';
import { getDb } from '@/lib/db/client';

const TOKEN_TTL = 60 * 60 * 1000; // 1 hour in ms

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const db = getDb();
  const rawToken = randomUUID();
  if (!db) return rawToken; // stateless mode

  const tokenHash = hashToken(rawToken);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL).toISOString();

  // Invalidate any existing tokens for this user
  await db.execute({
    sql: `UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0`,
    args: [userId],
  });

  await db.execute({
    sql: `INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    args: [id, userId, tokenHash, expiresAt],
  });

  return rawToken;
}

export async function validatePasswordResetToken(rawToken: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const tokenHash = hashToken(rawToken);

  const result = await db.execute({
    sql: `SELECT user_id, expires_at, used FROM password_resets WHERE token_hash = ?`,
    args: [tokenHash],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as { user_id: string; expires_at: string; used: number };

  if (row.used !== 0) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return row.user_id;
}

export async function markTokenUsed(rawToken: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const tokenHash = hashToken(rawToken);
  await db.execute({
    sql: `UPDATE password_resets SET used = 1 WHERE token_hash = ?`,
    args: [tokenHash],
  });
}
