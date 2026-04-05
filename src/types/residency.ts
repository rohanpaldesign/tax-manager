// ─── Residency Determination Types ───────────────────────────────────────────

export type ResidencyClassification =
  | "US_CITIZEN"
  | "RESIDENT_ALIEN_GREEN_CARD"
  | "RESIDENT_ALIEN_SPT"
  | "RESIDENT_ALIEN_FYC" // First-Year Choice election
  | "NONRESIDENT_ALIEN"
  | "DUAL_STATUS";

export interface ResidencyInput {
  // R-1: Citizenship
  isUsCitizen: boolean;

  // R-2: Green Card
  heldGreenCard: boolean;
  formallyAbandonedGreenCard?: boolean;

  // R-3: Visa types (multi-select)
  visaTypes: string[];

  // R-4: Visa exemption data
  firstFMVisaArrivalDate?: string;  // YYYY-MM-DD — first US arrival on F/M visa (from I-94)
  firstJQVisaArrivalDate?: string;  // YYYY-MM-DD — first US arrival on J/Q visa (from I-94)
  priorJQExemptYears?: number;      // prior calendar years of J/Q exemption claimed

  // I-94 details
  i94AdmissionDate?: string;        // YYYY-MM-DD — most recent I-94 admission date
  i94AdmittedUntilDate?: string;    // YYYY-MM-DD or "D/S" — I-94 authorized stay expiry

  // R-5: Days present (manual entry — gross days each year)
  grossDays2025: number;
  grossDays2024: number;
  grossDays2023: number;
  excludedDays2025: number;
  excludedDays2024: number;
  excludedDays2023: number;

  // R-6: Arrival date in current tax year (dual-status check)
  usArrivalDate2025?: string; // ISO date e.g. "2025-04-15"

  // R-7: NRA additional questions
  hasForeignTaxHome?: boolean;
  homeTreatyCountry?: string;
  hasTreatyBenefits?: boolean;

  // R-9: Dual-status / First-Year Choice
  wantsFirstYearChoice?: boolean;
  wasResidentPriorYear?: boolean;
  maxConsecutiveDays2025?: number;
  presencePercentageFrom31DayStart?: number; // 0–1
  residencyEndDate2025?: string; // if left the US mid-year
}

export interface ResidencyResult {
  classification: ResidencyClassification;
  federalForm: "1040" | "1040-NR" | "both";
  additionalForms: string[];
  summary: string;
  summaryDetail: string;
  isDualStatus: boolean;
  residentStartDate?: string;
  residentEndDate?: string;
  warnings: string[];
  treatyFlag: boolean;
}
