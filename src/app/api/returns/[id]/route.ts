import { NextRequest, NextResponse } from "next/server";
import { getTaxReturn, getTaxReturnForUser, updateTaxReturn, deleteTaxReturn } from "@/lib/db/returns";
import { calculateTaxes } from "@/lib/tax-engine";
import { getSession } from "@/lib/auth/session";

function getSessionKey(req: NextRequest): string {
  return req.cookies.get("session_key")?.value ?? "";
}

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const sessionId = req.cookies.get("tm_session")?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  return session?.userId ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionKey = getSessionKey(req);
  let taxReturn = await getTaxReturn(id, sessionKey);
  // Fallback: authenticated users can access by userId
  if (!taxReturn) {
    const userId = await getAuthUserId(req);
    if (userId) taxReturn = await getTaxReturnForUser(id, userId);
  }
  if (!taxReturn) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(taxReturn);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionKey = getSessionKey(req);
    const { input } = await req.json();

    const existing = await getTaxReturn(id, sessionKey);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = calculateTaxes(input);
    await updateTaxReturn(id, sessionKey, input, result);

    return NextResponse.json({ result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionKey = getSessionKey(req);
  await deleteTaxReturn(id, sessionKey);
  return NextResponse.json({ success: true });
}
