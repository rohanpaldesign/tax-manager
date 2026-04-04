import { randomUUID } from 'crypto';
import { getDb } from './client';

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  emailVerified: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export async function createUser(email: string, passwordHash: string): Promise<string> {
  const db = getDb();
  const id = randomUUID();
  if (!db) return id; // stateless mode

  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
    args: [id, email.toLowerCase().trim(), passwordHash],
  });

  return id;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute({
    sql: `SELECT id, email, password_hash, role, email_verified FROM users WHERE email = ?`,
    args: [email.toLowerCase().trim()],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as {
    id: string;
    email: string;
    password_hash: string;
    role: string;
    email_verified: number;
  };

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    emailVerified: row.email_verified !== 0,
  };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.execute({
    sql: `SELECT id, email, role, email_verified FROM users WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as {
    id: string;
    email: string;
    role: string;
    email_verified: number;
  };

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    emailVerified: row.email_verified !== 0,
  };
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.execute({
    sql: `UPDATE users SET password_hash = ? WHERE id = ?`,
    args: [passwordHash, userId],
  });
}

export async function listUsers(
  limit = 50,
  offset = 0
): Promise<{ id: string; email: string; role: string; createdAt: string }[]> {
  const db = getDb();
  if (!db) return [];

  const result = await db.execute({
    sql: `SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });

  return result.rows.map((row) => {
    const r = row as unknown as { id: string; email: string; role: string; created_at: string };
    return {
      id: r.id,
      email: r.email,
      role: r.role,
      createdAt: r.created_at,
    };
  });
}

export async function getUserCount(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db.execute(`SELECT COUNT(*) as count FROM users`);
  const row = result.rows[0] as unknown as { count: number };
  return row.count;
}
