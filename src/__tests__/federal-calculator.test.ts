// ─── Federal Tax Engine — Unit Tests ─────────────────────────────────────────
// Each test scenario uses a hand-calculated expected value derived from the
// 2025 IRS brackets/constants to verify the engine's arithmetic.

import { calculateFederalTax } from "@/lib/tax-engine/federal/calculator";
import type { TaxReturnInput, W2Income, RetirementContributions } from "@/types/tax";

// ─── Test Fixture Factories ──────────────────────────────────────────────────

function emptyRetirement(): RetirementContributions {
  return {
    traditionalIRA: 0,
    rothIRA: 0,
    sep_ira: 0,
    simple_ira: 0,
    solo401k_traditional: 0,
    solo401k_roth: 0,
    hsa: 0,
    fsaDependentCare: 0,
  };
}

function w2(wages: number, withheld: number): W2Income {
  return {
    employerName: "ACME Corp",
    employerEIN: "12-3456789",
    wages,
    federalWithheld: withheld,
    socialSecurityWages: wages,
    socialSecurityWithheld: Math.round(wages * 0.062),
    medicareWages: wages,
    medicareWithheld: Math.round(wages * 0.0145),
    stateWages: wages,
    stateWithheld: 0,
    state: "CA",
  };
}

function baseInput(overrides: Partial<TaxReturnInput> = {}): TaxReturnInput {
  return {
    firstName: "Jane",
    lastName: "Doe",
    ssn: "123-45-6789",
    dateOfBirth: "1985-06-15",
    occupation: "Engineer",
    address: "123 Main St",
    city: "Seattle",
    state: "WA",
    zip: "98101",
    filingStatus: "single",
    residencyStatus: "resident",
    dependents: [],
    w2Income: [],
    form1099NEC: [],
    form1099MISC: [],
    form1099DIV: [],
    form1099INT: [],
    form1099B: [],
    form1099R: [],
    scheduleC: [],
    rentalProperties: [],
    capitalAssetSales: [],
    retirementContributions: emptyRetirement(),
    tuitionEducation: [],
    itemize: false,
    estimatedTaxPayments: 0,
    ...overrides,
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Apply ordinary tax brackets manually for verification */
function manualBracketTax(income: number, brackets: [number, number, number | null][]): number {
  let tax = 0;
  for (const [rate, min, max] of brackets) {
    if (income <= min) break;
    const taxable = max === null ? income - min : Math.min(income, max) - min;
    tax += taxable * rate;
  }
  return tax;
}

// ─── 1. Simple W-2 Only Filer (Single) ───────────────────────────────────────

describe("W-2 only filer — Single", () => {
  // Wages: $60,000  Withheld: $5,000
  // Standard deduction (single 2025): $15,000
  // Taxable income: $45,000
  // Tax:  10% × $11,925 = $1,192.50
  //       12% × ($45,000 - $11,925) = 12% × $33,075 = $3,969.00
  //       Total = $5,161.50
  // Withheld: $5,000 → Amount due: $161.50

  const result = calculateFederalTax(
    baseInput({ w2Income: [w2(60_000, 5_000)] })
  );

  test("AGI equals wages (no adjustments)", () => {
    expect(result.adjustedGrossIncome).toBe(60_000);
  });

  test("Standard deduction taken", () => {
    expect(result.isItemized).toBe(false);
    expect(result.standardOrItemizedDeduction).toBe(15_000);
  });

  test("Taxable income = 60,000 - 15,000 = 45,000", () => {
    expect(result.taxableIncome).toBe(45_000);
  });

  test("Regular tax ≈ $5,161.50", () => {
    expect(result.regularTax).toBeCloseTo(5_161.5, 1);
  });

  test("Total tax ≈ $5,161.50 (no other taxes)", () => {
    expect(result.totalTax).toBeCloseTo(5_161.5, 1);
  });

  test("Amount due ≈ $161.50 after withholding", () => {
    expect(result.amountDue).toBeCloseTo(161.5, 1);
    expect(result.refund).toBe(0);
  });

  test("Effective rate < marginal rate (24%)", () => {
    expect(result.effectiveTaxRate).toBeLessThan(0.12);
    expect(result.marginalTaxRate).toBe(0.12);
  });
});

// ─── 2. Married Filing Jointly — Standard Deduction ──────────────────────────

describe("W-2 filer — Married Filing Jointly", () => {
  // Combined wages: $120,000  Withheld: $15,000
  // Standard deduction (MFJ 2025): $30,000
  // Taxable income: $90,000
  // Tax: 10% × $23,850 = $2,385
  //      12% × ($90,000 - $23,850) = 12% × $66,150 = $7,938
  //      Total = $10,323

  const result = calculateFederalTax(
    baseInput({
      filingStatus: "married_filing_jointly",
      w2Income: [w2(70_000, 8_000), w2(50_000, 7_000)],
    })
  );

  test("AGI = combined wages = 120,000", () => {
    expect(result.adjustedGrossIncome).toBe(120_000);
    expect(result.totalWages).toBe(120_000);
  });

  test("Standard deduction = 30,000", () => {
    expect(result.standardOrItemizedDeduction).toBe(30_000);
  });

  test("Taxable income = 90,000", () => {
    expect(result.taxableIncome).toBe(90_000);
  });

  test("Regular tax ≈ $10,323", () => {
    expect(result.regularTax).toBeCloseTo(10_323, 0);
  });

  test("Total withheld = 15,000", () => {
    expect(result.totalWithheld).toBe(15_000);
  });

  test("Refund ≈ $4,677", () => {
    expect(result.refund).toBeCloseTo(4_677, 0);
  });
});

// ─── 3. Self-Employed (Schedule C) ───────────────────────────────────────────

describe("Schedule C — self-employed single filer", () => {
  // Gross receipts: $80,000   Expenses: $20,000   Net profit: $60,000
  //
  // SE tax:
  //   seNetEarnings = $60,000 × 0.9235 = $55,410
  //   seTax = $55,410 × 0.124 + $55,410 × 0.029 = $6,870.84 + $1,606.89 = $8,477.73
  //   seDeduction = $8,477.73 × 0.5 = $4,238.865
  //
  // AGI = $60,000 - $4,238.865 = $55,761.135
  //
  // QBI deduction = min($60k×0.2, $taxableBeforeQBI×0.2)
  //   taxableBeforeQBI = $55,761.135 - $15,000 = $40,761.135
  //   QBI = min($12,000, $8,152.227) = $8,152.227
  //
  // Taxable income = $40,761.135 - $8,152.227 = $32,608.908
  // Regular tax = 10% × $11,925 + 12% × ($32,608.908 - $11,925)
  //             = $1,192.50 + 12% × $20,683.908 = $1,192.50 + $2,482.07 = $3,674.57
  //
  // Total tax = $3,674.57 + $8,477.73 = $12,152.30

  const result = calculateFederalTax(
    baseInput({
      scheduleC: [
        {
          businessName: "Freelance Dev",
          principalProductOrService: "Software",
          businessCode: "541511",
          grossReceipts: 80_000,
          advertising: 5_000,
          supplies: 10_000,
          insurance: 5_000,
        },
      ],
    })
  );

  test("Schedule C net profit = $60,000", () => {
    expect(result.scheduleCNetProfit).toBe(60_000);
  });

  test("SE tax ≈ $8,477.73", () => {
    expect(result.selfEmploymentTax).toBeCloseTo(8_477.73, 1);
  });

  test("AGI ≈ $55,761.14", () => {
    expect(result.adjustedGrossIncome).toBeCloseTo(55_761.14, 1);
  });

  test("QBI deduction ≈ $8,152.23", () => {
    expect(result.qualifiedBusinessIncomeDeduction).toBeCloseTo(8_152.23, 1);
  });

  test("Taxable income ≈ $32,608.91", () => {
    expect(result.taxableIncome).toBeCloseTo(32_608.91, 1);
  });

  test("Regular tax ≈ $3,674.57", () => {
    expect(result.regularTax).toBeCloseTo(3_674.57, 1);
  });

  test("Total tax (regular + SE) ≈ $12,152.30", () => {
    expect(result.totalTax).toBeCloseTo(12_152.3, 0);
  });
});

// ─── 4. Rental Loss — PAL Phase-Out ──────────────────────────────────────────

describe("Rental loss with PAL phase-out ($120k AGI)", () => {
  // W-2 wages: $120,000 (for AGI)
  // Rental: income $10,000, mortgage $20,000 → gross loss = -$10,000
  //
  // PAL allowance at AGI $120k:
  //   phase-out range $100k–$150k → halfway phased
  //   palAllowance = $25,000 - ($120,000 - $100,000) / 2 = $25,000 - $10,000 = $15,000
  //   Allowed loss = min($10,000, $15,000) = $10,000 (fully allowed, loss < allowance)
  //   scheduleE_net = -$10,000

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(120_000, 0)],
      rentalProperties: [
        {
          address: "456 Oak Ave",
          daysRented: 365,
          daysPersonalUse: 0,
          rents: 10_000,
          mortgageInterest: 20_000,
        },
      ],
    })
  );

  test("Rental gross net = -$10,000", () => {
    // total income should include $10k rental gross before PAL
    // but result only exposes scheduleENetIncome (after PAL)
    expect(result.scheduleENetIncome).toBe(-10_000);
  });

  test("Full loss allowed because loss < PAL allowance ($15k)", () => {
    // PAL allowance = $25k - ($120k - $100k)/2 = $15k
    // rental loss $10k < $15k → full loss allowed
    expect(result.scheduleENetIncome).toBe(-10_000);
  });
});

