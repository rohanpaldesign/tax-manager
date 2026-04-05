import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db/client";
import { listUserReturns, deleteUserReturn } from "@/lib/db/returns";
import { getSession } from "@/lib/auth/session";

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const sessionId = req.cookies.get("tm_session")?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session?.userId ?? null;
}

export async function GET(req: NextRequest) {
  await initDb();
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const returns = await listUserReturns(userId);
  return NextResponse.json({ returns });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const deleted = await deleteUserReturn(id, userId);
  if (!deleted) return NextResponse.json({ error: "Not found or return is completed (permanent)" }, { status: 404 });
  return NextResponse.json({ success: true });
}
