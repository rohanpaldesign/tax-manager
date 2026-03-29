import { db } from "./client";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";
import { randomUUID } from "crypto";

export interface TaxReturn {
  id: string;
  taxYear: number;
  sessionKey: string;
  status: "draft" | "complete";
  input: TaxReturnInput;
  result?: TaxCalculationResult;
  createdAt: string;
  updatedAt: string;
}

export async function createTaxReturn(
  sessionKey: string,
  input: TaxReturnInput
): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO tax_returns (id, session_key, input_json, status)
          VALUES (?, ?, ?, 'draft')`,
    args: [id, sessionKey, JSON.stringify(input)],
  });
  return id;
}

export async function getTaxReturn(
  id: string,
  sessionKey: string
): Promise<TaxReturn | null> {
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE id = ? AND session_key = ?`,
    args: [id, sessionKey],
  });
  if (result.rows.length === 0) return null;
  return rowToTaxReturn(result.rows[0]);
}

export async function updateTaxReturn(
  id: string,
  sessionKey: string,
  input: TaxReturnInput,
  result?: TaxCalculationResult
): Promise<void> {
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
  const result = await db.execute({
    sql: `SELECT * FROM tax_returns WHERE session_key = ? ORDER BY updated_at DESC`,
    args: [sessionKey],
  });
  return result.rows.map(rowToTaxReturn);
}

export async function deleteTaxReturn(
  id: string,
  sessionKey: string
): Promise<void> {
  await db.execute({
    sql: `DELETE FROM tax_returns WHERE id = ? AND session_key = ?`,
    args: [id, sessionKey],
  });
}

function rowToTaxReturn(row: Record<string, unknown>): TaxReturn {
  return {
    id: row.id as string,
    taxYear: row.tax_year as number,
    sessionKey: row.session_key as string,
    status: row.status as "draft" | "complete",
    input: JSON.parse(row.input_json as string),
    result: row.result_json ? JSON.parse(row.result_json as string) : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
