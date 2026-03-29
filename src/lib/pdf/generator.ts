// ─── PDF Generator ────────────────────────────────────────────────────────────
// Fills IRS-formatted PDFs using pdf-lib
// Official IRS PDFs are stored in /public/irs-forms/
// Field names are extracted from the official fillable PDFs

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";

const FORMS_DIR = path.join(process.cwd(), "public", "irs-forms");

async function loadForm(filename: string): Promise<PDFDocument | null> {
  const filepath = path.join(FORMS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`IRS form not found: ${filename}. Using generated summary instead.`);
    return null;
  }
  const bytes = fs.readFileSync(filepath);
  return PDFDocument.load(bytes);
}

function fmt(n: number): string {
  return Math.round(n).toString();
}

function fmtSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// ─── Form 1040 ────────────────────────────────────────────────────────────────
// IRS Form 1040 field names (from the official 2024 fillable PDF)
// These will be updated to 2025 field names when the 2025 form is released
async function fill1040(
  input: TaxReturnInput,
  result: TaxCalculationResult
): Promise<Uint8Array> {
  const template = await loadForm("f1040.pdf");
  const doc = template ?? await PDFDocument.create();

  if (template) {
    const form = doc.getForm();
    const f = result.federal;

    // Personal info
    trySet(form, "topmostSubform[0].Page1[0].f1_01[0]", input.firstName + " " + input.lastName);
    trySet(form, "topmostSubform[0].Page1[0].f1_02[0]", fmtSSN(input.ssn));
    if (input.spouseFirstName) {
      trySet(form, "topmostSubform[0].Page1[0].f1_03[0]", input.spouseFirstName + " " + input.spouseLastName);
      trySet(form, "topmostSubform[0].Page1[0].f1_04[0]", fmtSSN(input.spouseSsn ?? ""));
    }
    trySet(form, "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_05[0]", input.address);
    trySet(form, "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_06[0]", `${input.city}, ${input.state} ${input.zip}`);

    // Filing status checkboxes
    const statusFields: Record<string, string> = {
      single: "topmostSubform[0].Page1[0].FilingStatus[0].c1_01[0]",
      married_filing_jointly: "topmostSubform[0].Page1[0].FilingStatus[0].c1_02[0]",
      married_filing_separately: "topmostSubform[0].Page1[0].FilingStatus[0].c1_03[0]",
      head_of_household: "topmostSubform[0].Page1[0].FilingStatus[0].c1_04[0]",
      qualifying_surviving_spouse: "topmostSubform[0].Page1[0].FilingStatus[0].c1_05[0]",
    };
    tryCheck(form, statusFields[input.filingStatus]);

    // Income lines (Page 1)
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_25[0]", fmt(f.totalWages));        // Line 1z
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_27[0]", fmt(f.totalInterest));     // Line 2b
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_30[0]", fmt(f.totalDividends));    // Line 3b
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_32[0]", fmt(f.iRADistributions));  // Line 4b
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_34[0]", fmt(f.pensionAnnuities));  // Line 5b
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_36[0]", fmt(f.socialSecurityTaxable)); // Line 6b
    trySet(form, "topmostSubform[0].Page1[0].Lines1-8[0].f1_38[0]", fmt(f.totalCapitalGains));  // Line 7

    // AGI adjustments (Page 2)
    trySet(form, "topmostSubform[0].Page2[0].Lines8-15[0].f2_03[0]", fmt(f.totalIncome));       // Line 9 total income
    trySet(form, "topmostSubform[0].Page2[0].Lines8-15[0].f2_05[0]", fmt(f.totalAdjustments));  // Line 10
    trySet(form, "topmostSubform[0].Page2[0].Lines8-15[0].f2_06[0]", fmt(f.adjustedGrossIncome)); // Line 11 AGI
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_07[0]", fmt(f.standardOrItemizedDeduction)); // Line 12
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_09[0]", fmt(f.qualifiedBusinessIncomeDeduction)); // Line 13
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_11[0]", fmt(f.taxableIncome));    // Line 15 taxable income
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_12[0]", fmt(f.regularTax));       // Line 16 tax
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_14[0]", fmt(f.alternativeMinimumTax)); // Line 17 AMT
    trySet(form, "topmostSubform[0].Page2[0].Lines16-24[0].f2_18[0]", fmt(f.totalTax));         // Line 24 total tax

    // Payments
    trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_21[0]", fmt(f.totalWithheld));    // Line 25a
    trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_24[0]", fmt(f.estimatedTaxPaid)); // Line 26
    trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_26[0]", fmt(f.earnedIncomeCredit)); // Line 27 EITC
    trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_29[0]", fmt(f.totalPayments));    // Line 33 total payments

    // Refund / Amount Due
    if (f.refund > 0) {
      trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_30[0]", fmt(f.refund));         // Line 34
      if (input.directDepositRouting) {
        trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_32[0]", input.directDepositRouting);
        trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_34[0]", input.directDepositAccount ?? "");
      }
    }
    if (f.amountDue > 0) {
      trySet(form, "topmostSubform[0].Page2[0].Lines25-37[0].f2_35[0]", fmt(f.amountDue));      // Line 37
    }

    form.flatten();
  } else {
    // Fallback: generate a clean summary PDF
    return generateSummaryPDF(input, result);
  }

  return doc.save();
}

