import { NextRequest, NextResponse } from "next/server";
import { createTaxReturn, listTaxReturns } from "@/lib/db/returns";
import { calculateTaxes } from "@/lib/tax-engine";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

function getOrCreateSessionKey(req: NextRequest): string {
  return req.cookies.get("session_key")?.value ?? randomUUID();
}

export async function GET(req: NextRequest) {
  const sessionKey = getOrCreateSessionKey(req);
  const returns = await listTaxReturns(sessionKey);
  return NextResponse.json({ returns });
}

export async function POST(req: NextRequest) {
  try {
    const sessionKey = getOrCreateSessionKey(req);
    const body = await req.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const id = await createTaxReturn(sessionKey, input);
    const result = calculateTaxes(input);

    const response = NextResponse.json({ id, result }, { status: 201 });
    response.cookies.set("session_key", sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to calculate taxes" },
      { status: 500 }
    );
  }
}
