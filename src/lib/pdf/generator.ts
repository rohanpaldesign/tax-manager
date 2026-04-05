// ─── PDF Generator ────────────────────────────────────────────────────────────
// Generates a 6-part filing package PDF using pdf-lib.
// Cover → Part 1 (How to File) → Part 2 (Federal) → Part 3 (State)
//      → Part 4 (Payment Vouchers) → Part 5 (Estimated Tax) → Part 6 (Checklist)

import { PDFDocument, StandardFonts, rgb, PDFPage, type RGB } from "pdf-lib";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { TaxReturnInput, TaxCalculationResult } from "@/types/tax";
import { sortFormsByAttachmentOrder } from "@/lib/tax-engine/forms/instructions";

const FORMS_DIR = path.join(process.cwd(), "public", "irs-forms");

async function loadForm(filename: string): Promise<PDFDocument | null> {
  const filepath = path.join(FORMS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  const bytes = fs.readFileSync(filepath);
  return PDFDocument.load(bytes);
}

function fmt(n: number): string {
  return Math.round(n).toString();
}

function fmtMoney(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString()}${n < 0 ? " CR" : ""}`;
}

function fmtSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length !== 9) return ssn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// ─── Page builder helper ──────────────────────────────────────────────────────

class PageBuilder {
  doc: PDFDocument;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  page!: PDFPage;
  y = 750;
  readonly margin = 60;
  readonly lineH = 16;
  readonly pageW = 612;
  readonly pageH = 792;

  constructor(
    doc: PDFDocument,
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
    boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>
  ) {
    this.doc = doc;
    this.font = font;
    this.boldFont = boldFont;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([this.pageW, this.pageH]);
    this.y = 750;
    return this.page;
  }

  checkY(needed = 60) {
    if (this.y < needed) this.newPage();
  }

  text(str: string, x: number, size = 10, bold = false) {
    this.page.drawText(str, {
      x,
      y: this.y,
      size,
      font: bold ? this.boldFont : this.font,
      color: rgb(0, 0, 0),
    });
  }

  line(thickness = 0.5, color = rgb(0.7, 0.7, 0.7)) {
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.pageW - this.margin, y: this.y },
      thickness,
      color,
    });
  }

  rect(x: number, width: number, height: number, fillColor: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x, y: this.y - 2, width, height, color: fillColor });
  }

  row(label: string, value: string, bold = false, indent = 0) {
    this.checkY(20);
    this.text(label, this.margin + indent, 9, bold);
    this.text(value, 420, 9, bold);
    this.y -= this.lineH;
  }

  heading(title: string, sub?: string, bandColor: RGB = rgb(0.15, 0.25, 0.55)) {
    this.checkY(60);
    this.rect(this.margin - 4, this.pageW - this.margin * 2 + 8, 22, bandColor);
    this.page.drawText(title, { x: this.margin, y: this.y + 5, size: 11, font: this.boldFont, color: rgb(1, 1, 1) });
    this.y -= 26;
    if (sub) {
      this.text(sub, this.margin, 9);
      this.y -= 14;
    }
  }

  // Full-width colored section divider used at the top of each Part's first page
  sectionBand(partNum: number, partTitle: string, bandColor: RGB) {
    this.newPage();
    // Top banner
    this.y = this.pageH - 40;
    this.page.drawRectangle({ x: 0, y: this.pageH - 50, width: this.pageW, height: 50, color: bandColor });
    this.page.drawText(`PART ${partNum}`, { x: this.margin, y: this.pageH - 30, size: 8, font: this.font, color: rgb(1, 1, 1) });
    this.page.drawText(partTitle, { x: this.margin, y: this.pageH - 44, size: 15, font: this.boldFont, color: rgb(1, 1, 1) });
    this.y = this.pageH - 70;
  }

  skip(n = 1) {
    this.y -= this.lineH * n;
  }

  bullet(text: string, indent = 14, size = 9) {
    this.checkY(20);
    // Word-wrap at ~90 chars
    const maxChars = 90;
    const words = text.split(" ");
    let line = "";
    let first = true;
    for (const word of words) {
      if ((line + word).length > maxChars) {
        this.text((first ? "• " : "  ") + line.trim(), this.margin + indent, size);
        this.y -= 13;
        this.checkY(20);
        line = word + " ";
        first = false;
      } else {
        line += word + " ";
      }
    }
    if (line.trim()) {
      this.text((first ? "• " : "  ") + line.trim(), this.margin + indent, size);
      this.y -= 13;
    }
  }
}

function fmtSSNMasked(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length !== 9) return "XXX-XX-XXXX";
  return `XXX-XX-${digits.slice(5)}`;
}

// ─── Cover page ──────────────────────────────────────────────────────────────

function buildCoverPage(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult,
  refNum: string
) {
  const isNR = input.residencyStatus === "nonresident";
  const f = result.federal;

  // Title block
  pb.page.drawRectangle({ x: 0, y: pb.pageH - 80, width: pb.pageW, height: 80, color: rgb(0.08, 0.16, 0.42) });
  pb.page.drawText("2025 TAX RETURN FILING PACKAGE", {
    x: pb.margin, y: pb.pageH - 38, size: 18, font: pb.boldFont, color: rgb(1, 1, 1),
  });
  pb.page.drawText("Tax Year January 1 – December 31, 2025  |  Filed in 2026", {
    x: pb.margin, y: pb.pageH - 54, size: 9, font: pb.font, color: rgb(0.75, 0.85, 1),
  });
  pb.page.drawText(`Ref: ${refNum}`, {
    x: pb.pageW - pb.margin - 80, y: pb.pageH - 54, size: 8, font: pb.font, color: rgb(0.75, 0.85, 1),
  });
  pb.y = pb.pageH - 100;
  pb.skip();

  // Taxpayer info box
  pb.line(0.5, rgb(0.8, 0.8, 0.8));
  pb.skip();
  pb.text("TAXPAYER INFORMATION", pb.margin, 9, true);
  pb.skip();
  pb.text(`Name:  ${input.firstName} ${input.lastName}${input.spouseFirstName ? "  &  " + input.spouseFirstName + " " + input.spouseLastName : ""}`, pb.margin + 10, 10);
  pb.skip();
  pb.text(`SSN:   ${fmtSSNMasked(input.ssn)}${input.spouseSsn ? "   Spouse SSN: " + fmtSSNMasked(input.spouseSsn) : ""}`, pb.margin + 10, 10);
  pb.skip();
  pb.text(`Filing Status:  ${input.filingStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`, pb.margin + 10, 10);
  pb.skip();
  pb.text(`Residency:  ${input.residencyStatus === "nonresident" ? "Nonresident Alien — Filing Form 1040-NR" : input.residencyStatus === "part_year_resident" ? "Part-Year Resident" : "U.S. Resident"}`, pb.margin + 10, 10);
  pb.skip();
  pb.text(`Address:  ${input.address}, ${input.city}, ${input.state} ${input.zip}`, pb.margin + 10, 10);
  pb.skip(1.5);

  // Result summary boxes
  pb.line();
  pb.skip();
  pb.text("RESULT SUMMARY", pb.margin, 9, true);
  pb.skip();

  const fedLabel = f.refund > 0 ? `FEDERAL REFUND: ${fmtMoney(f.refund)}` : f.amountDue > 0 ? `FEDERAL AMOUNT DUE: ${fmtMoney(f.amountDue)}` : "FEDERAL: BALANCED";
  const fedColor = f.refund > 0 ? rgb(0.9, 1, 0.92) : f.amountDue > 0 ? rgb(1, 0.92, 0.9) : rgb(0.95, 0.95, 0.95);
  pb.rect(pb.margin - 4, 240, 24, fedColor);
  pb.page.drawText(fedLabel, { x: pb.margin, y: pb.y + 7, size: 11, font: pb.boldFont, color: rgb(0, 0, 0) });
  pb.y -= 30;

  if (result.state) {
    const st = result.state;
    const stLabel = st.refund > 0 ? `${st.state} STATE REFUND: ${fmtMoney(st.refund)}` : st.amountDue > 0 ? `${st.state} STATE AMOUNT DUE: ${fmtMoney(st.amountDue)}` : `${st.state}: BALANCED`;
    const stColor = st.refund > 0 ? rgb(0.9, 1, 0.92) : st.amountDue > 0 ? rgb(1, 0.92, 0.9) : rgb(0.95, 0.95, 0.95);
    pb.rect(pb.margin - 4, 240, 24, stColor);
    pb.page.drawText(stLabel, { x: pb.margin, y: pb.y + 7, size: 11, font: pb.boldFont, color: rgb(0, 0, 0) });
    pb.y -= 30;
  }

  pb.skip();
  pb.text(`Effective Federal Tax Rate: ${(f.effectiveTaxRate * 100).toFixed(2)}%   |   Marginal Rate: ${(f.marginalTaxRate * 100).toFixed(0)}%   |   AGI: ${fmtMoney(f.adjustedGrossIncome)}`, pb.margin + 10, 9);
  pb.skip(2);

  // Package contents
  pb.line();
  pb.skip();
  pb.text("PACKAGE CONTENTS — THIS FILING PACKAGE CONTAINS:", pb.margin, 9, true);
  pb.skip();

  const parts6 = [
    { num: 1, label: "How to File", desc: "Step-by-step filing instructions and mailing addresses" },
    { num: 2, label: "Federal Return", desc: `${isNR ? "Form 1040-NR" : "Form 1040"} line-by-line summary` },
    { num: 3, label: "State Return", desc: result.state ? `${result.state.state} state tax summary` : "No state income tax required" },
    { num: 4, label: "Payment Vouchers", desc: f.amountDue > 0 ? `Form 1040-V — Amount due: ${fmtMoney(f.amountDue)}` : "No payment required" },
    { num: 5, label: "2026 Estimated Tax", desc: "Quarterly estimated payment schedule" },
    { num: 6, label: "Checklist & Records", desc: "Pre-mailing checklist and records retention guide" },
  ];

  for (const p of parts6) {
    pb.text(`Part ${p.num} — ${p.label}`, pb.margin + 10, 9, true);
    pb.y -= 12;
    pb.text(p.desc, pb.margin + 20, 8);
    pb.y -= 14;
  }

  pb.skip();
  pb.line(1, rgb(0.3, 0.3, 0.8));
  pb.skip();

  if (isNR) {
    pb.text("⚠  NONRESIDENT ALIEN: You are filing Form 1040-NR. See Part 1 (How to File) for important differences.", pb.margin, 9, true);
    pb.skip(1.5);
  }

  pb.text("WHAT TO DO NOW:", pb.margin + 10, 9, true);
  pb.skip();
  pb.text("1. Read Part 1 (How to File) — it has everything you need to mail your return.", pb.margin + 10, 9);
  pb.skip();
  pb.text("2. Review Part 2 (Federal) and Part 3 (State) against your W-2s and 1099s.", pb.margin + 10, 9);
  pb.skip();
  pb.text("3. Sign and date your return — an unsigned return is not valid.", pb.margin + 10, 9);
  pb.skip();
  pb.text("4. If you owe, detach Part 4 (Payment Voucher) and mail with your check.", pb.margin + 10, 9);
  pb.skip();
  pb.text("5. Use Part 6 (Checklist) before sealing the envelope.", pb.margin + 10, 9);
}

// ─── Federal return section ───────────────────────────────────────────────────

function buildFederalSection(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult
) {
  const isNR = input.residencyStatus === "nonresident";
  const f = result.federal;

  pb.sectionBand(2, "FEDERAL INCOME TAX RETURN", rgb(0.11, 0.3, 0.69));
  pb.heading(
    `${isNR ? "FORM 1040-NR" : "FORM 1040"} — LINE SUMMARY`,
    `${input.firstName} ${input.lastName}  |  SSN: ${fmtSSNMasked(input.ssn)}  |  Tax Year 2025`
  );

  // Income
  pb.text("INCOME", pb.margin, 9, true);
  pb.y -= 14;
  const incomeRows: [string, number][] = [
    ["1a. Wages, salaries, tips (W-2 Box 1)", f.totalWages],
    ["2b. Taxable interest (Schedule B)", f.totalInterest],
    ["3b. Ordinary dividends (Schedule B)", f.totalDividends],
    ["3c.   Qualified dividends (included in 3b)", f.qualifiedDividends],
    ["4b. IRA distributions — taxable amount", f.iRADistributions],
    ["5b. Pensions and annuities — taxable amount", f.pensionAnnuities],
    ["6b. Social Security benefits — taxable amount", f.socialSecurityTaxable],
    ["7.  Capital gain or (loss) (Schedule D / Form 8949)", f.totalCapitalGains],
    ["8.  Additional income (Schedule 1):", 0],
    ["    Sch. C  Business income or (loss)", f.scheduleCNetProfit],
    ["    Sch. E  Rental real estate, royalties", f.scheduleENetIncome],
    ["    Other income (NEC, unemployment, foreign)", f.otherIncome],
  ];
  for (const [label, value] of incomeRows) {
    if (value !== 0) pb.row(label, fmtMoney(value), false, 10);
    else if (label.startsWith("8.")) pb.row(label, "", false, 10);
  }
  pb.row("9.  Total income", fmtMoney(f.totalIncome), true, 10);

  // ── Schedule 1 — Adjustments to Income ─────────────────────────────────────
  pb.skip();
  pb.checkY(80);
  pb.text("SCHEDULE 1 — ADJUSTMENTS TO INCOME (above-the-line)", pb.margin, 9, true);
  pb.y -= 14;
  if (f.selfEmploymentTax > 0) {
    pb.row("15. Deductible part of self-employment tax (50%)", fmtMoney(-(f.selfEmploymentTax * 0.5)), false, 10);
  }
  if ((input.selfEmployedHealthInsurance ?? 0) > 0) {
    pb.row("17. Self-employed health insurance deduction", fmtMoney(-Math.min(input.selfEmployedHealthInsurance!, f.scheduleCNetProfit)), false, 10);
  }
  const sepTotal = (input.retirementContributions.sep_ira) + (input.retirementContributions.simple_ira) + (input.retirementContributions.solo401k_traditional);
  if (sepTotal > 0) {
    pb.row("16. SEP, SIMPLE, and qualified plans deduction", fmtMoney(-sepTotal), false, 10);
  }
  if ((input.studentLoanInterest?.interestPaid ?? 0) > 0) {
    pb.row("21. Student loan interest deduction (max $2,500)", fmtMoney(-Math.min(input.studentLoanInterest!.interestPaid, 2_500)), false, 10);
  }
  if (input.retirementContributions.hsa > 0) {
    pb.row("13. HSA deduction (Form 8889)", fmtMoney(-Math.min(input.retirementContributions.hsa, 8_550)), false, 10);
  }
  if ((input.educatorExpenses ?? 0) > 0) {
    pb.row("11. Educator expenses (max $300)", fmtMoney(-Math.min(input.educatorExpenses!, 300)), false, 10);
  }
  if ((input.alimonyPaid ?? 0) > 0) {
    pb.row("19a. Alimony paid (pre-2019 divorce only)", fmtMoney(-(input.alimonyPaid!)), false, 10);
  }
  if ((input.earlyWithdrawalPenalties ?? 0) > 0) {
    pb.row("18. Penalty on early withdrawal of savings", fmtMoney(-(input.earlyWithdrawalPenalties!)), false, 10);
  }
  if (f.totalAdjustments > 0) {
    pb.row("26. Total adjustments → Form 1040 Line 10", fmtMoney(-f.totalAdjustments), true, 10);
  }
  pb.row("11. Adjusted Gross Income (AGI) — Form 1040 Line 11", fmtMoney(f.adjustedGrossIncome), true, 10);

  // ── Deductions (Standard or Schedule A) ────────────────────────────────────
  pb.skip();
  pb.checkY(80);
  pb.text(f.isItemized ? "SCHEDULE A — ITEMIZED DEDUCTIONS" : "STANDARD DEDUCTION", pb.margin, 9, true);
  pb.y -= 14;
  if (f.isItemized) {
    const saltCap = input.filingStatus === "married_filing_separately" ? 5_000 : 10_000;
    const saltUsed = Math.min((input.stateLocalTaxes ?? 0) + (input.homeOwnership?.propertyTaxes ?? 0), saltCap);
    if (saltUsed > 0) pb.row("5e. State & local taxes (SALT, capped at $10,000)", fmtMoney(-saltUsed), false, 10);
    if ((input.homeOwnership?.mortgageInterest ?? 0) > 0)
      pb.row("8a. Home mortgage interest (Form 1098)", fmtMoney(-((input.homeOwnership?.mortgageInterest ?? 0) + (input.homeOwnership?.pointsPaid ?? 0))), false, 10);
    const charTotal = (input.charitableContributions?.cashContributions ?? 0) + (input.charitableContributions?.nonCashContributions ?? 0) + (input.charitableContributions?.carryoverFromPrior ?? 0);
    if (charTotal > 0) pb.row("11. Gifts to charity", fmtMoney(-charTotal), false, 10);
    const agi = f.adjustedGrossIncome;
    const medDeduct = Math.max(0, (input.medicalExpenses?.totalMedicalExpenses ?? 0) - agi * 0.075);
    if (medDeduct > 0) pb.row("4.  Medical & dental expenses (above 7.5% AGI)", fmtMoney(-medDeduct), false, 10);
    if ((input.casualtyLosses ?? 0) > 0) pb.row("15. Casualty and theft losses (disaster only)", fmtMoney(-(input.casualtyLosses!)), false, 10);
    pb.row("17. Total itemized deductions → Form 1040 Line 12", fmtMoney(-f.standardOrItemizedDeduction), true, 10);
  } else {
    pb.row("12. Standard deduction", fmtMoney(-f.standardOrItemizedDeduction), false, 10);
  }
  if (f.qualifiedBusinessIncomeDeduction > 0) {
    pb.row("13. QBI deduction — Sec. 199A (Form 8995)", fmtMoney(-f.qualifiedBusinessIncomeDeduction), false, 10);
  }
  pb.row("15. Taxable income", fmtMoney(f.taxableIncome), true, 10);

  pb.skip();
  pb.text("TAX AND OTHER TAXES", pb.margin, 9, true);
  pb.y -= 14;
  pb.row("16. Income tax (from tax tables / Rate Schedule)", fmtMoney(f.regularTax), false, 10);
  if (f.alternativeMinimumTax > 0) pb.row("17. Alternative Minimum Tax (Form 6251)", fmtMoney(f.alternativeMinimumTax), false, 10);
  if (f.netInvestmentIncomeTax > 0) pb.row("    Net Investment Income Tax 3.8% (Form 8960)", fmtMoney(f.netInvestmentIncomeTax), false, 10);
  if (f.selfEmploymentTax > 0) pb.row("    Self-employment tax (Schedule SE)", fmtMoney(f.selfEmploymentTax), false, 10);
  if (f.additionalMedicareTax > 0) pb.row("    Additional Medicare Tax 0.9% (Form 8959)", fmtMoney(f.additionalMedicareTax), false, 10);
  pb.row("24. Total tax before credits", fmtMoney(f.regularTax + f.alternativeMinimumTax + f.netInvestmentIncomeTax + f.selfEmploymentTax + f.additionalMedicareTax), true, 10);

  pb.skip();
  pb.text("CREDITS", pb.margin, 9, true);
  pb.y -= 14;
  if (f.childTaxCredit > 0) pb.row("    Child Tax Credit / Additional Child Tax Credit", fmtMoney(-f.childTaxCredit), false, 10);
  if (f.earnedIncomeCredit > 0) pb.row("27. Earned Income Credit (Schedule EIC)", fmtMoney(-f.earnedIncomeCredit), false, 10);
  if (f.childCareCredit > 0) pb.row("    Child and Dependent Care Credit (Form 2441)", fmtMoney(-f.childCareCredit), false, 10);
  if (f.educationCredits > 0) pb.row("    Education Credits (Form 8863)", fmtMoney(-f.educationCredits), false, 10);
  if (f.foreignTaxCredit > 0) pb.row("    Foreign Tax Credit (Form 1116)", fmtMoney(-f.foreignTaxCredit), false, 10);
  if (f.retirementSaverCredit > 0) pb.row("    Retirement Saver's Credit (Form 8880)", fmtMoney(-f.retirementSaverCredit), false, 10);
  pb.row("24. Total tax after credits", fmtMoney(f.totalTax), true, 10);

  pb.skip();
  pb.text("PAYMENTS", pb.margin, 9, true);
  pb.y -= 14;
  if (f.totalWithheld > 0) pb.row("25. Federal income tax withheld (W-2 Box 2 + 1099s)", fmtMoney(f.totalWithheld), false, 10);
  if (f.estimatedTaxPaid > 0) pb.row("26. Estimated tax payments (Form 1040-ES)", fmtMoney(f.estimatedTaxPaid), false, 10);
  if (f.earnedIncomeCredit > 0) pb.row("27. Earned Income Credit (refundable)", fmtMoney(f.earnedIncomeCredit), false, 10);
  if (f.refundableCredits > f.earnedIncomeCredit) pb.row("    Other refundable credits", fmtMoney(f.refundableCredits - f.earnedIncomeCredit), false, 10);
  pb.row("33. Total payments", fmtMoney(f.totalPayments), true, 10);

  pb.skip();
  pb.line(1, rgb(0.2, 0.2, 0.7));
  pb.skip();
  const fedColor = f.refund > 0 ? rgb(0.88, 1, 0.88) : f.amountDue > 0 ? rgb(1, 0.88, 0.88) : rgb(0.95, 0.95, 0.95);
  pb.rect(pb.margin - 4, 440, 26, fedColor);
  if (f.refund > 0) {
    pb.page.drawText(`LINE 35: REFUND   ${fmtMoney(f.refund)}`, { x: pb.margin, y: pb.y + 8, size: 13, font: pb.boldFont, color: rgb(0, 0.4, 0) });
  } else if (f.amountDue > 0) {
    pb.page.drawText(`LINE 37: AMOUNT DUE   ${fmtMoney(f.amountDue)}   (due April 15, 2026)`, { x: pb.margin, y: pb.y + 8, size: 13, font: pb.boldFont, color: rgb(0.6, 0, 0) });
  } else {
    pb.page.drawText("BALANCED — No refund / No amount due", { x: pb.margin, y: pb.y + 8, size: 12, font: pb.boldFont, color: rgb(0, 0, 0) });
  }
  pb.y -= 36;

  if (f.underpaymentPenalty && f.underpaymentPenalty > 0) {
    pb.skip();
    pb.text(`⚠ Estimated underpayment penalty (Form 2210): ~${fmtMoney(f.underpaymentPenalty)}`, pb.margin, 9);
    pb.skip();
  }
}

// ─── State return section ─────────────────────────────────────────────────────

function buildStateSection(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult
) {
  if (!result.state) return;
  const st = result.state;

  const stateName = st.state === "CA" ? "CALIFORNIA — FORM 540" : st.state === "PA" ? "PENNSYLVANIA — FORM PA-40" : "WASHINGTON STATE";
  pb.sectionBand(3, "STATE INCOME TAX RETURN", rgb(0.08, 0.47, 0.22));
  pb.heading(
    stateName,
    `${input.firstName} ${input.lastName}  |  SSN: ${fmtSSNMasked(input.ssn)}  |  Tax Year 2025`,
    rgb(0.08, 0.47, 0.22)
  );

  if (st.state === "WA" && st.stateTax === 0 && st.stateCredits === 0) {
    pb.text("Washington State has NO personal income tax.", pb.margin, 11, true);
    pb.skip();
    pb.text("No state income tax return is required unless:", pb.margin, 9);
    pb.skip();
    pb.bullet("Your long-term capital gains exceeded $270,000 in 2025 (WA Capital Gains Tax — 7% on excess). File at dor.wa.gov.");
    pb.bullet("You have Washington State business income subject to Business & Occupation (B&O) tax.");
    pb.skip();
    if (st.stateTax > 0) {
      pb.text(`WA Capital Gains Tax Due: ${fmtMoney(st.stateTax)}`, pb.margin, 11, true);
      pb.skip();
      pb.text("File WA Capital Gains Tax return at dor.wa.gov by April 15, 2026.", pb.margin, 9);
      pb.skip();
    }
    if (st.stateCredits > 0) {
      pb.row("WA Working Families Tax Credit", fmtMoney(st.stateCredits), true, 10);
      pb.text("Apply at workingfamiliescredit.wa.gov", pb.margin + 10, 9);
      pb.skip();
    }
    return;
  }

  // CA / PA detail
  if (st.state === "CA") {
    pb.text("KEY CA DIFFERENCES FROM FEDERAL:", pb.margin, 9, true);
    pb.y -= 14;
    pb.bullet("CA standard deduction: $5,202 (single) / $10,404 (MFJ) — much lower than federal");
    pb.bullet("CA does NOT tax Social Security income");
    pb.bullet("CA does NOT allow HSA deductions (federal HSA deduction added back)");
    pb.bullet("CA has NO SALT cap — full state/local taxes deductible on CA return");
    pb.bullet("CA does NOT allow federal bonus depreciation — different CA depreciation rules apply");
    pb.skip();
  }

  if (st.state === "PA") {
    pb.text("KEY PA DIFFERENCES FROM FEDERAL:", pb.margin, 9, true);
    pb.y -= 14;
    pb.bullet("PA flat rate: 3.07% — no standard or itemized deductions");
    pb.bullet("PA does NOT tax Social Security income or most retirement distributions (401k/IRA after retirement age)");
    pb.bullet("PA capital losses do NOT offset ordinary income");
    pb.bullet("PA treats all capital gains at the same flat rate — no preferential long-term rate");
    pb.skip();
  }

  pb.text("STATE TAX CALCULATION", pb.margin, 9, true);
  pb.y -= 14;
  pb.row(`${st.state} Taxable Income`, fmtMoney(st.taxableIncome), true, 10);
  pb.row(`${st.state} Income Tax`, fmtMoney(st.stateTax), false, 10);
  if (st.stateCredits > 0) pb.row(`${st.state} Credits`, fmtMoney(-st.stateCredits), false, 10);
  if (st.stateWithheld > 0) pb.row(`${st.state} Tax Withheld`, fmtMoney(-st.stateWithheld), false, 10);

  pb.skip();
  pb.line(1, rgb(0.2, 0.2, 0.7));
  pb.skip();
  const stColor = st.refund > 0 ? rgb(0.88, 1, 0.88) : st.amountDue > 0 ? rgb(1, 0.88, 0.88) : rgb(0.95, 0.95, 0.95);
  pb.rect(pb.margin - 4, 380, 26, stColor);
  if (st.refund > 0) {
    pb.page.drawText(`${st.state} REFUND   ${fmtMoney(st.refund)}`, { x: pb.margin, y: pb.y + 8, size: 13, font: pb.boldFont, color: rgb(0, 0.4, 0) });
  } else if (st.amountDue > 0) {
    pb.page.drawText(`${st.state} AMOUNT DUE   ${fmtMoney(st.amountDue)}   (due April 15, 2026)`, { x: pb.margin, y: pb.y + 8, size: 13, font: pb.boldFont, color: rgb(0.6, 0, 0) });
  } else {
    pb.page.drawText(`${st.state}: BALANCED — No refund / No amount due`, { x: pb.margin, y: pb.y + 8, size: 12, font: pb.boldFont, color: rgb(0, 0, 0) });
  }
  pb.y -= 36;

  pb.skip();
  pb.text(`Effective ${st.state} tax rate: ${(st.effectiveTaxRate * 100).toFixed(2)}%`, pb.margin + 10, 9);
}

// ─── Part 1: How to File ─────────────────────────────────────────────────────

function buildInstructionsSection(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult
) {
  const isNR = input.residencyStatus === "nonresident";
  const f = result.federal;
  const state = input.stateOfResidence ?? input.stateTaxInfo?.state;

  pb.sectionBand(1, "HOW TO FILE YOUR 2025 TAX RETURN", rgb(0.28, 0.33, 0.4));
  pb.heading("STEP-BY-STEP FILING INSTRUCTIONS", undefined, rgb(0.28, 0.33, 0.4));

  pb.text("STEP 1 — REVIEW YOUR RETURN", pb.margin, 10, true);
  pb.y -= 14;
  pb.bullet("Compare every number in this document to your source documents: W-2(s), 1099s, mortgage statements.");
  pb.bullet("If you spot a discrepancy, correct it in the software and regenerate this PDF before filing.");
  pb.bullet("Verify your name, SSN, address, and filing status on the first page of Form 1040.");
  pb.skip();

  pb.text("STEP 2 — SIGN YOUR RETURN", pb.margin, 10, true);
  pb.y -= 14;
  pb.bullet("Sign and date your return in blue or black ink. An unsigned return is not valid.");
  if (!isNR) pb.bullet("If filing jointly (MFJ), BOTH spouses must sign.");
  pb.bullet("If you are using a paid preparer, they must also sign and include their PTIN.");
  pb.skip();

  pb.text("STEP 3 — CHOOSE YOUR FILING METHOD", pb.margin, 10, true);
  pb.y -= 14;

  pb.text("  Option A: E-FILE (Recommended — Fastest & Most Accurate)", pb.margin + 10, 9, true);
  pb.y -= 13;
  if (!isNR) {
    pb.bullet("IRS Free File (irs.gov/freefile): Free for AGI ≤ $84,000.", 20);
    pb.bullet("Commercial software: TurboTax, H&R Block, FreeTaxUSA — import your data from this summary.", 20);
    pb.bullet("E-filing provides instant confirmation, faster refunds (21 days vs. up to 8 weeks by mail).", 20);
  } else {
    pb.bullet("Form 1040-NR has limited e-file options. Use Sprintax, TaxAct, or OLT for 1040-NR e-filing.", 20);
    pb.bullet("Alternatively, mail the paper return to the address shown below.", 20);
  }
  pb.skip(0.5);

  pb.text("  Option B: MAIL (Paper Return)", pb.margin + 10, 9, true);
  pb.y -= 13;
  pb.bullet("Print all pages of this package single-sided on white paper.", 20);
  pb.bullet(`FEDERAL ASSEMBLY ORDER — Attach in this exact sequence: ${sortFormsByAttachmentOrder(result.formsRequired.filter((f) => !f.startsWith("CA ") && !f.startsWith("PA "))).join(", ")}.`, 20);
  pb.bullet("Place your W-2(s) and 1099s showing withholding on top of the schedules.", 20);
  pb.bullet("Do NOT staple your check to the return. Do NOT use paper clips on the check.", 20);
  pb.skip(0.5);

  // Federal mailing address
  const irsAddr = isNR
    ? (f.amountDue > 0 ? "Internal Revenue Service, P.O. Box 1303, Charlotte, NC 28201-1303 USA" : "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215")
    : state === "CA"
    ? (f.amountDue > 0 ? "Internal Revenue Service, P.O. Box 802501, Cincinnati, OH 45280-2501" : "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002")
    : state === "WA"
    ? (f.amountDue > 0 ? "Internal Revenue Service, P.O. Box 932100, Louisville, KY 40293-2100" : "Department of the Treasury, Internal Revenue Service, Ogden, UT 84201-0002")
    : (f.amountDue > 0 ? "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000" : "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002");

  pb.text(`  FEDERAL MAILING ADDRESS:`, pb.margin + 10, 9, true);
  pb.y -= 13;
  pb.text(`  ${irsAddr}`, pb.margin + 20, 9);
  pb.y -= 13;
  pb.skip(0.5);

  pb.text("STEP 4 — PAY WHAT YOU OWE (if applicable)", pb.margin, 10, true);
  pb.y -= 14;
  if (f.amountDue > 0) {
    pb.bullet(`Federal amount due: ${fmtMoney(f.amountDue)}. Due by April 15, 2026.`);
    pb.bullet(`Make check or money order payable to "United States Treasury." Write your SSN and "2025 Form ${isNR ? "1040-NR" : "1040"}" on the memo line.`);
    pb.bullet("Pay online at irs.gov/payments (IRS Direct Pay — free, no account needed). Or enroll in EFTPS for future payments.");
    pb.bullet("If you cannot pay in full, consider an installment agreement at irs.gov/payments/online-payment-agreement.");
  } else if (f.refund > 0) {
    pb.bullet(`Federal refund: ${fmtMoney(f.refund)}.`);
    if (input.directDepositRouting) {
      pb.bullet(`Direct deposit to account ending in ${(input.directDepositAccount ?? "").slice(-4)} — typically within 21 days of e-filing.`);
    } else {
      pb.bullet("Refund will be mailed as a check (allow 6–8 weeks for paper returns, 3 weeks for e-file).");
    }
  } else {
    pb.bullet("No federal payment required — your withholding and payments balanced your tax liability.");
  }
  pb.skip();

  // State payment
  if (result.state && (result.state.amountDue > 0 || result.state.refund > 0)) {
    const st = result.state;
    pb.text(`STEP 5 — STATE OF ${st.state === "CA" ? "CALIFORNIA" : st.state === "PA" ? "PENNSYLVANIA" : "WASHINGTON"} FILING`, pb.margin, 10, true);
    pb.y -= 14;
    if (st.state === "CA") {
      pb.bullet(`FILE SEPARATELY to: ${st.amountDue > 0 ? "FRANCHISE TAX BOARD, PO BOX 942867, SACRAMENTO CA 94267-0001" : "FRANCHISE TAX BOARD, PO BOX 942840, SACRAMENTO CA 94240-0001"}`);
      if (st.amountDue > 0) pb.bullet(`CA amount due: ${fmtMoney(st.amountDue)}. Make check payable to "Franchise Tax Board." Write SSN and "2025 Form 540" on check. Pay online at ftb.ca.gov.`);
      else if (st.refund > 0) pb.bullet(`CA refund: ${fmtMoney(st.refund)}. Allow 3 weeks for e-file or 3 months for mail.`);
    } else if (st.state === "PA") {
      pb.bullet(`FILE SEPARATELY to: ${st.amountDue > 0 ? "PA DEPARTMENT OF REVENUE, 2 REVENUE PLACE, HARRISBURG PA 17129-0002" : "PA DEPARTMENT OF REVENUE, 2 REVENUE PLACE, HARRISBURG PA 17129-0001"}`);
      if (st.amountDue > 0) pb.bullet(`PA amount due: ${fmtMoney(st.amountDue)}. Make check payable to "PA Department of Revenue." Pay online at mypath.pa.gov.`);
      else if (st.refund > 0) pb.bullet(`PA refund: ${fmtMoney(st.refund)}.`);
      pb.bullet("Also file local EIT return with your municipality. Find your local tax collector at dced.pa.gov.");
    } else if (st.state === "WA" && st.stateTax > 0) {
      pb.bullet(`WA Capital Gains Tax due: ${fmtMoney(st.amountDue)}. File at dor.wa.gov by April 15, 2026.`);
    }
    pb.skip();
  }

  pb.text("STEP 6 — DEADLINES AND EXTENSIONS", pb.margin, 10, true);
  pb.y -= 14;
  pb.bullet("April 15, 2026 — Federal return due. State returns due (CA, PA).");
  pb.bullet("April 15, 2026 — Payment due (even if you file an extension).");
  pb.bullet("October 15, 2026 — Extended filing deadline (file Form 4868 by April 15 to get this extension).");
  pb.bullet("NOTE: An extension gives more time to FILE, not more time to PAY. Interest (currently ~8%) accrues on unpaid tax from April 15.");
  pb.skip();

  pb.text("STEP 7 — KEEP YOUR RECORDS", pb.margin, 10, true);
  pb.y -= 14;
  pb.bullet("Keep a complete copy of this return and all W-2s, 1099s, and receipts for at least 3 years.");
  pb.bullet("Keep records for 7 years if you reported a loss or did not report income you should have.");
  pb.bullet("Employment tax records: keep at least 4 years.");

  // Warnings
  if (result.warnings.length > 0) {
    pb.skip();
    pb.line();
    pb.skip();
    pb.text("NOTICES & WARNINGS", pb.margin, 10, true);
    pb.y -= 14;
    for (const warning of result.warnings) {
      pb.bullet(`⚠  ${warning}`);
    }
  }

}

// ─── Part 4: Payment Vouchers ─────────────────────────────────────────────────

function buildPaymentVouchers(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult
) {
  const f = result.federal;
  const st = result.state;
  const isNR = input.residencyStatus === "nonresident";

  pb.sectionBand(4, "PAYMENT VOUCHERS", rgb(0.72, 0.25, 0.05));

  pb.heading("FORM 1040-V — FEDERAL PAYMENT VOUCHER", undefined, rgb(0.72, 0.25, 0.05));

  if (f.amountDue <= 0) {
    pb.text("No federal payment is due — your withholding and payments covered your tax liability.", pb.margin, 10);
    pb.skip();
    if (f.refund > 0) {
      pb.text(`Federal refund: ${fmtMoney(f.refund)}`, pb.margin + 10, 11, true);
      pb.skip();
      pb.text("Your refund will be issued by the IRS after your return is processed.", pb.margin + 10, 9);
    }
  } else {
    // Form 1040-V lookalike box
    pb.skip();
    pb.page.drawRectangle({ x: pb.margin - 4, y: pb.y - 100, width: pb.pageW - pb.margin * 2 + 8, height: 114, borderColor: rgb(0, 0, 0), borderWidth: 1.5, color: rgb(0.98, 0.98, 0.98) });
    pb.page.drawText("Form 1040-V  Payment Voucher  (2025)", { x: pb.margin + 8, y: pb.y - 12, size: 11, font: pb.boldFont, color: rgb(0, 0, 0) });
    pb.page.drawLine({ start: { x: pb.margin - 4, y: pb.y - 22 }, end: { x: pb.pageW - pb.margin + 4, y: pb.y - 22 }, thickness: 0.5, color: rgb(0, 0, 0) });

    pb.page.drawText("Your name and SSN:", { x: pb.margin + 8, y: pb.y - 38, size: 8, font: pb.font, color: rgb(0.4, 0.4, 0.4) });
    pb.page.drawText(`${input.firstName} ${input.lastName}  |  SSN: ${fmtSSNMasked(input.ssn)}`, { x: pb.margin + 8, y: pb.y - 50, size: 10, font: pb.font, color: rgb(0, 0, 0) });

    pb.page.drawText("Address:", { x: pb.margin + 8, y: pb.y - 68, size: 8, font: pb.font, color: rgb(0.4, 0.4, 0.4) });
    pb.page.drawText(`${input.address}, ${input.city}, ${input.state} ${input.zip}`, { x: pb.margin + 8, y: pb.y - 80, size: 10, font: pb.font, color: rgb(0, 0, 0) });

    pb.page.drawText("Amount paid (dollars and cents):", { x: 370, y: pb.y - 38, size: 8, font: pb.font, color: rgb(0.4, 0.4, 0.4) });
    pb.page.drawText(fmtMoney(f.amountDue), { x: 370, y: pb.y - 52, size: 14, font: pb.boldFont, color: rgb(0.6, 0, 0) });

    pb.y -= 110;
    pb.skip();

    pb.text("HOW TO PAY:", pb.margin, 9, true);
    pb.y -= 14;
    pb.bullet(`Make check or money order payable to "United States Treasury."`);
    pb.bullet(`Write your SSN and "2025 Form ${isNR ? "1040-NR" : "1040"}" on the memo line of your check.`);
    pb.bullet("Detach this voucher and mail it WITH your check to the federal mailing address shown in Part 1.");
    pb.bullet("Do NOT staple your check to the return.");
    pb.skip();
    pb.bullet("To pay online (free, no account needed): irs.gov/payments → IRS Direct Pay → use 1040 / 2025 / Balance Due.");
    pb.bullet("To pay by card: irs.gov/payments → Pay by debit/credit card (fees apply).");
  }

  // State payment if applicable
  if (st && st.amountDue > 0) {
    pb.skip(2);
    const stateLabel = st.state === "CA" ? "FRANCHISE TAX BOARD — CA PAYMENT" : "PA DEPARTMENT OF REVENUE — PA PAYMENT";
    pb.heading(stateLabel, undefined, rgb(0.72, 0.25, 0.05));
    pb.skip();
    pb.text(`${st.state} amount due: ${fmtMoney(st.amountDue)}  (due April 15, 2026)`, pb.margin + 10, 11, true);
    pb.skip();
    if (st.state === "CA") {
      pb.bullet(`Make check payable to "Franchise Tax Board." Write your SSN and "2025 Form 540" on the memo line.`);
      pb.bullet("Mail to: FRANCHISE TAX BOARD, PO BOX 942867, SACRAMENTO CA 94267-0001");
      pb.bullet("Pay online at ftb.ca.gov → Web Pay.");
    } else if (st.state === "PA") {
      pb.bullet(`Make check payable to "PA Department of Revenue." Write your SSN and "2025 PA-40" on the memo line.`);
      pb.bullet("Mail to: PA DEPARTMENT OF REVENUE, 2 REVENUE PLACE, HARRISBURG PA 17129-0002");
      pb.bullet("Pay online at mypath.pa.gov.");
    }
  }
}

// ─── Part 5: 2026 Estimated Tax ───────────────────────────────────────────────

function buildEstimatedTax(
  pb: PageBuilder,
  _input: TaxReturnInput,
  result: TaxCalculationResult
) {
  const f = result.federal;
  const needsEst = f.amountDue > 1000 || f.selfEmploymentTax > 0 || f.scheduleCNetProfit > 0 || f.scheduleENetIncome > 0;

  pb.sectionBand(5, "2026 ESTIMATED TAX", rgb(0.38, 0.18, 0.62));
  pb.heading("QUARTERLY ESTIMATED TAX — FORM 1040-ES", undefined, rgb(0.38, 0.18, 0.62));

  if (!needsEst) {
    pb.text("Based on your 2025 return, estimated quarterly payments are likely not required for 2026.", pb.margin, 10);
    pb.skip();
    pb.bullet("You are not required to make estimated payments if you expect to owe less than $1,000 in tax for 2026 after subtracting withholding.");
    pb.bullet("If you are a salaried employee with full withholding, no action is needed.");
    pb.skip();
    pb.text("When estimated payments ARE required:", pb.margin, 9, true);
    pb.y -= 14;
    pb.bullet("You have self-employment income, rental income, or investment income without withholding.");
    pb.bullet("You expect to owe $1,000 or more in federal tax for the year.");
    return;
  }

  pb.text("Your 2025 return indicates you may need to make quarterly estimated payments for 2026.", pb.margin, 10);
  pb.skip();

  // Safe harbor: pay 100% of prior-year tax (110% if AGI > $150k)
  const priorYearTax = f.totalTax;
  const safeHarborPct = f.adjustedGrossIncome > 150000 ? 1.1 : 1.0;
  const annualEst = Math.ceil(priorYearTax * safeHarborPct);
  const quarterlyEst = Math.ceil(annualEst / 4);

  pb.text("SAFE HARBOR ESTIMATE (based on your 2025 tax):", pb.margin, 9, true);
  pb.y -= 14;
  pb.text(`2025 Total Tax: ${fmtMoney(priorYearTax)}  ×  ${(safeHarborPct * 100).toFixed(0)}% safe harbor = ${fmtMoney(annualEst)} / year`, pb.margin + 10, 9);
  pb.y -= 14;
  pb.text(`Quarterly payment: ${fmtMoney(quarterlyEst)} per quarter`, pb.margin + 10, 11, true);
  pb.y -= 18;

  pb.skip();
  pb.text("2026 PAYMENT SCHEDULE:", pb.margin, 9, true);
  pb.y -= 14;

  const schedule = [
    { quarter: "Q1 2026", period: "Jan 1 – Mar 31", due: "April 15, 2026" },
    { quarter: "Q2 2026", period: "Apr 1 – May 31", due: "June 16, 2026" },
    { quarter: "Q3 2026", period: "Jun 1 – Aug 31", due: "September 15, 2026" },
    { quarter: "Q4 2026", period: "Sep 1 – Dec 31", due: "January 15, 2027" },
  ];

  for (const q of schedule) {
    pb.checkY(24);
    pb.page.drawRectangle({ x: pb.margin - 4, y: pb.y - 18, width: pb.pageW - pb.margin * 2 + 8, height: 22, color: rgb(0.95, 0.93, 1) });
    pb.page.drawText(`${q.quarter}  (${q.period})`, { x: pb.margin + 4, y: pb.y - 6, size: 9, font: pb.font, color: rgb(0.2, 0.1, 0.4) });
    pb.page.drawText(`Due: ${q.due}`, { x: 340, y: pb.y - 6, size: 9, font: pb.font, color: rgb(0.2, 0.1, 0.4) });
    pb.page.drawText(fmtMoney(quarterlyEst), { x: 480, y: pb.y - 6, size: 9, font: pb.boldFont, color: rgb(0.38, 0.18, 0.62) });
    pb.y -= 26;
  }

  pb.skip();
  pb.bullet("Pay at irs.gov/payments → IRS Direct Pay → use 1040-ES / 2026 / Estimated Tax.");
  pb.bullet("Or mail Form 1040-ES with a check to the appropriate IRS address (see irs.gov/forms for 2026 Form 1040-ES).");
  pb.bullet("The safe harbor amount protects you from underpayment penalties. If your income is higher in 2026, pay the actual projected tax.");
  pb.skip();
  if (f.adjustedGrossIncome > 150000) {
    pb.text("⚠  Your 2025 AGI exceeded $150,000 — the 110% safe harbor applies.", pb.margin, 9, true);
    pb.skip();
  }
}

// ─── Part 6: Checklist & Records ─────────────────────────────────────────────

function buildChecklist(
  pb: PageBuilder,
  input: TaxReturnInput,
  result: TaxCalculationResult
) {
  pb.sectionBand(6, "CHECKLIST & RECORDS", rgb(0.28, 0.33, 0.4));
  pb.heading("PRE-MAILING CHECKLIST", undefined, rgb(0.28, 0.33, 0.4));

  const checks = [
    "I have reviewed every number in Part 2 (Federal) and Part 3 (State) against my W-2s, 1099s, and bank statements.",
    "I have signed and dated the return in blue or black ink.",
    ...(input.filingStatus === "married_filing_jointly" ? ["My spouse has also signed and dated the return (both signatures required for MFJ)."] : []),
    "I have included all required schedules and forms in the correct attachment order (see Part 1).",
    "My W-2(s) and 1099s with withholding are attached on top of the schedules.",
    ...(result.federal.amountDue > 0 ? [`I have enclosed my check or money order for ${fmtMoney(result.federal.amountDue)} payable to "United States Treasury" with the Form 1040-V payment voucher (Part 4).`] : []),
    ...(result.state?.amountDue && result.state.amountDue > 0 ? [`I have enclosed a separate check for the ${result.state.state} amount due (${fmtMoney(result.state.amountDue)}) in a SEPARATE envelope to the state address in Part 1.`] : []),
    "Federal and state returns are in SEPARATE envelopes addressed to their respective addresses.",
    "I have kept a complete copy of this entire package for my records.",
    "I have noted the USPS tracking number (Certified Mail recommended) for my records.",
  ];

  for (const item of checks) {
    pb.checkY(26);
    pb.page.drawRectangle({ x: pb.margin - 4, y: pb.y - 16, width: 14, height: 14, borderColor: rgb(0, 0, 0), borderWidth: 1, color: rgb(1, 1, 1) });
    // Word-wrap the check item
    const maxChars = 85;
    const words = item.split(" ");
    let line = "";
    let first = true;
    for (const word of words) {
      if ((line + word).length > maxChars) {
        pb.page.drawText(line.trim(), { x: pb.margin + 16, y: pb.y - (first ? 6 : 0) - (first ? 0 : 12), size: 9, font: pb.font, color: rgb(0, 0, 0) });
        if (first) pb.y -= 18;
        else pb.y -= 13;
        pb.checkY(20);
        line = word + " ";
        first = false;
      } else {
        line += word + " ";
      }
    }
    if (line.trim()) {
      pb.page.drawText(line.trim(), { x: pb.margin + 16, y: pb.y - (first ? 6 : 0), size: 9, font: pb.font, color: rgb(0, 0, 0) });
      pb.y -= first ? 22 : 16;
    }
  }

  // Records retention
  pb.skip(2);
  pb.heading("RECORDS RETENTION GUIDE", undefined, rgb(0.28, 0.33, 0.4));

  const records: [string, string][] = [
    ["Federal and state tax returns", "Keep indefinitely (at minimum 7 years)"],
    ["W-2s and 1099s", "7 years (match to your return)"],
    ["Bank and brokerage statements", "7 years"],
    ["Receipts for deductions claimed", "7 years from filing date"],
    ["Property purchase records", "Until property is sold + 7 years"],
    ["IRA contribution records", "Until all funds are withdrawn + 7 years"],
    ["Business records (if Schedule C)", "7 years from filing date"],
    ["Employment tax records", "At least 4 years after tax due or paid"],
  ];

  pb.skip();
  // Header row
  pb.page.drawRectangle({ x: pb.margin - 4, y: pb.y - 16, width: pb.pageW - pb.margin * 2 + 8, height: 18, color: rgb(0.9, 0.9, 0.9) });
  pb.page.drawText("Document", { x: pb.margin + 4, y: pb.y - 10, size: 8, font: pb.boldFont, color: rgb(0, 0, 0) });
  pb.page.drawText("Retention Period", { x: 380, y: pb.y - 10, size: 8, font: pb.boldFont, color: rgb(0, 0, 0) });
  pb.y -= 22;

  for (const [doc, period] of records) {
    pb.checkY(20);
    pb.page.drawText(doc, { x: pb.margin + 4, y: pb.y - 6, size: 8, font: pb.font, color: rgb(0, 0, 0) });
    pb.page.drawText(period, { x: 380, y: pb.y - 6, size: 8, font: pb.font, color: rgb(0.3, 0.3, 0.3) });
    pb.y -= 16;
  }

  // Required forms list
  pb.skip(2);
  pb.heading("REQUIRED FORMS FOR THIS RETURN", undefined, rgb(0.28, 0.33, 0.4));
  pb.skip();
  pb.text(`${result.formsRequired.length} forms required. Assembly order:`, pb.margin, 9);
  pb.y -= 14;
  const allFormsOrdered = sortFormsByAttachmentOrder(result.formsRequired);
  let idx = 1;
  for (const form of allFormsOrdered) {
    pb.checkY(20);
    pb.text(`${idx++}. ${form}`, pb.margin + 10, 9);
    pb.y -= 13;
  }
}

// ─── Footer on each page ──────────────────────────────────────────────────────

function addFooters(doc: PDFDocument, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, taxpayerName: string) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawLine({
      start: { x: 60, y: 30 },
      end: { x: 552, y: 30 },
      thickness: 0.3,
      color: rgb(0.7, 0.7, 0.7),
    });
    page.drawText(
      `${taxpayerName}  |  Tax Year 2025  |  Page ${i + 1} of ${pages.length}  |  Generated by Tax Manager — for reference only. Consult a tax professional for advice.`,
      { x: 60, y: 18, size: 6.5, font, color: rgb(0.5, 0.5, 0.5) }
    );
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateTaxPDFs(
  input: TaxReturnInput,
  result: TaxCalculationResult
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const pb = new PageBuilder(doc, font, boldFont);

  // Unique reference number for this package
  const refNum = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  // Cover page
  buildCoverPage(pb, input, result, refNum);

  // Part 1: How to File (instructions)
  buildInstructionsSection(pb, input, result);

  // Part 2: Federal return
  buildFederalSection(pb, input, result);

  // Part 3: State return (if applicable)
  if (result.state) {
    buildStateSection(pb, input, result);
  }

  // Part 4: Payment Vouchers
  buildPaymentVouchers(pb, input, result);

  // Part 5: 2026 Estimated Tax
  buildEstimatedTax(pb, input, result);

  // Part 6: Checklist & Records
  buildChecklist(pb, input, result);

  // Add footers to all pages (includes "Page N of M" with total page count)
  addFooters(doc, font, `${input.firstName} ${input.lastName}`);

  return doc.save();
}

function trySet(form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>, fieldName: string, value: string) {
  try {
    form.getTextField(fieldName).setText(value);
  } catch { /* field not found — skip */ }
}

function tryCheck(form: ReturnType<import("pdf-lib").PDFDocument["getForm"]>, fieldName: string) {
  try {
    form.getCheckBox(fieldName).check();
  } catch { /* skip */ }
}
