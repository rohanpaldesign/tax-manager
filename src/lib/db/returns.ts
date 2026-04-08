import { getDb } from "./client";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";
import { randomUUID } from "crypto";

export interface TaxReturn {
  id: string;
  taxYear: number;
  sessionKey: string;
  userId?: string;
  stage: number;
  status: "draft" | "complete";
  input: TaxReturnInput;
  result?: TaxCalculationResult;
  createdAt: string;
  updatedAt: string;
}

export async function createTaxReturn(
  sessionKey: string,
  input: TaxReturnInput,
  result?: TaxCalculationResult,
  userId?: string | null,
  stage = 1
): Promise<string> {
  const id = randomUUID();
  const db = getDb();
  if (!db) return id; // stateless mode — return id without persisting
  await db.execute({
    sql: `INSERT INTO tax_returns (id, session_key, user_id, stage, input_json, result_json, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      sessionKey,
      userId ?? null,
      stage,
      JSON.stringify(input),
      result ? JSON.stringify(result) : null,
      result ? "complete" : "draft",
    ],
  });
  return id;
}

export async function getTaxReturn(
  id: string,
  sessionKey: string
): Promise<TaxReturn | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE id = ? AND session_key = ?`,
    args: [id, sessionKey],
  });
  if (result.rows.length === 0) return null;
  return rowToTaxReturn(result.rows[0] as Record<string, unknown>);
}

export async function updateTaxReturn(
  id: string,
  sessionKey: string,
  input: TaxReturnInput,
  result?: TaxCalculationResult
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute({
    sql: `UPDATE tax_returns
          SET input_json = ?, result_json = ?, status = ?, updated_at = datetime('now')
          WHERE id = ? AND session_key = ?`,
    args: [
      JSON.stringify(input),
      result ? JSON.stringify(result) : null,
      result ? "complete" : "draft",
      id,
      sessionKey,
    ],
  });
}

export async function listTaxReturns(sessionKey: string): Promise<TaxReturn[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE session_key = ? ORDER BY updated_at DESC`,
    args: [sessionKey],
  });
  return result.rows.map((r) => rowToTaxReturn(r as Record<string, unknown>));
}

export async function deleteTaxReturn(
  id: string,
  sessionKey: string
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.execute({
    sql: `DELETE FROM tax_returns WHERE id = ? AND session_key = ?`,
    args: [id, sessionKey],
  });
}

export async function getTaxReturnForUser(id: string, userId: string): Promise<TaxReturn | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return rowToTaxReturn(result.rows[0] as Record<string, unknown>);
}

export async function findLatestReturn(
  sessionKey: string,
  userId?: string | null
): Promise<TaxReturn | null> {
  const db = getDb();
  if (!db) return null;
  // Find the most recently updated return for this session or user (prefer user match)
  const sql = userId
    ? `SELECT * FROM tax_returns WHERE (session_key = ? OR user_id = ?) ORDER BY updated_at DESC LIMIT 1`
    : `SELECT * FROM tax_returns WHERE session_key = ? ORDER BY updated_at DESC LIMIT 1`;
  const args = userId ? [sessionKey, userId] : [sessionKey];
  const result = await db.execute({ sql, args });
  if (result.rows.length === 0) return null;
  return rowToTaxReturn(result.rows[0] as Record<string, unknown>);
}

export async function listUserReturns(userId: string): Promise<TaxReturn[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE user_id = ? ORDER BY updated_at DESC`,
    args: [userId],
  });
  return result.rows.map((r) => rowToTaxReturn(r as Record<string, unknown>));
}

export async function deleteUserReturn(id: string, userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  // Only allow deleting draft returns; completed returns are permanent
  const existing = await db.execute({
    sql: `SELECT id, status FROM tax_returns WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  if (existing.rows.length === 0) return false;
  const row = existing.rows[0] as unknown as { status: string };
  if (row.status === "complete") return false; // permanent
  await db.execute({
    sql: `DELETE FROM tax_returns WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return true;
}

function rowToTaxReturn(row: Record<string, unknown>): TaxReturn {
  return {
    id: row.id as string,
    taxYear: row.tax_year as number,
    sessionKey: row.session_key as string,
    userId: row.user_id as string | undefined,
    stage: (row.stage as number) ?? 1,
    status: row.status as "draft" | "complete",
    input: JSON.parse(row.input_json as string),
    result: row.result_json
      ? JSON.parse(row.result_json as string)
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
