import { NextRequest, NextResponse } from "next/server";
import { getTaxReturn, getTaxReturnForUser } from "@/lib/db/returns";
import { generateTaxPDFs } from "@/lib/pdf/generator";
import { getSession } from "@/lib/auth/session";
import { initDb } from "@/lib/db/client";

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
  try {
    await initDb();
    const { id } = await params;
    const sessionKey = getSessionKey(req);
    let taxReturn = await getTaxReturn(id, sessionKey);
    // Fallback: authenticated users can download their own returns
    if (!taxReturn) {
      const userId = await getAuthUserId(req);
      if (userId) taxReturn = await getTaxReturnForUser(id, userId);
    }

    if (!taxReturn || !taxReturn.result) {
      return NextResponse.json(
        { error: "Tax return not found or not calculated" },
        { status: 404 }
      );
    }

    const pdfBytes = await generateTaxPDFs(taxReturn.input, taxReturn.result);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tax-return-${taxReturn.taxYear}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
