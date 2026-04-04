-- Tax Manager Database Schema
-- Run this once to initialize your Turso database

CREATE TABLE IF NOT EXISTS tax_returns (
  id          TEXT PRIMARY KEY,           -- UUID
  tax_year    INTEGER NOT NULL DEFAULT 2025,
  session_key TEXT NOT NULL,              -- anonymous session identifier
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | complete
  input_json  TEXT NOT NULL,              -- full TaxReturnInput as JSON
  result_json TEXT,                       -- full TaxCalculationResult as JSON (null until calculated)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tax_returns_session ON tax_returns(session_key);
CREATE INDEX IF NOT EXISTS idx_tax_returns_year    ON tax_returns(tax_year);

-- Auth tables

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  remember_me INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
