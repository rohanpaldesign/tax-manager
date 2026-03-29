// ─── IRS Constants for Tax Year 2025 ─────────────────────────────────────────
// Source: IRS Rev. Proc. 2024-40 (2025 inflation adjustments)

import type { FilingStatus } from "@/types/tax";

export const TAX_YEAR = 2025;

// ─── Standard Deductions ─────────────────────────────────────────────────────
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15_000,
  married_filing_jointly: 30_000,
  married_filing_separately: 15_000,
  head_of_household: 22_500,
  qualifying_surviving_spouse: 30_000,
};

// Additional standard deduction for age 65+ or blind (per person)
export const ADDITIONAL_STANDARD_DEDUCTION_ELDERLY = 2_000; // single/hoh
export const ADDITIONAL_STANDARD_DEDUCTION_ELDERLY_MFJ = 1_600; // per qualifying person

// ─── Tax Brackets ─────────────────────────────────────────────────────────────
// [rate, min income, max income (null = unlimited)]
type Bracket = [number, number, number | null];

export const TAX_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    [0.10, 0, 11_925],
    [0.12, 11_925, 48_475],
    [0.22, 48_475, 103_350],
    [0.24, 103_350, 197_300],
    [0.32, 197_300, 250_525],
    [0.35, 250_525, 626_350],
    [0.37, 626_350, null],
  ],
  married_filing_jointly: [
    [0.10, 0, 23_850],
    [0.12, 23_850, 96_950],
    [0.22, 96_950, 206_700],
    [0.24, 206_700, 394_600],
    [0.32, 394_600, 501_050],
    [0.35, 501_050, 751_600],
    [0.37, 751_600, null],
  ],
  married_filing_separately: [
    [0.10, 0, 11_925],
    [0.12, 11_925, 48_475],
    [0.22, 48_475, 103_350],
    [0.24, 103_350, 197_300],
    [0.32, 197_300, 250_525],
    [0.35, 250_525, 375_800],
    [0.37, 375_800, null],
  ],
  head_of_household: [
    [0.10, 0, 17_000],
    [0.12, 17_000, 64_850],
    [0.22, 64_850, 103_350],
    [0.24, 103_350, 197_300],
    [0.32, 197_300, 250_500],
    [0.35, 250_500, 626_350],
    [0.37, 626_350, null],
  ],
  qualifying_surviving_spouse: [
    [0.10, 0, 23_850],
    [0.12, 23_850, 96_950],
    [0.22, 96_950, 206_700],
    [0.24, 206_700, 394_600],
    [0.32, 394_600, 501_050],
    [0.35, 501_050, 751_600],
    [0.37, 751_600, null],
  ],
};

// ─── Qualified Dividends & Long-Term Capital Gains Rates ─────────────────────
// [rate, min taxable income, max taxable income]
export const LTCG_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    [0.00, 0, 48_350],
    [0.15, 48_350, 533_400],
    [0.20, 533_400, null],
  ],
  married_filing_jointly: [
    [0.00, 0, 96_700],
    [0.15, 96_700, 600_050],
    [0.20, 600_050, null],
  ],
  married_filing_separately: [
    [0.00, 0, 48_350],
    [0.15, 48_350, 300_000],
    [0.20, 300_000, null],
  ],
  head_of_household: [
    [0.00, 0, 64_750],
    [0.15, 64_750, 566_700],
    [0.20, 566_700, null],
  ],
  qualifying_surviving_spouse: [
    [0.00, 0, 96_700],
    [0.15, 96_700, 600_050],
    [0.20, 600_050, null],
  ],
};

// ─── Self-Employment Tax ──────────────────────────────────────────────────────
export const SE_TAX_RATE = 0.153;        // 15.3% on first $176,100
export const SE_SS_WAGE_BASE = 176_100;  // 2025 Social Security wage base
export const SE_SS_RATE = 0.124;         // 12.4% SS portion
export const SE_MEDICARE_RATE = 0.029;   // 2.9% Medicare
export const SE_DEDUCTION_RATE = 0.5;    // Deduct 50% of SE tax from income

// Additional Medicare Tax: 0.9% above thresholds
export const ADDITIONAL_MEDICARE_TAX_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  married_filing_jointly: 250_000,
  married_filing_separately: 125_000,
  head_of_household: 200_000,
  qualifying_surviving_spouse: 200_000,
};

// Net Investment Income Tax: 3.8% above thresholds
export const NIIT_RATE = 0.038;
export const NIIT_THRESHOLD: Record<FilingStatus, number> = {
  single: 200_000,
  married_filing_jointly: 250_000,
  married_filing_separately: 125_000,
  head_of_household: 200_000,
  qualifying_surviving_spouse: 250_000,
};

// ─── Alternative Minimum Tax (AMT) ───────────────────────────────────────────
export const AMT_EXEMPTION: Record<FilingStatus, number> = {
  single: 88_100,
  married_filing_jointly: 137_000,
  married_filing_separately: 68_500,
  head_of_household: 88_100,
  qualifying_surviving_spouse: 137_000,
};
export const AMT_EXEMPTION_PHASEOUT: Record<FilingStatus, number> = {
  single: 626_350,
  married_filing_jointly: 1_252_700,
  married_filing_separately: 626_350,
  head_of_household: 626_350,
  qualifying_surviving_spouse: 1_252_700,
};
export const AMT_RATE_1 = 0.26; // Up to $232,600 (MFS: $116,300)
export const AMT_RATE_2 = 0.28; // Above
export const AMT_BREAKPOINT = 232_600;

