import { NextRequest, NextResponse } from "next/server";
import { getTaxReturn, updateTaxReturn, deleteTaxReturn } from "@/lib/db/returns";
import { calculateTaxes } from "@/lib/tax-engine";

function getSessionKey(req: NextRequest): string {
  return req.cookies.get("session_key")?.value ?? "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionKey = getSessionKey(req);
  const taxReturn = await getTaxReturn(id, sessionKey);
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
