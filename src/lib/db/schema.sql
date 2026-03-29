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
