// ─── Filing Instructions Generator ───────────────────────────────────────────

import type { FilingInstruction } from "@/types/tax";

const FEDERAL_DEADLINE = "April 15, 2026";
const EXTENSION_DEADLINE = "October 15, 2026";

// IRS mailing addresses — Form 1040 (resident filers)
const IRS_1040_ADDRESS: Record<string, { noPayment: string; withPayment: string }> = {
  CA: {
    noPayment: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
    withPayment: "Internal Revenue Service, P.O. Box 802501, Cincinnati, OH 45280-2501",
  },
  PA: {
    noPayment: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
    withPayment: "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000",
  },
  WA: {
    noPayment: "Department of the Treasury, Internal Revenue Service, Ogden, UT 84201-0002",
    withPayment: "Internal Revenue Service, P.O. Box 932100, Louisville, KY 40293-2100",
  },
  default: {
    noPayment: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
    withPayment: "Internal Revenue Service, P.O. Box 931000, Louisville, KY 40293-1000",
  },
};

// IRS mailing addresses — Form 1040-NR (nonresident aliens)
const IRS_1040NR_ADDRESS = {
  noPayment: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215",
  withPayment: "Internal Revenue Service, P.O. Box 1303, Charlotte, NC 28201-1303 USA",
};

// State mailing addresses
const STATE_MAIL_ADDRESS: Record<string, { noPayment: string; withPayment: string }> = {
  CA: {
    noPayment: "FRANCHISE TAX BOARD, PO BOX 942840, SACRAMENTO CA 94240-0001",
    withPayment: "FRANCHISE TAX BOARD, PO BOX 942867, SACRAMENTO CA 94267-0001",
  },
  PA: {
    noPayment: "PA DEPARTMENT OF REVENUE, 2 REVENUE PLACE, HARRISBURG PA 17129-0001",
    withPayment: "PA DEPARTMENT OF REVENUE, 2 REVENUE PLACE, HARRISBURG PA 17129-0002",
  },
};

// IRS-specified attachment order for mailing a paper return
export const ATTACHMENT_ORDER = [
  "Form 1040",
  "Form 1040-NR",
  "Schedule 1",
  "Schedule 2",
  "Schedule 3",
  "Schedule A",
  "Schedule B",
  "Schedule C",
  "Schedule D",
  "Form 8949",
  "Schedule E",
  "Schedule SE",
  "Form 2106",
  "Form 2441",
  "Form 4562",
  "Form 5329",
  "Form 5695",
  "Form 6251",
  "Form 8283",
  "Form 8829",
  "Form 8839",
  "Form 8863",
  "Form 8880",
  "Form 8889",
  "Form 8959",
  "Form 8960",
  "Form 8995",
  "Schedule EIC",
  "Form 1116",
  "Form 2555",
  "Form 2210",
  "W-2",
  "Form 1099-INT",
  "Form 1099-DIV",
  "Form 1099-B",
  "Form 1099-NEC",
  "Form 1099-MISC",
  "Form 1099-R",
  "SSA-1099",
  "Form 1098",
  "Form 1098-E",
  "Form 1098-T",
  "Form 5498",
];