describe("Rental loss — fully phased out at AGI $160k", () => {
  // Wages: $175,000  Rental: income $5k, mortgage $20k → gross loss = -$15k
  // AGI = $175k - $15k = $160k (above $150k phase-out ceiling) → PAL allowance = $0
  // Rental loss of $15,000 → scheduleE_net = $0 (all disallowed)

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(175_000, 0)],
      rentalProperties: [
        {
          address: "789 Pine Rd",
          daysRented: 365,
          daysPersonalUse: 0,
          rents: 5_000,
          mortgageInterest: 20_000,
        },
      ],
    })
  );

  test("Rental loss fully disallowed at AGI > $150k", () => {
    expect(result.scheduleENetIncome).toBeCloseTo(0);
  });
});

describe("Rental loss — MFS gets $0 PAL allowance", () => {
  const result = calculateFederalTax(
    baseInput({
      filingStatus: "married_filing_separately",
      w2Income: [w2(60_000, 0)],
      rentalProperties: [
        {
          address: "101 Elm St",
          daysRented: 365,
          daysPersonalUse: 0,
          rents: 8_000,
          mortgageInterest: 15_000,
        },
      ],
    })
  );

  test("MFS rental loss = $0 allowed (PAL = $0)", () => {
    expect(result.scheduleENetIncome).toBeCloseTo(0);
  });
});

