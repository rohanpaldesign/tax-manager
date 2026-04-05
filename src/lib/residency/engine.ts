// ─── Residency Determination Engine (IRS Publication 519) ───────────────────
// Implements the full Substantial Presence Test and all exemptions.

import type {
  ResidencyInput,
  ResidencyResult,
  ResidencyClassification,
} from "@/types/residency";

const TAX_YEAR = 2025;

const FM_VISAS = ["F-1", "F-2", "M-1", "M-2"];
const JQ_VISAS = ["J-1", "J-2", "Q-1"];
const DIPLOMATIC_VISAS = ["A-1", "A-2", "G-1", "G-2", "G-3", "G-4", "G-5"];

function hasAnyVisa(visaTypes: string[], target: string[]): boolean {
  return visaTypes.some((v) => target.includes(v));
}

function netDays(gross: number, excluded: number): number {
  return Math.max(0, gross - excluded);
}

function sptScore(net2025: number, net2024: number, net2023: number): number {
  return net2025 + Math.floor(net2024 / 3) + Math.floor(net2023 / 6);
}

function isAfterJan1(dateStr: string): boolean {
  return dateStr > `${TAX_YEAR}-01-01`;
}

function checkFirstYearChoiceEligibility(input: ResidencyInput): boolean {
  if (input.wasResidentPriorYear) return false;
  if ((input.maxConsecutiveDays2025 ?? 0) < 31) return false;
  if ((input.presencePercentageFrom31DayStart ?? 0) < 0.75) return false;
  return true;
}

