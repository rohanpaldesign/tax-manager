import { NextRequest, NextResponse } from "next/server";
import { createTaxReturn, listTaxReturns } from "@/lib/db/returns";
import { initDb } from "@/lib/db/client";
import { calculateTaxes } from "@/lib/tax-engine";
import { TaxReturnInputSchema } from "@/lib/validation";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/session";

function getOrCreateSessionKey(req: NextRequest): string {
  return req.cookies.get("session_key")?.value ?? randomUUID();
}

export async function GET(req: NextRequest) {
  await initDb();
  const sessionKey = getOrCreateSessionKey(req);
  const returns = await listTaxReturns(sessionKey);
  return NextResponse.json({ returns });
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const sessionKey = getOrCreateSessionKey(req);
    const body = await req.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const parsed = TaxReturnInputSchema.safeParse(input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sessionId = req.cookies.get("tm_session")?.value;
    let userId: string | null = null;
    if (sessionId) {
      const authSession = await getSession(sessionId);
      if (authSession) userId = authSession.userId;
    }

    const result = calculateTaxes(parsed.data);
    const id = await createTaxReturn(sessionKey, parsed.data, result, userId, 6);

    const response = NextResponse.json({ id, result }, { status: 201 });
    response.cookies.set("session_key", sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
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