// ─── 5. EITC Calculation ──────────────────────────────────────────────────────

describe("EITC — single with 1 qualifying child", () => {
  // Wages: $25,000
  // EITC: maxCredit=4,328, phaseoutStart=23,350, phaseoutEnd=49,084
  // income $25,000 > $23,350 → phasing out
  // reduction = (25,000 - 23,350) / (49,084 - 23,350) × 4,328
  //           = 1,650 / 25,734 × 4,328 ≈ 277.47
  // EITC ≈ $4,328 - $277.47 = $4,050.53

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(25_000, 0)],
      dependents: [
        {
          firstName: "Sam",
          lastName: "Doe",
          ssn: "234-56-7890",
          dateOfBirth: "2018-03-10",
          relationship: "child",
          monthsLived: 12,
          fullTimeStudent: false,
          disabled: false,
          childTaxCreditEligible: true,
          eitcEligible: true,
          ctcQualifyingChild: true,
        },
      ],
    })
  );

  test("EITC ≈ $4,050.53", () => {
    expect(result.earnedIncomeCredit).toBeCloseTo(4_050.53, 1);
  });
});

describe("EITC — fully phased out at high income", () => {
  // Single, $60,000 wages — above $49,084 phase-out end for 1 child
  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(60_000, 0)],
      dependents: [
        {
          firstName: "Sam",
          lastName: "Doe",
          ssn: "234-56-7890",
          dateOfBirth: "2018-03-10",
          relationship: "child",
          monthsLived: 12,
          fullTimeStudent: false,
          disabled: false,
          childTaxCreditEligible: true,
          eitcEligible: true,
          ctcQualifyingChild: true,
        },
      ],
    })
  );

  test("EITC = $0 at $60,000 wages (above phase-out end)", () => {
    expect(result.earnedIncomeCredit).toBe(0);
  });
});

// ─── 6. Long-Term Capital Gains — 0% Rate ────────────────────────────────────