// ─── Social Security Taxability ──────────────────────────────────────────────
// Combined income = AGI + nontaxable interest + 50% of SS benefits
export const SS_THRESHOLD_1: Record<FilingStatus, number> = {
  single: 25_000,
  married_filing_jointly: 32_000,
  married_filing_separately: 0,
  head_of_household: 25_000,
  qualifying_surviving_spouse: 32_000,
};
export const SS_THRESHOLD_2: Record<FilingStatus, number> = {
  single: 34_000,
  married_filing_jointly: 44_000,
  married_filing_separately: 0,
  head_of_household: 34_000,
  qualifying_surviving_spouse: 44_000,
};

// ─── Child Tax Credit ─────────────────────────────────────────────────────────
export const CHILD_TAX_CREDIT_AMOUNT = 2_000;     // per qualifying child under 17
export const OTHER_DEPENDENT_CREDIT = 500;
export const ADDITIONAL_CTC_RATE = 0.15;           // refundable portion
export const CHILD_TAX_CREDIT_PHASEOUT_MFJ = 400_000;
export const CHILD_TAX_CREDIT_PHASEOUT_OTHER = 200_000;
export const CHILD_TAX_CREDIT_PHASEOUT_INCREMENT = 50; // per $1,000 over threshold

// ─── Earned Income Tax Credit (EITC) ─────────────────────────────────────────
export const EITC_MAX_INVESTMENT_INCOME = 11_600;
export const EITC_RATES: Array<{
  children: number;
  maxCredit: number;
  phaseoutStart: Record<"single_hoh" | "mfj", number>;
  phaseoutEnd: Record<"single_hoh" | "mfj", number>;
}> = [
  { children: 0, maxCredit: 649, phaseoutStart: { single_hoh: 10_620, mfj: 17_360 }, phaseoutEnd: { single_hoh: 18_591, mfj: 25_511 } },
  { children: 1, maxCredit: 4_328, phaseoutStart: { single_hoh: 23_350, mfj: 30_090 }, phaseoutEnd: { single_hoh: 49_084, mfj: 56_004 } },
  { children: 2, maxCredit: 7_152, phaseoutStart: { single_hoh: 23_350, mfj: 30_090 }, phaseoutEnd: { single_hoh: 55_768, mfj: 62_688 } },
  { children: 3, maxCredit: 8_046, phaseoutStart: { single_hoh: 23_350, mfj: 30_090 }, phaseoutEnd: { single_hoh: 59_899, mfj: 66_819 } },
];

// ─── IRA Contribution Limits ─────────────────────────────────────────────────
export const IRA_CONTRIBUTION_LIMIT = 7_000;       // under 50
export const IRA_CATCHUP_LIMIT = 8_000;            // 50 and over
export const ROTH_IRA_PHASEOUT: Record<FilingStatus, [number, number]> = {
  single: [150_000, 165_000],
  married_filing_jointly: [236_000, 246_000],
  married_filing_separately: [0, 10_000],
  head_of_household: [150_000, 165_000],
  qualifying_surviving_spouse: [236_000, 246_000],
};
export const TRADITIONAL_IRA_DEDUCTION_PHASEOUT_ACTIVE: Record<FilingStatus, [number, number]> = {
  single: [79_000, 89_000],
  married_filing_jointly: [126_000, 146_000],
  married_filing_separately: [0, 10_000],
  head_of_household: [79_000, 89_000],
  qualifying_surviving_spouse: [79_000, 89_000],
};

// ─── HSA Limits ──────────────────────────────────────────────────────────────
export const HSA_LIMIT_INDIVIDUAL = 4_300;
export const HSA_LIMIT_FAMILY = 8_550;
export const HSA_CATCHUP = 1_000;  // age 55+

// ─── Section 179 / Bonus Depreciation ────────────────────────────────────────
export const SECTION_179_LIMIT = 1_250_000;
export const BONUS_DEPRECIATION_RATE = 0.40;  // 40% for 2025

// ─── SALT Cap ────────────────────────────────────────────────────────────────
export const SALT_CAP = 10_000;  // MFS: $5,000

// ─── QBI Deduction (Section 199A) ────────────────────────────────────────────
export const QBI_DEDUCTION_RATE = 0.20;
export const QBI_PHASEOUT_START: Record<FilingStatus, number> = {
  single: 197_300,
  married_filing_jointly: 394_600,
  married_filing_separately: 197_300,
  head_of_household: 197_300,
  qualifying_surviving_spouse: 394_600,
};
export const QBI_PHASEOUT_END: Record<FilingStatus, number> = {
  single: 247_300,
  married_filing_jointly: 444_600,
  married_filing_separately: 247_300,
  head_of_household: 247_300,
  qualifying_surviving_spouse: 444_600,
};

// ─── Standard Mileage Rates ───────────────────────────────────────────────────
export const MILEAGE_RATE_BUSINESS = 0.70;     // $0.70/mile for 2025
export const MILEAGE_RATE_MEDICAL = 0.21;
export const MILEAGE_RATE_CHARITABLE = 0.14;

// ─── SE Health Insurance ─────────────────────────────────────────────────────
// 100% deductible as adjustment to income (limited to net SE income)

// ─── Retirement Saver's Credit ───────────────────────────────────────────────
export const RETIREMENT_SAVER_CREDIT: Array<{
  rate: number;
  single_hoh: number;
  mfj: number;
  mfs: number;
}> = [
  { rate: 0.50, single_hoh: 23_750, mfj: 47_500, mfs: 23_750 },
  { rate: 0.20, single_hoh: 25_875, mfj: 51_750, mfs: 25_875 },
  { rate: 0.10, single_hoh: 40_250, mfj: 80_500, mfs: 40_250 },
];

// ─── Estate & Gift ───────────────────────────────────────────────────────────
export const ANNUAL_GIFT_EXCLUSION = 19_000;
