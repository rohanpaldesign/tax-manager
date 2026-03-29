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
}