// ─── Summary PDF (fallback when IRS templates not yet downloaded) ─────────────
async function generateSummaryPDF(
  input: TaxReturnInput,
  result: TaxCalculationResult
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const addPage = () => {
    const page = doc.addPage([612, 792]); // Letter size
    return page;
  };

  let page = addPage();
  let y = 750;
  const margin = 60;
  const lineHeight = 16;

  const drawText = (text: string, x: number, yPos: number, size = 10, bold = false) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: 612 - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  const drawRow = (label: string, value: string, yPos: number, bold = false) => {
    drawText(label, margin, yPos, 9, bold);
    drawText(value, 420, yPos, 9, bold);
  };

  const money = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString()}${n < 0 ? " CR" : ""}`;

  // Header
  drawText("UNITED STATES INDIVIDUAL INCOME TAX RETURN — TAX YEAR 2025", margin, y, 12, true);
  drawText("(Summary — Attach official IRS Form 1040 for filing)", margin, y - 16, 9);
  y -= 40;

  drawText(`Taxpayer: ${input.firstName} ${input.lastName}`, margin, y, 10);
  drawText(`SSN: ${fmtSSN(input.ssn)}`, 380, y, 10);
  y -= lineHeight;
  drawText(`Filing Status: ${input.filingStatus.replace(/_/g, " ").toUpperCase()}`, margin, y, 10);
  y -= lineHeight;
  drawText(`Address: ${input.address}, ${input.city}, ${input.state} ${input.zip}`, margin, y, 10);
  y -= 24;

  drawLine(y);
  y -= 16;

  // Federal Income
  drawText("FEDERAL INCOME SUMMARY", margin, y, 11, true);
  y -= 20;

  const f = result.federal;
  const rows: [string, number, boolean?][] = [
    ["Wages, Salaries, Tips", f.totalWages],
    ["Taxable Interest", f.totalInterest],
    ["Ordinary Dividends", f.totalDividends],
    ["Qualified Dividends", f.qualifiedDividends],
    ["Capital Gains (Net)", f.totalCapitalGains],
    ["IRA/Pension Distributions", f.iRADistributions + f.pensionAnnuities],
    ["Business Income (Schedule C)", f.scheduleCNetProfit],
    ["Rental Income (Schedule E)", f.scheduleENetIncome],
    ["Social Security (Taxable)", f.socialSecurityTaxable],
    ["Other Income", f.otherIncome],
    ["Total Income", f.totalIncome, true],
    ["Adjustments to Income", -f.totalAdjustments],
    ["Adjusted Gross Income", f.adjustedGrossIncome, true],
    [f.isItemized ? "Itemized Deductions (Schedule A)" : "Standard Deduction", -f.standardOrItemizedDeduction],
    ["QBI Deduction (Sec. 199A)", -f.qualifiedBusinessIncomeDeduction],
    ["Taxable Income", f.taxableIncome, true],
  ];

  for (const [label, value, bold] of rows) {
    drawRow(label, money(value), y, bold);
    y -= lineHeight;
    if (y < 80) {
      page = addPage();
      y = 750;
    }
  }

  y -= 8;
  drawLine(y);
  y -= 16;
  drawText("TAX CALCULATION", margin, y, 11, true);
  y -= 20;

  const taxRows: [string, number, boolean?][] = [
    ["Regular Income Tax", f.regularTax],
    ["Alternative Minimum Tax (AMT)", f.alternativeMinimumTax],
    ["Net Investment Income Tax (3.8%)", f.netInvestmentIncomeTax],
    ["Self-Employment Tax", f.selfEmploymentTax],
    ["Additional Medicare Tax (0.9%)", f.additionalMedicareTax],
    ["Total Tax Before Credits", f.regularTax + f.alternativeMinimumTax + f.netInvestmentIncomeTax + f.selfEmploymentTax + f.additionalMedicareTax, true],
    ["Child Tax Credit", -f.childTaxCredit],
    ["Earned Income Credit (EITC)", -f.earnedIncomeCredit],
    ["Child & Dependent Care Credit", -f.childCareCredit],
    ["Education Credits", -f.educationCredits],
    ["Other Credits", -f.otherCredits],
    ["Total Tax After Credits", f.totalTax, true],
    ["Federal Taxes Withheld", -f.totalWithheld],
    ["Estimated Tax Payments", -f.estimatedTaxPaid],
    ["Refundable Credits", -f.refundableCredits],
    ["Total Payments", -f.totalPayments, true],
  ];

  for (const [label, value, bold] of taxRows) {
    drawRow(label, money(value), y, bold);
    y -= lineHeight;
    if (y < 80) {
      page = addPage();
      y = 750;
    }
  }

  y -= 8;
  drawLine(y);
  y -= 20;

  if (f.refund > 0) {
    drawText(`FEDERAL REFUND: ${money(f.refund)}`, margin, y, 14, true);
    page.drawRectangle({ x: margin - 4, y: y - 4, width: 300, height: 20, color: rgb(0.9, 1, 0.9) });
    drawText(`FEDERAL REFUND: ${money(f.refund)}`, margin, y, 14, true);
  } else if (f.amountDue > 0) {
    drawText(`FEDERAL AMOUNT DUE: ${money(f.amountDue)}`, margin, y, 14, true);
    page.drawRectangle({ x: margin - 4, y: y - 4, width: 300, height: 20, color: rgb(1, 0.9, 0.9) });
    drawText(`FEDERAL AMOUNT DUE: ${money(f.amountDue)}`, margin, y, 14, true);
  } else {
    drawText("FEDERAL: BALANCED — NO REFUND / NO AMOUNT DUE", margin, y, 12, true);
  }

  y -= 24;
  drawText(`Effective Tax Rate: ${(f.effectiveTaxRate * 100).toFixed(2)}%   |   Marginal Rate: ${(f.marginalTaxRate * 100).toFixed(0)}%`, margin, y, 9);

  // State results
  if (result.state) {
    y -= 32;
    drawLine(y);
    y -= 16;
    drawText(`STATE TAX SUMMARY — ${result.state.state}`, margin, y, 11, true);
    y -= 20;

    const st = result.state;
    const stRows: [string, number, boolean?][] = [
      ["State Taxable Income", st.taxableIncome],
      ["State Tax", st.stateTax],
      ["State Credits", -st.stateCredits],
      ["State Taxes Withheld", -st.stateWithheld],
    ];
    for (const [label, value, bold] of stRows) {
      drawRow(label, money(value), y, bold);
      y -= lineHeight;
    }
    y -= 8;
    if (st.refund > 0) {
      drawText(`STATE REFUND: ${money(st.refund)}`, margin, y, 12, true);
    } else if (st.amountDue > 0) {
      drawText(`STATE AMOUNT DUE: ${money(st.amountDue)}`, margin, y, 12, true);
    }
  }

  // Forms required
  if (result.formsRequired.length > 0) {
    y -= 32;
    if (y < 150) {
      page = addPage();
      y = 750;
    }
    drawLine(y);
    y -= 16;
    drawText("FORMS REQUIRED FOR THIS RETURN", margin, y, 11, true);
    y -= 18;
    for (const form of result.formsRequired) {
      drawText(`• ${form}`, margin + 10, y, 9);
      y -= 14;
      if (y < 80) {
        page = addPage();
        y = 750;
      }
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    y -= 16;
    if (y < 150) {
      page = addPage();
      y = 750;
    }
    drawLine(y);
    y -= 16;
    drawText("NOTICES & WARNINGS", margin, y, 11, true);
    y -= 18;
    for (const warning of result.warnings) {
      const words = warning.split(" ");
      let line = "";
      for (const word of words) {
        if ((line + word).length > 80) {
          drawText(`⚠ ${line.trim()}`, margin + 10, y, 9);
          y -= 14;
          line = word + " ";
          if (y < 80) {
            page = addPage();
            y = 750;
          }
        } else {
          line += word + " ";
        }
      }
      if (line.trim()) {
        drawText(`⚠ ${line.trim()}`, margin + 10, y, 9);
        y -= 14;
      }
    }
  }

  // Filing instructions
  if (result.filingInstructions.length > 0) {
    y -= 16;
    if (y < 150) {
      page = addPage();
      y = 750;
    }
    drawLine(y);
    y -= 16;
    drawText("FILING INSTRUCTIONS", margin, y, 11, true);
    y -= 18;
    for (const inst of result.filingInstructions) {
      drawText(`${inst.form} — ${inst.title}`, margin, y, 10, true);
      y -= 14;
      drawText(`Deadline: ${inst.deadline}${inst.efileAvailable ? "   (E-file available)" : ""}`, margin + 10, y, 9);
      y -= 12;
      if (inst.mailTo) {
        drawText(`Mail to: ${inst.mailTo}`, margin + 10, y, 8);
        y -= 12;
      }
      for (const note of inst.notes) {
        const words = note.split(" ");
        let line = "";
        for (const word of words) {
          if ((line + word).length > 85) {
            drawText(`• ${line.trim()}`, margin + 14, y, 8);
            y -= 12;
            line = word + " ";
            if (y < 80) { page = addPage(); y = 750; }
          } else {
            line += word + " ";
          }
        }
        if (line.trim()) { drawText(`• ${line.trim()}`, margin + 14, y, 8); y -= 12; }
      }
      y -= 10;
      if (y < 80) { page = addPage(); y = 750; }
    }
  }

  // Footer on last page
  drawLine(40);
  drawText(
    "This document is generated by Tax Manager (tax-manager) for informational purposes. Consult a licensed tax professional for advice.",
    margin, 28, 7
  );

  return doc.save();
}

function trySet(form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>, fieldName: string, value: string) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // Field not found in this version of the form — skip silently
  }
}

function tryCheck(form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>, fieldName: string) {
  try {
    const checkbox = form.getCheckBox(fieldName);
    checkbox.check();
  } catch {
    // skip
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateTaxPDFs(
  input: TaxReturnInput,
  result: TaxCalculationResult
): Promise<Uint8Array> {
  // For now, generate summary PDF
  // When official IRS 2025 forms are released, fill1040() will use those
  return generateSummaryPDF(input, result);
}