export function determineResidency(input: ResidencyInput): ResidencyResult {
  // ── Step 1: US Citizen ───────────────────────────────────────────────────
  if (input.isUsCitizen) {
    return {
      classification: "US_CITIZEN",
      federalForm: "1040",
      additionalForms: [],
      summary: "US Citizen — File Form 1040",
      summaryDetail:
        "As a US citizen you are taxed on your worldwide income. You file Form 1040 and are eligible for the standard deduction, EITC, and all credits.",
      isDualStatus: false,
      warnings: [],
      treatyFlag: false,
    };
  }

  // ── Step 2: Green Card ───────────────────────────────────────────────────
  if (input.heldGreenCard) {
    const warnings: string[] = [];
    if (input.formallyAbandonedGreenCard) {
      warnings.push(
        "You indicated you formally abandoned your green card in 2025. You may be subject to the expatriation tax and must file Form 8854. Consult a tax professional."
      );
    }
    return {
      classification: "RESIDENT_ALIEN_GREEN_CARD",
      federalForm: "1040",
      additionalForms: input.formallyAbandonedGreenCard ? ["Form 8854"] : [],
      summary: "Resident Alien (Green Card) — File Form 1040",
      summaryDetail:
        "As a lawful permanent resident you are taxed on your worldwide income. You file Form 1040 and are eligible for the same deductions and credits as US citizens.",
      isDualStatus: false,
      warnings,
      treatyFlag: false,
    };
  }

  // ── Step 3: Exempt Individual Check ─────────────────────────────────────
  if (hasAnyVisa(input.visaTypes, FM_VISAS)) {
    const arrivalYear = input.firstFMVisaArrivalDate
      ? new Date(input.firstFMVisaArrivalDate).getFullYear()
      : TAX_YEAR;
    const yearsOnFM = TAX_YEAR - arrivalYear;
    if (yearsOnFM < 5) {
      return {
        classification: "NONRESIDENT_ALIEN",
        federalForm: "1040-NR",
        additionalForms: ["Form 8843"],
        summary: "Nonresident Alien (F/M visa exempt) — File Form 1040-NR",
        summaryDetail:
          `You are within the 5-year F/M student visa exemption window (year ${yearsOnFM + 1} of 5). Your days in the US do not count toward the Substantial Presence Test. You file Form 1040-NR and must also file Form 8843 to claim the exemption.`,
        isDualStatus: false,
        warnings: [],
        treatyFlag: !!input.homeTreatyCountry,
      };
    }
  }

  if (hasAnyVisa(input.visaTypes, JQ_VISAS)) {
    const arrivalYear = input.firstJQVisaArrivalDate
      ? new Date(input.firstJQVisaArrivalDate).getFullYear()
      : TAX_YEAR;
    const yearsOnJQ = TAX_YEAR - arrivalYear;
    const priorExempt = input.priorJQExemptYears ?? 0;
    if (yearsOnJQ < 2 || priorExempt < 6) {
      return {
        classification: "NONRESIDENT_ALIEN",
        federalForm: "1040-NR",
        additionalForms: ["Form 8843"],
        summary: "Nonresident Alien (J/Q visa exempt) — File Form 1040-NR",
        summaryDetail:
          "You qualify as an exempt individual under your J or Q visa. Your days in the US do not count toward the Substantial Presence Test. You file Form 1040-NR and must also file Form 8843.",
        isDualStatus: false,
        warnings: [],
        treatyFlag: !!input.homeTreatyCountry,
      };
    }
  }

  if (hasAnyVisa(input.visaTypes, DIPLOMATIC_VISAS)) {
    return {
      classification: "NONRESIDENT_ALIEN",
      federalForm: "1040-NR",
      additionalForms: ["Form 8843"],
      summary: "Nonresident Alien (Diplomatic/Government visa) — File Form 1040-NR",
      summaryDetail:
        "As a diplomatic or government visa holder, your days in the US are exempt from the Substantial Presence Test. You file Form 1040-NR.",
      isDualStatus: false,
      warnings: [],
      treatyFlag: false,
    };
  }

  // ── Step 4: Substantial Presence Test ───────────────────────────────────
  const net2025 = netDays(input.grossDays2025, input.excludedDays2025);
  const net2024 = netDays(input.grossDays2024, input.excludedDays2024);
  const net2023 = netDays(input.grossDays2023, input.excludedDays2023);
  const spt = sptScore(net2025, net2024, net2023);

  // Minimum: must have at least 31 days in current year
  if (net2025 < 31) {
    return buildNRA(input, net2025, "SPT minimum not met: fewer than 31 days in 2025.");
  }

  if (spt >= 183) {
    // Check for dual-status (arrived mid-year)
    const arrivalDate = input.usArrivalDate2025;
    if (arrivalDate && isAfterJan1(arrivalDate)) {
      // First-Year Choice eligibility
      const fycEligible = checkFirstYearChoiceEligibility(input);
      if (fycEligible && input.wantsFirstYearChoice) {
        return {
          classification: "RESIDENT_ALIEN_FYC",
          federalForm: "1040",
          additionalForms: [],
          summary: "Resident Alien (First-Year Choice Election) — File Form 1040",
          summaryDetail:
            "You have elected to be treated as a US resident for all of 2025 under the First-Year Choice (IRC §7701(b)(4)). This simplifies your return. You file Form 1040 for the full year.",
          isDualStatus: false,
          residentStartDate: `${TAX_YEAR}-01-01`,
          warnings: [
            "The First-Year Choice requires you to be a full-year US resident in 2026. If you leave the US, the election may be revoked.",
          ],
          treatyFlag: !!input.homeTreatyCountry,
        };
      }

      return {
        classification: "DUAL_STATUS",
        federalForm: "both",
        additionalForms: [],
        summary: "Dual-Status Alien — File Form 1040 (resident period) + Form 1040-NR (nonresident period)",
        summaryDetail:
          `You became a US tax resident on ${formatDate(arrivalDate)}. Before that date you were a nonresident alien. Your return covers both periods: a Form 1040 for the resident period and a Form 1040-NR attached as a statement for the nonresident period.`,
        isDualStatus: true,
        residentStartDate: arrivalDate,
        residentEndDate: input.residencyEndDate2025,
        warnings: [
          "Dual-status returns are complex. No standard deduction is allowed for the nonresident period.",
          fycEligible
            ? "You may be eligible for the First-Year Choice election, which would simplify your return to a single Form 1040. Go back and select that option if you wish."
            : "",
        ].filter(Boolean),
        treatyFlag: !!input.homeTreatyCountry,
      };
    }

    // Full-year resident (arrived before Jan 1 or present all year)
    return {
      classification: "RESIDENT_ALIEN_SPT",
      federalForm: "1040",
      additionalForms: [],
      summary: "Resident Alien (Substantial Presence Test) — File Form 1040",
      summaryDetail:
        `Your SPT score is ${spt} (${net2025} days in 2025 + ${Math.floor(net2024 / 3)} from 2024 + ${Math.floor(net2023 / 6)} from 2023 = ${spt}). You meet the 183-day threshold. You file Form 1040 and are taxed on worldwide income.`,
      isDualStatus: false,
      warnings: [],
      treatyFlag: !!input.homeTreatyCountry,
    };
  }

  // SPT not met — check Closer Connection Exception
  return buildNRA(input, net2025, `SPT score ${spt} is below 183.`);
}

function buildNRA(
  input: ResidencyInput,
  net2025: number,
  reason: string
): ResidencyResult {
  const additionalForms: string[] = [];
  let summaryDetail =
    `${reason} You are a nonresident alien for US tax purposes. You file Form 1040-NR and are taxed only on US-source income. No standard deduction is available.`;

  if (input.hasForeignTaxHome && net2025 < 183) {
    additionalForms.push("Form 8840");
    summaryDetail +=
      " You qualify for the Closer Connection Exception (Form 8840) because you maintain a tax home in a foreign country and spent fewer than 183 days in the US this year. Form 8840 must be filed with your return.";
  }

  const warnings: string[] = [];
  if (input.hasTreatyBenefits) {
    warnings.push(
      `Your home country (${input.homeTreatyCountry ?? "unknown"}) has a tax treaty with the US. Treaty benefits may reduce your US tax on certain income types. This is reflected in your return.`
    );
  }

  return {
    classification: "NONRESIDENT_ALIEN",
    federalForm: "1040-NR",
    additionalForms,
    summary: "Nonresident Alien — File Form 1040-NR",
    summaryDetail,
    isDualStatus: false,
    warnings,
    treatyFlag: !!input.homeTreatyCountry,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
