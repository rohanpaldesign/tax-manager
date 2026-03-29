import { NextRequest, NextResponse } from "next/server";
import { getTaxReturn } from "@/lib/db/returns";
import { generateTaxPDFs } from "@/lib/pdf/generator";

function getSessionKey(req: NextRequest): string {
  return req.cookies.get("session_key")?.value ?? "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionKey = getSessionKey(req);
    const taxReturn = await getTaxReturn(id, sessionKey);

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
