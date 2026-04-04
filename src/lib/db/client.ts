import { createClient, type Client } from "@libsql/client";

// Lazy singleton — does not throw at import time if env vars are missing.
// Returns null when DB is unconfigured (app works in stateless mode).
let _client: Client | null = null;

export function getDb(): Client | null {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  _client = createClient({ url, authToken });
  return _client;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_returns (
      id          TEXT PRIMARY KEY,
      tax_year    INTEGER NOT NULL DEFAULT 2025,
      session_key TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'draft',
      input_json  TEXT NOT NULL,
      result_json TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_tax_returns_session ON tax_returns(session_key)`
  );

  // Auth tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TEXT NOT NULL,
      remember_me INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      used        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);

  // Migrations — ADD COLUMN is idempotent via try/catch (SQLite has no IF NOT EXISTS for columns)
  try {
    await db.execute(`ALTER TABLE tax_returns ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
  } catch { /* column already exists */ }
  try {
    await db.execute(`ALTER TABLE tax_returns ADD COLUMN stage INTEGER NOT NULL DEFAULT 1`);
  } catch { /* column already exists */ }
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tax_returns_user ON tax_returns(user_id)`);
  } catch { /* index already exists */ }
}