describe("LTCG taxed at 0% when taxable income below $48,350 (single)", () => {
  // Wages: $30,000
  // LTCG: $10,000 (via 1099-B)
  // Standard deduction: $15,000
  // Taxable income = ($30,000 + $10,000) - $15,000 = $25,000
  // $25,000 < $48,350 → 0% LTCG rate
  // Ordinary income portion for brackets = $25,000 - $10,000 = $15,000
  // Ordinary tax = 10% × $11,925 + 12% × ($15,000 - $11,925) = $1,192.50 + $369 = $1,561.50
  // LTCG tax = $0
  // Total regular tax ≈ $1,561.50

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(30_000, 0)],
      form1099B: [
        {
          brokerName: "Fidelity",
          proceeds: 15_000,
          costBasis: 5_000,
          dateAcquired: "2022-01-01",
          dateSold: "2025-12-01",
          longTermOrShortTerm: "long",
          federalWithheld: 0,
          basisReportedToIRS: true,
        },
      ],
    })
  );

  test("Long-term capital gain = $10,000", () => {
    expect(result.longTermCapitalGains).toBe(10_000);
  });

  test("Taxable income = $25,000", () => {
    expect(result.taxableIncome).toBe(25_000);
  });

  test("Regular tax ≈ $1,561.50 (0% LTCG)", () => {
    expect(result.regularTax).toBeCloseTo(1_561.5, 1);
  });
});

// ─── 7. Capital Loss Deduction Cap ($3,000) ───────────────────────────────────

describe("Capital loss limited to $3,000 against ordinary income", () => {
  // Wages: $50,000  Short-term loss: $10,000
  // Net capital loss = -$10,000, capped at -$3,000 for deduction
  // AGI = $50,000 - $3,000 = $47,000
  // Standard deduction = $15,000
  // Taxable income = $32,000

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(50_000, 0)],
      form1099B: [
        {
          brokerName: "Schwab",
          proceeds: 5_000,
          costBasis: 15_000,
          dateAcquired: "2024-06-01",
          dateSold: "2025-03-01",
          longTermOrShortTerm: "short",
          federalWithheld: 0,
          basisReportedToIRS: true,
        },
      ],
    })
  );

  test("Short-term capital loss = -$10,000", () => {
    expect(result.shortTermCapitalGains).toBe(-10_000);
  });

  test("Reportable capital gain limited to -$3,000", () => {
    expect(result.totalCapitalGains).toBe(-3_000);
  });

  test("Taxable income = $32,000 after $3k loss deduction", () => {
    expect(result.taxableIncome).toBe(32_000);
  });
});

// ─── 8. Itemized Deductions Beat Standard Deduction ──────────────────────────

describe("Itemized deductions exceed standard deduction", () => {
  // Wages: $200,000
  // Mortgage interest: $18,000  SALT: $10,000  Charity: $5,000
  // Schedule A total = $33,000 > standard deduction ($15,000)
  // taxable income = $200,000 - $33,000 = $167,000

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(200_000, 0)],
      homeOwnership: {
        mortgageInterest: 18_000,
        propertyTaxes: 7_000,
      },
      stateLocalTaxes: 8_000,   // total SALT = min($7k+$8k, $10k) = $10k
      charitableContributions: {
        cashContributions: 5_000,
        nonCashContributions: 0,
      },
    })
  );

  test("Itemized deduction chosen", () => {
    expect(result.isItemized).toBe(true);
  });

  test("Schedule A = $10,000 SALT + $18,000 mortgage + $5,000 charity = $33,000", () => {
    expect(result.standardOrItemizedDeduction).toBe(33_000);
  });

  test("Taxable income = $200,000 - $33,000 = $167,000", () => {
    expect(result.taxableIncome).toBe(167_000);
  });
});

// ─── 9. MFS SALT Cap is $5,000 ────────────────────────────────────────────────

describe("MFS filer — SALT cap is $5,000", () => {
  // Wages: $120,000 MFS
  // State taxes paid: $8,000 (should be capped at $5,000)
  // Property taxes: $3,000 (SALT budget exhausted → $0 allowed)
  // Mortgage interest: $12,000
  // Schedule A total = $5,000 SALT + $12,000 mortgage = $17,000 > std ded $15,000
  // Taxable = $120,000 - $17,000 = $103,000

  const result = calculateFederalTax(
    baseInput({
      filingStatus: "married_filing_separately",
      w2Income: [w2(120_000, 0)],
      stateLocalTaxes: 8_000,
      homeOwnership: {
        mortgageInterest: 12_000,
        propertyTaxes: 3_000,
      },
    })
  );

  test("Itemized deductions chosen (17k > 15k std ded)", () => {
    expect(result.isItemized).toBe(true);
  });

  test("SALT limited to $5,000 for MFS (not $10k)", () => {
    // Total SALT = min($8k, $5k cap) = $5k, then propertyTax capped at $0 (budget gone)
    expect(result.standardOrItemizedDeduction).toBe(17_000);
  });

  test("Taxable income = $103,000", () => {
    expect(result.taxableIncome).toBe(103_000);
  });
});

