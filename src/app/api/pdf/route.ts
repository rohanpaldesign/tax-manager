// POST /api/pdf — generate PDF from result passed in body (no DB required)
import { NextRequest, NextResponse } from "next/server";
import { generateTaxPDFs } from "@/lib/pdf/generator";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, result } = body as {
      input: TaxReturnInput;
      result: TaxCalculationResult;
    };

    if (!input || !result) {
      return NextResponse.json(
        { error: "input and result are required" },
        { status: 400 }
      );
    }

    const pdfBytes = await generateTaxPDFs(input, result);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tax-return-2025.pdf"`,
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