export function sortFormsByAttachmentOrder(forms: string[]): string[] {
  return [...forms].sort((a, b) => {
    const baseA = a.replace(/ \(.*\)/, "").trim();
    const baseB = b.replace(/ \(.*\)/, "").trim();
    const idxA = ATTACHMENT_ORDER.findIndex((f) => baseA.startsWith(f));
    const idxB = ATTACHMENT_ORDER.findIndex((f) => baseB.startsWith(f));
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
}

export function generateFilingInstructions(
  forms: string[],
  state: string | undefined,
  hasRefund: boolean,
  hasDue: boolean,
  isNonresident = false
): FilingInstruction[] {
  const instructions: FilingInstruction[] = [];

  const irsAddr = isNonresident
    ? IRS_1040NR_ADDRESS
    : (IRS_1040_ADDRESS[state ?? "default"] ?? IRS_1040_ADDRESS.default);

  const formName = isNonresident ? "Form 1040-NR" : "Form 1040";
  const formTitle = isNonresident
    ? "U.S. Nonresident Alien Income Tax Return"
    : "U.S. Individual Income Tax Return";

  const orderedForms = sortFormsByAttachmentOrder(forms.filter((f) => !f.startsWith("CA ") && !f.startsWith("PA ")));

  // ── Federal return ─────────────────────────────────────────────────────────
  instructions.push({
    form: formName,
    title: formTitle,
    deadline: FEDERAL_DEADLINE,
    mailTo: hasDue ? irsAddr.withPayment : irsAddr.noPayment,
    efileAvailable: !isNonresident, // 1040-NR has limited e-file options
    notes: [
      `Sign and date your return in blue or black ink.${hasDue || hasRefund ? (forms.includes("Form 1040") ? " Both spouses must sign if filing jointly." : "") : ""}`,
      `ATTACHMENT ORDER — Assemble in this exact sequence before mailing: ${orderedForms.slice(0, 10).join(" → ")}${orderedForms.length > 10 ? " → (then remaining forms in order)" : ""}.`,
      hasDue
        ? `PAYMENT: Make check or money order payable to "United States Treasury." Write your SSN and "2025 ${formName}" in the memo. Do NOT send cash.`
        : hasRefund
        ? "REFUND: Issued by direct deposit (if banking info provided, fastest — 3 weeks) or mailed check (up to 8 weeks)."
        : "No payment required — your withholding and payments covered your tax liability.",
      isNonresident
        ? "Form 1040-NR cannot be e-filed through most tax software. Mail the completed return to the address above."
        : `E-FILING STRONGLY RECOMMENDED: Faster refund, immediate confirmation, lower error rate. IRS Free File available at irs.gov/freefile if your AGI is $84,000 or less.`,
      `EXTENSION: File Form 4868 by ${FEDERAL_DEADLINE} to extend the filing deadline to ${EXTENSION_DEADLINE}. WARNING: An extension extends time to FILE, NOT time to PAY. Interest accrues on unpaid tax from ${FEDERAL_DEADLINE}.`,
      "RECORDS: Keep a complete copy of your return and all supporting documents for at least 3 years (7 years if you reported a loss or failed to report income).",
      ...(isNonresident
        ? [
            "As a nonresident alien, you may only claim deductions from Schedule A (itemized) — the standard deduction is not available.",
            "Your income tax may be affected by a tax treaty between the U.S. and your home country. Review IRS Publication 901 for applicable treaties.",
            "If your visa status changed during the year, you may be a dual-status alien. Consult a tax professional.",
          ]
        : []),
    ],
  });

  // ── Schedule C ─────────────────────────────────────────────────────────────
  if (forms.includes("Schedule C")) {
    instructions.push({
      form: "Schedule C",
      title: "Profit or Loss From Business (Sole Proprietorship)",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Attach to Form 1040/1040-NR. Prepare one Schedule C per business.",
        "Retain all business receipts and records for at least 3 years.",
        "If net profit exceeds $400, self-employment tax (Schedule SE) is also required.",
        "Vehicle expenses: use either standard mileage rate ($0.70/mile for 2025) or actual expenses — not both.",
        "Home office: use Form 8829 to calculate the deduction (simplified method also available).",
      ],
    });
  }

  if (forms.includes("Schedule SE")) {
    instructions.push({
      form: "Schedule SE",
      title: "Self-Employment Tax",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Covers Social Security (12.4%) and Medicare (2.9%) taxes for self-employed individuals.",
        "You may deduct half of SE tax as an above-the-line adjustment on Form 1040.",
        "If you had both W-2 wages and self-employment income, the Social Security portion is subject to the combined wage base cap ($176,100 for 2025).",
      ],
    });
  }

  // ── Schedule D / 8949 ──────────────────────────────────────────────────────
  if (forms.includes("Schedule D")) {
    instructions.push({
      form: "Schedule D + Form 8949",
      title: "Capital Gains and Losses",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "List each individual sale on Form 8949 (use separate forms for Box A, B, and C transactions).",
        "Totals from Form 8949 flow to Schedule D lines 1b, 2, and 3 (short-term) and 8b, 9, 10 (long-term).",
        "Separate short-term (held ≤ 1 year, taxed as ordinary income) from long-term (held > 1 year, preferential rates).",
        "Net capital loss deduction is limited to $3,000 per year against ordinary income. Excess carries forward to future years.",
        "Attach broker statements (Form 1099-B) or transaction records for all sales.",
      ],
    });
  }

  // ── Foreign income ─────────────────────────────────────────────────────────
  if (forms.includes("Form 2555 (Foreign Earned Income Exclusion)")) {
    instructions.push({
      form: "Form 2555",
      title: "Foreign Earned Income Exclusion",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Excludes up to $130,000 of foreign earned income (2025) if you meet the bona fide residence or physical presence test.",
        "Attach to Form 1040. The election applies year-by-year.",
        "Housing exclusion/deduction may also apply — calculate on Part VIII of Form 2555.",
      ],
    });
  }

  if (forms.includes("Form 1116 (Foreign Tax Credit)")) {
    instructions.push({
      form: "Form 1116",
      title: "Foreign Tax Credit",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Credits foreign taxes paid to reduce your U.S. tax, dollar-for-dollar.",
        "Use one Form 1116 per income category (passive, general, etc.).",
        "Excess credit carries back 1 year and forward 10 years.",
      ],
    });
  }

  // ── AMT ────────────────────────────────────────────────────────────────────
  if (forms.includes("Form 6251 (AMT)")) {
    instructions.push({
      form: "Form 6251",
      title: "Alternative Minimum Tax — Individuals",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "AMT is computed separately from regular tax; you pay whichever is higher.",
        "Common triggers: large itemized deductions (especially SALT), ISO stock options, accelerated depreciation.",
        "Attach Form 6251 to your return if AMT applies.",
      ],
    });
  }

  // ── State instructions ─────────────────────────────────────────────────────
  if (state === "CA") {
    const caAddr = STATE_MAIL_ADDRESS.CA;
    instructions.push({
      form: "CA Form 540",
      title: "California Resident Income Tax Return",
      deadline: "April 15, 2026",
      mailTo: hasDue ? caAddr.withPayment : caAddr.noPayment,
      efileAvailable: true,
      notes: [
        "FILE SEPARATELY from your federal return — CA Form 540 is a separate package mailed to the Franchise Tax Board.",
        "CA starts from federal AGI but with modifications — complete CA Schedule CA (540) to reconcile differences.",
        "CA does NOT tax Social Security income (already excluded in this calculation).",
        "CA does NOT allow HSA deductions — any HSA deduction on your federal return must be added back on CA Schedule CA.",
        "CA standard deduction ($5,202 single / $10,404 MFJ) is much lower than federal — most CA homeowners itemize.",
        "CA has no SALT cap — you may deduct your full California state and local taxes on Schedule CA.",
        hasDue
          ? `PAYMENT: Make check payable to "Franchise Tax Board." Write your SSN and "2025 Form 540" on the check. You may also pay online at ftb.ca.gov.`
          : "REFUND: CA refunds are typically issued within 3 weeks for e-filed returns, 3 months for paper.",
        "EXTENSION: CA automatically grants a 6-month extension to October 15, 2026 for filing (no extension form required). Payment is still due April 15, 2026.",
        "CA also requires SDI (State Disability Insurance) — typically withheld from wages by employer (1% of wages, no cap since 2024).",
      ],
    });
  }

  if (state === "PA") {
    const paAddr = STATE_MAIL_ADDRESS.PA;
    instructions.push({
      form: "PA Form PA-40",
      title: "Pennsylvania Personal Income Tax Return",
      deadline: "April 15, 2026",
      mailTo: hasDue ? paAddr.withPayment : paAddr.noPayment,
      efileAvailable: true,
      notes: [
        "FILE SEPARATELY from your federal return — PA Form PA-40 is mailed to the PA Department of Revenue.",
        "PA flat income tax rate: 3.07% on all taxable income. No standard or itemized deductions.",
        "PA does NOT tax Social Security income or most retirement distributions (401k, IRA, pension after retirement age).",
        "PA does NOT allow capital losses to offset ordinary income — losses only offset gains of the same class.",
        "LOCAL EARNED INCOME TAX: You must also file a local EIT return with your municipality or school district. Contact your local tax collector or visit dced.pa.gov to find your collector.",
        hasDue
          ? `PAYMENT: Make check payable to "PA Department of Revenue." Include your SSN and tax year on the check. Pay online at mypath.pa.gov.`
          : "REFUND: PA refunds are typically issued within 4 weeks for e-filed returns.",
        "EXTENSION: PA automatically extends to 6 months if at least 90% of tax is paid by April 15. File Form PA-8879 for e-file authorization.",
      ],
    });
  }

  if (state === "WA") {
    instructions.push({
      form: "WA — No State Income Tax",
      title: "Washington State — No Personal Income Tax Return Required",
      deadline: "N/A (unless LTCG applies)",
      efileAvailable: false,
      notes: [
        "Washington State has NO personal income tax. No state income tax return is required.",
        "CAPITAL GAINS TAX EXCEPTION: If your long-term capital gains exceeded $270,000 in 2025, you must file a WA Capital Gains Tax return. The tax is 7% on gains above $270,000.",
        "WA Capital Gains return is due April 15, 2026. File online at dor.wa.gov. Exempt assets include: real estate, retirement accounts, family-owned business assets, timber, and agricultural land.",
        "WORKING FAMILIES TAX CREDIT: If you received the federal EITC, you may qualify for the WA Working Families Tax Credit (10–25% of federal EITC). Apply at workingfamiliescredit.wa.gov by the end of the year following the tax year.",
        "WA BUSINESS & OCCUPATION (B&O) TAX: If you have self-employment/business income, you may owe WA B&O tax on gross receipts regardless of profit. File at dor.wa.gov.",
      ],
    });
  }

  return instructions;
}