// ─── 10. Child Tax Credit ─────────────────────────────────────────────────────

describe("Child Tax Credit — 2 qualifying children, $80k MFJ", () => {
  // 2 qualifying children × $2,000 = $4,000 CTC
  // AGI $80,000 < phaseout threshold ($400,000 MFJ) → no phase-out
  // CTC nonrefundable limited to tax; refundable = 15% × max(0, earned income - 2,500)

  const result = calculateFederalTax(
    baseInput({
      filingStatus: "married_filing_jointly",
      w2Income: [w2(80_000, 0)],
      dependents: [
        {
          firstName: "Alice",
          lastName: "Doe",
          ssn: "111-22-3333",
          dateOfBirth: "2015-04-01",
          relationship: "child",
          monthsLived: 12,
          fullTimeStudent: false,
          disabled: false,
          childTaxCreditEligible: true,
          eitcEligible: false,
          ctcQualifyingChild: true,
        },
        {
          firstName: "Bob",
          lastName: "Doe",
          ssn: "222-33-4444",
          dateOfBirth: "2018-09-15",
          relationship: "child",
          monthsLived: 12,
          fullTimeStudent: false,
          disabled: false,
          childTaxCreditEligible: true,
          eitcEligible: false,
          ctcQualifyingChild: true,
        },
      ],
    })
  );

  test("Total CTC = $4,000", () => {
    expect(result.childTaxCredit).toBe(4_000);
  });

  test("Tax significantly reduced by CTC", () => {
    // MFJ $80k: taxable income = $50k, regular tax ≈ $5,523
    // nonRefundable CTC = $3,400 → totalTax ≈ $2,123
    expect(result.totalTax).toBeCloseTo(2_123, 0);
  });
});

// ─── 11. Social Security Taxability ──────────────────────────────────────────

describe("Social Security — partially taxable", () => {
  // SS benefits: $20,000  Other income: $25,000 (wages)
  // Combined income = $25,000 + $20,000×0.5 = $35,000
  // Threshold 1 (single): $25,000  Threshold 2 (single): $34,000
  // Combined > T2 → up to 85% taxable
  // Tier1 = min($20k×0.5, ($34k-$25k)×0.5) = min($10k, $4.5k) = $4,500
  // Tier2 = min($20k×0.85 - $4.5k, ($35k-$34k)×0.85) = min($12.5k, $850) = $850
  // taxableSS = min($20k×0.85, $4,500 + $850) = min($17,000, $5,350) = $5,350

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(25_000, 0)],
      socialSecurity: { netBenefits: 20_000 },
    })
  );

  test("Taxable SS ≈ $5,350", () => {
    expect(result.socialSecurityTaxable).toBeCloseTo(5_350, 0);
  });

  test("Total income = wages + taxable SS", () => {
    expect(result.totalIncome).toBeCloseTo(25_000 + 5_350, 0);
  });
});

describe("Social Security — fully below threshold (not taxable)", () => {
  // SS benefits: $15,000  No other income
  // Combined income = $0 + $15,000×0.5 = $7,500 < $25,000 threshold 1
  const result = calculateFederalTax(
    baseInput({ socialSecurity: { netBenefits: 15_000 } })
  );

  test("SS not taxable when combined income below T1", () => {
    expect(result.socialSecurityTaxable).toBe(0);
  });
});

// ─── 12. Traditional IRA Deductibility Phase-Out ─────────────────────────────

describe("Traditional IRA deductibility — phased out for active participant", () => {
  // Single, $85,000 wages (within phase-out range $79k–$89k)
  // IRA contribution: $7,000
  // Phase-out pct = ($85k - $79k) / ($89k - $79k) = $6k/$10k = 60%
  // Deductible portion = $7,000 × (1 - 0.60) = $2,800

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(85_000, 0)],
      retirementContributions: {
        ...emptyRetirement(),
        traditionalIRA: 7_000,
      },
    })
  );

  test("IRA deduction partially phased out ≈ $2,800", () => {
    // The deduction reduces AGI (it's applied to taxable income calc in the code)
    // totalDeductions = standardOrItemized + QBI + traditionalIRADeductible
    const expectedIRADeduction = 7_000 * (1 - (85_000 - 79_000) / 10_000);
    expect(result.totalDeductions - result.standardOrItemizedDeduction).toBeCloseTo(
      expectedIRADeduction,
      0
    );
  });
});

