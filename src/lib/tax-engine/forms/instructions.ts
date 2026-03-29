// ─── Filing Instructions Generator ───────────────────────────────────────────

import type { FilingInstruction } from "@/types/tax";

const FEDERAL_DEADLINE = "April 15, 2026";
const EXTENSION_DEADLINE = "October 15, 2026";

// IRS mailing addresses vary by state and whether you're enclosing payment
const IRS_MAIL_ADDRESS: Record<string, { noPayment: string; withPayment: string }> = {
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

export function generateFilingInstructions(
  forms: string[],
  state: string | undefined,
  hasRefund: boolean,
  hasDue: boolean
): FilingInstruction[] {
  const instructions: FilingInstruction[] = [];
  const irsAddr = IRS_MAIL_ADDRESS[state ?? "default"] ?? IRS_MAIL_ADDRESS.default;

  // ── Federal 1040 ───────────────────────────────────────────────────────────
  instructions.push({
    form: "Form 1040",
    title: "U.S. Individual Income Tax Return",
    deadline: FEDERAL_DEADLINE,
    mailTo: hasDue ? irsAddr.withPayment : irsAddr.noPayment,
    efileAvailable: true,
    notes: [
      "Sign and date your return. If filing jointly, both spouses must sign.",
      "Attach all W-2s, 1099s, and supporting schedules in the order listed on Form 1040.",
      hasDue
        ? `Make your check or money order payable to "United States Treasury." Write your SSN and "2025 Form 1040" on the check.`
        : hasRefund
        ? "Your refund will be issued by direct deposit (if banking info provided) or mailed as a check."
        : "No payment required.",
      `Extension available until ${EXTENSION_DEADLINE} — file Form 4868 by ${FEDERAL_DEADLINE} (this extends the filing deadline, NOT the payment deadline).`,
      "E-filing is strongly recommended. IRS Free File is available if AGI is $79,000 or less.",
      "Keep a copy of your entire return for at least 3 years (7 years if you claimed a loss).",
    ],
  });

  // Schedule C
  if (forms.includes("Schedule C")) {
    instructions.push({
      form: "Schedule C",
      title: "Profit or Loss From Business",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Attach to Form 1040. You need one Schedule C per business.",
        "Retain all business receipts and records for at least 3 years.",
        "If net profit exceeds $400, self-employment tax (Schedule SE) is required.",
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
        "Self-employment tax covers Social Security and Medicare for self-employed individuals.",
        "You may deduct half of SE tax from your gross income on Form 1040.",
      ],
    });
  }

  // Schedule D / Form 8949
  if (forms.includes("Schedule D")) {
    instructions.push({
      form: "Schedule D + Form 8949",
      title: "Capital Gains and Losses",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "List each sale on Form 8949. Totals flow to Schedule D.",
        "Separate short-term (held ≤ 1 year) from long-term (held > 1 year) transactions.",
        "Net capital losses are limited to $3,000 per year against ordinary income; excess carries forward.",
        "Obtain cost basis statements from your broker (Form 1099-B).",
      ],
    });
  }

  // Foreign income
  if (forms.includes("Form 2555 (Foreign Earned Income Exclusion)")) {
    instructions.push({
      form: "Form 2555",
      title: "Foreign Earned Income Exclusion",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "Elect to exclude foreign earned income (up to $130,000 for 2025) if you meet the bona fide residence or physical presence test.",
        "Attach to Form 1040. The exclusion is made on a year-by-year basis.",
      ],
    });
  }

  // AMT
  if (forms.includes("Form 6251 (AMT)")) {
    instructions.push({
      form: "Form 6251",
      title: "Alternative Minimum Tax — Individuals",
      deadline: FEDERAL_DEADLINE,
      efileAvailable: true,
      notes: [
        "AMT applies when it exceeds your regular tax. Both amounts are computed and you pay the higher.",
        "Review ISO stock option exercises, large itemized deductions, and depreciation for AMT triggers.",
      ],
    });
  }

  // State instructions
  if (state === "CA") {
    const caAddr = STATE_MAIL_ADDRESS.CA;
    instructions.push({
      form: "CA Form 540",
      title: "California Resident Income Tax Return",
      deadline: "April 15, 2026",
      mailTo: hasDue ? caAddr.withPayment : caAddr.noPayment,
      efileAvailable: true,
      notes: [
        "CA conforms to federal AGI with modifications. Review CA Schedule CA (540) for adjustments.",
        "CA does not tax Social Security income.",
        "CA does not allow HSA deductions — add back any HSA deduction taken on your federal return.",
        "CA standard deduction ($5,202 single / $10,404 MFJ) is much lower than federal — most filers itemize in CA.",
        hasDue
          ? `Make check payable to "Franchise Tax Board." Write your SSN and "2025 Form 540" on the check.`
          : "CA refunds typically processed within 3 weeks for e-filed returns.",
        "CA also requires payment of SDI (State Disability Insurance) — this is typically withheld by your employer.",
        "Extension: CA automatically grants a 6-month extension to October 15, 2026 for filing. Payment still due April 15.",
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
        "PA has a flat 3.07% income tax rate. No standard or itemized deductions.",
        "PA does NOT tax most retirement distributions (401k, IRA, pension) after retirement age.",
        "PA does NOT tax Social Security income.",
        "Capital losses do NOT reduce ordinary income in PA (unlike federal).",
        "You may also need to file a Local Earned Income Tax (EIT) return with your municipality.",
        hasDue
          ? `Make check payable to "PA Department of Revenue."`
          : "",
        "Extension: PA automatically extends to 6 months if you file an extension. Payment still due April 15.",
      ].filter(Boolean),
    });
  }

  if (state === "WA") {
    instructions.push({
      form: "WA — No State Income Tax Return",
      title: "Washington State — No Personal Income Tax",
      deadline: "N/A",
      efileAvailable: false,
      notes: [
        "Washington State has NO personal income tax. No state income tax return is required.",
        "EXCEPTION: If your long-term capital gains exceeded $270,000 in 2025, you must file a WA Capital Gains Tax return and pay 7% on the amount over $270,000.",
        "WA Capital Gains Tax return is due April 15, 2026 and filed online at dor.wa.gov.",
        "Real estate sales and certain small business assets are EXEMPT from WA capital gains tax.",
        "WA Working Families Tax Credit: If you received the federal EITC, you may qualify for additional WA state credit. Apply at workingfamiliescredit.wa.gov.",
        "WA has no inheritance or estate tax below $2.193 million.",
      ],
    });
  }

  return instructions;
}
