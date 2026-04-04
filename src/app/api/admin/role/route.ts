import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db/client";
import { getSession, COOKIE_NAME } from "@/lib/auth/session";

// POST /api/admin/role  { email, action: "grant" | "revoke" }
export async function POST(req: NextRequest) {
  await initDb();

  const sessionId = req.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getSession(sessionId);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, action } = body as { email: string; action: "grant" | "revoke" };

  if (!email || !["grant", "revoke"].includes(action)) {
    return NextResponse.json({ error: "email and action ('grant'|'revoke') required" }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  // Prevent self-revoke
  const selfRes = await db.execute({ sql: `SELECT email FROM users WHERE id = ?`, args: [session.userId] });
  const selfEmail = String((selfRes.rows[0] as Record<string, unknown>)?.email ?? "");
  if (action === "revoke" && selfEmail.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "Cannot revoke your own admin role" }, { status: 400 });
  }

  const newRole = action === "grant" ? "admin" : "user";
  const res = await db.execute({
    sql: `UPDATE users SET role = ? WHERE lower(email) = lower(?)`,
    args: [newRole, email],
  });

  if ((res.rowsAffected ?? 0) === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email, role: newRole });
}