// ─── 13. No AMT for Typical Filers ───────────────────────────────────────────

describe("AMT — not triggered for $60k single filer", () => {
  const result = calculateFederalTax(
    baseInput({ w2Income: [w2(60_000, 0)] })
  );

  test("AMT = 0 for typical income below exemption", () => {
    expect(result.alternativeMinimumTax).toBe(0);
  });
});

// ─── 14. Net Investment Income Tax (NIIT) ────────────────────────────────────

describe("NIIT — triggered when AGI exceeds $200k (single)", () => {
  // Wages: $220,000  Qualified dividends: $10,000 (also total ordinary)
  // AGI = $230,000 > NIIT threshold $200,000
  // Net investment income = totalOrdinaryDividends = $10,000
  // NIIT = min($10,000, $230,000 - $200,000) × 3.8% = $10,000 × 3.8% = $380

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(220_000, 0)],
      form1099DIV: [
        {
          payerName: "Vanguard",
          totalOrdinaryDividends: 10_000,
          qualifiedDividends: 10_000,
          totalCapitalGainDistr: 0,
          federalWithheld: 0,
        },
      ],
    })
  );

  test("NIIT ≈ $380", () => {
    expect(result.netInvestmentIncomeTax).toBeCloseTo(380, 0);
  });
});

// ─── 15. Student Loan Interest Deduction ─────────────────────────────────────

describe("Student loan interest deduction — capped at $2,500", () => {
  // Wages: $50,000  Student loan interest: $3,000 (capped to $2,500)
  // AGI = $50,000 - $2,500 = $47,500

  const result = calculateFederalTax(
    baseInput({
      w2Income: [w2(50_000, 0)],
      studentLoanInterest: { interestPaid: 3_000 },
    })
  );

  test("AGI reduced by student loan interest (capped at $2,500)", () => {
    expect(result.adjustedGrossIncome).toBe(47_500);
  });

  test("Total adjustments = $2,500", () => {
    expect(result.totalAdjustments).toBe(2_500);
  });
});

// ─── 16. Refundable Return ────────────────────────────────────────────────────

describe("Refund scenario — overwithholding", () => {
  const result = calculateFederalTax(
    baseInput({ w2Income: [w2(50_000, 10_000)] })
  );

  test("Refund when withholding exceeds tax", () => {
    expect(result.refund).toBeGreaterThan(0);
    expect(result.amountDue).toBe(0);
    expect(result.totalOwed).toBeLessThan(0);
  });
});

// ─── 17. Zero-Income Return ───────────────────────────────────────────────────

describe("Zero income — no tax liability", () => {
  const result = calculateFederalTax(baseInput());

  test("All income fields = 0", () => {
    expect(result.adjustedGrossIncome).toBe(0);
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  test("No refund or amount due (no earned income = no EITC)", () => {
    expect(result.refund).toBe(0);
    expect(result.amountDue).toBe(0);
    expect(result.earnedIncomeCredit).toBe(0);
  });
});

// ─── 18. SE Tax Deduction — SE Contribution to AGI ──────────────────────────

describe("SE deduction reduces AGI (not income floor below zero)", () => {
  // 1099-NEC income: $10,000 (small)
  // SE tax on $10k×0.9235 = $9,235 × 15.3% = $1,412.96
  // SE deduction = $706.48
  // AGI = $10,000 - $706.48 = $9,293.52

  const result = calculateFederalTax(
    baseInput({
      form1099NEC: [
        {
          payerName: "ClientCo",
          payerEIN: "98-7654321",
          nonemployeeCompensation: 10_000,
          federalWithheld: 0,
        },
      ],
    })
  );

  const seNetEarnings = 10_000 * 0.9235;
  const seTax = seNetEarnings * 0.124 + seNetEarnings * 0.029;
  const seDeduction = seTax * 0.5;

  test("SE deduction ≈ half of SE tax", () => {
    expect(result.totalAdjustments).toBeCloseTo(seDeduction, 1);
  });

  test("SE tax included in total tax", () => {
    expect(result.selfEmploymentTax).toBeCloseTo(seTax, 1);
  });
});
