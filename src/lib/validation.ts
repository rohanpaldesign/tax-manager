import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────
const money = z.number().min(0).default(0);
const anyMoney = z.number().default(0); // allows negative (losses)

// ─── Income forms ─────────────────────────────────────────────────────────────
const W2Schema = z.object({
  employerName: z.string().default(""),
  employerEIN: z.string().default(""),
  wages: money,
  federalWithheld: money,
  socialSecurityWages: money,
  socialSecurityWithheld: money,
  medicareWages: money,
  medicareWithheld: money,
  stateWages: money,
  stateWithheld: money,
  state: z.string().default(""),
  localWages: money.optional(),
  localWithheld: money.optional(),
  box14CaSdi: money.optional(),
});

const NEC1099Schema = z.object({
  payerName: z.string().default(""),
  payerEIN: z.string().default(""),
  nonemployeeCompensation: money,
  federalWithheld: money,
});

const MISC1099Schema = z.object({
  payerName: z.string().default(""),
  payerEIN: z.string().default(""),
  rents: money.optional(),
  royalties: money.optional(),
  otherIncome: money.optional(),
  federalWithheld: money.optional(),
  medicalPayments: money.optional(),
  nonQualifiedDeferredComp: money.optional(),
});

const DIV1099Schema = z.object({
  payerName: z.string().default(""),
  totalOrdinaryDividends: money,
  qualifiedDividends: money,
  totalCapitalGainDistr: money,
  unrecaptured1250Gain: money.optional(),
  section1202Gain: money.optional(),
  collectiblesGain: money.optional(),
  federalWithheld: money,
  foreignTaxPaid: money.optional(),
});

const INT1099Schema = z.object({
  payerName: z.string().default(""),
  interestIncome: money,
  earlyWithdrawalPenalty: money.optional(),
  usSavingsBondInterest: money.optional(),
  federalWithheld: money,
  taxExemptInterest: money.optional(),
  privateActivityBondInterest: money.optional(),
  marketDiscount: money.optional(),
  bondPremium: money.optional(),
  investmentExpenses: money.optional(),
  foreignTaxPaid: money.optional(),
});

const B1099Schema = z.object({
  brokerName: z.string().default(""),
  proceeds: money,
  costBasis: money,
  dateAcquired: z.string().default(""),
  dateSold: z.string().default(""),
  longTermOrShortTerm: z.enum(["short", "long"]),
  federalWithheld: money,
  basisReportedToIRS: z.boolean().default(true),
  washSaleLossDisallowed: money.optional(),
  adjustmentCode: z.string().optional(),
  waRealEstate: z.boolean().optional(),
});

const G1099Schema = z.object({
  payerName: z.string().default(""),
  unemploymentCompensation: money,
  stateOrLocalRefund: money.optional(),
  priorYearItemized: z.boolean().optional(),
  federalWithheld: money,
  stateWithheld: money.optional(),
});

const S1042Schema = z.object({
  payerName: z.string().default(""),
  incomeCode: z.string().default("16"),
  grossIncome: money,
  taxWithheld: money,
  exemptionCode: z.string().optional(),
  treatyCountry: z.string().optional(),
  treatyArticle: z.string().optional(),
  exemptedIncome: money.optional(),
});

const R1099Schema = z.object({
  payerName: z.string().default(""),
  grossDistribution: money,
  taxableAmount: money,
  taxableAmountNotDetermined: z.boolean().default(false),
  federalWithheld: money,
  employeeContributions: money.optional(),
  distributionCode: z.string().default("7"),
  iraOrSepSimple: z.boolean().default(false),
  stateWithheld: money.optional(),
});

const ScheduleCSchema = z.object({
  businessName: z.string().default(""),
  ein: z.string().optional(),
  principalProductOrService: z.string().default(""),
  businessCode: z.string().default(""),
  grossReceipts: money,
  returns: money.optional(),
  costOfGoods: money.optional(),
  otherIncome: money.optional(),
  advertising: money.optional(),
  carTruck: money.optional(),
  commissions: money.optional(),
  contractLabor: money.optional(),
  depletion: money.optional(),
  depreciation: money.optional(),
  employeeBenefitPrograms: money.optional(),
  insurance: money.optional(),
  mortgageInterest: money.optional(),
  otherInterest: money.optional(),
  legal: money.optional(),
  officeExpense: money.optional(),
  pensionProfit: money.optional(),
  rentLeaseMachinery: money.optional(),
  rentLeaseOther: money.optional(),
  repairs: money.optional(),
  supplies: money.optional(),
  taxesLicenses: money.optional(),
  travel: money.optional(),
  meals: money.optional(),
  utilities: money.optional(),
  wages: money.optional(),
  otherExpenses: z.array(z.object({ description: z.string(), amount: money })).optional(),
  homeOfficeSqFt: z.number().min(0).optional(),
  totalHomeSqFt: z.number().min(0).optional(),
  homeOfficeDirect: money.optional(),
  homeOfficeIndirect: money.optional(),
  vehicleMiles: z.number().min(0).optional(),
  personalMiles: z.number().min(0).optional(),
  mileageRate: z.number().optional(),
});

const RentalPropertySchema = z.object({
  address: z.string().default(""),
  daysRented: z.number().min(0).max(366).default(365),
  daysPersonalUse: z.number().min(0).max(366).default(0),
  rents: money,
  advertising: money.optional(),
  autoTravel: money.optional(),
  cleaning: money.optional(),
  commissions: money.optional(),
  insurance: money.optional(),
  legalProfessional: money.optional(),
  managementFees: money.optional(),
  mortgageInterest: money.optional(),
  otherInterest: money.optional(),
  repairs: money.optional(),
  supplies: money.optional(),
  taxes: money.optional(),
  utilities: money.optional(),
  depreciation: money.optional(),
  otherExpenses: z.array(z.object({ description: z.string(), amount: money })).optional(),
  priorYearPassiveLosses: money.optional(),
});

const CapitalAssetSchema = z.object({
  description: z.string().default(""),
  dateAcquired: z.string().default(""),
  dateSold: z.string().default(""),
  proceeds: money,
  costBasis: money,
  adjustments: anyMoney.optional(),
  longTermOrShortTerm: z.enum(["short", "long"]),
  basisReportedToIRS: z.boolean().default(true),
  washSaleLossDisallowed: money.optional(),
  waRealEstate: z.boolean().optional(),
});

const DependentSchema = z.object({
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  ssn: z.string().default(""),
  dateOfBirth: z.string().default(""),
  relationship: z.string().default(""),
  monthsLived: z.number().min(0).max(12).default(12),
  fullTimeStudent: z.boolean().default(false),
  disabled: z.boolean().default(false),
  childTaxCreditEligible: z.boolean().default(true),
  eitcEligible: z.boolean().default(true),
  ctcQualifyingChild: z.boolean().default(true),
});

const RetirementContribSchema = z.object({
  traditionalIRA: money,
  rothIRA: money,
  sep_ira: money,
  simple_ira: money,
  solo401k_traditional: money,
  solo401k_roth: money,
  hsa: money,
  fsaDependentCare: money,
});

// ─── Main TaxReturnInput schema ───────────────────────────────────────────────
export const TaxReturnInputSchema = z.object({
  // Taxpayer
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  ssn: z.string().default(""),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  occupation: z.string().default(""),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().default(""),
  zip: z.string().min(5, "ZIP code is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),

  // Spouse
  spouseFirstName: z.string().optional(),
  spouseLastName: z.string().optional(),
  spouseSsn: z.string().optional(),
  spouseDateOfBirth: z.string().optional(),
  spouseOccupation: z.string().optional(),
  spouseDeceased: z.boolean().optional(),

  filingStatus: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  residencyStatus: z.enum(["resident", "nonresident", "part_year_resident"]).default("resident"),
  stateOfResidence: z.enum(["CA", "PA", "WA"]).optional(),

  // Dependents
  dependents: z.array(DependentSchema).default([]),

  // Income
  w2Income: z.array(W2Schema).default([]),
  form1099NEC: z.array(NEC1099Schema).default([]),
  form1099MISC: z.array(MISC1099Schema).default([]),
  form1099DIV: z.array(DIV1099Schema).default([]),
  form1099INT: z.array(INT1099Schema).default([]),
  form1099B: z.array(B1099Schema).default([]),
  form1099R: z.array(R1099Schema).default([]),
  form1099G: z.array(G1099Schema).default([]),
  form1042S: z.array(S1042Schema).default([]),
  socialSecurity: z.object({ netBenefits: money, federalWithheld: money.optional() }).optional(),
  scheduleC: z.array(ScheduleCSchema).default([]),
  rentalProperties: z.array(RentalPropertySchema).default([]),
  capitalAssetSales: z.array(CapitalAssetSchema).default([]),
  foreignIncome: z.object({
    country: z.string(),
    foreignWages: money,
    foreignTaxPaid: money,
    excludedUnderFEIE: z.boolean(),
    housingExclusion: money.optional(),
  }).optional(),

  // Adjustments
  educatorExpenses: money.optional(),
  studentLoanInterest: z.object({ interestPaid: money }).optional(),
  tuitionEducation: z.array(z.object({
    institutionName: z.string().default(""),
    qualifiedExpenses: money,
    scholarships: money,
    halfTimeOrMore: z.boolean().default(true),
    firstFourYears: z.boolean().default(false),
  })).default([]),
  retirementContributions: RetirementContribSchema,
  alimonyPaid: money.optional(),
  alimonySSN: z.string().optional(),
  earlyWithdrawalPenalties: money.optional(),
  selfEmployedHealthInsurance: money.optional(),

  // Deductions
  itemize: z.boolean().default(true),
  homeOwnership: z.object({
    mortgageInterest: money,
    pointsPaid: money.optional(),
    mortgageInsurancePremiums: money.optional(),
    propertyTaxes: money,
    isFirstHome: z.boolean().optional(),
    proceeds: money.optional(),
    costBasis: money.optional(),
    yearsLivedIn: z.number().optional(),
  }).optional(),
  charitableContributions: z.object({
    cashContributions: money,
    nonCashContributions: money,
    carryoverFromPrior: money.optional(),
  }).optional(),
  medicalExpenses: z.object({ totalMedicalExpenses: money }).optional(),
  unreimbursedEmployeeExpenses: money.optional(),
  stateLocalTaxes: money.optional(),
  casualtyLosses: money.optional(),

  // Credits
  childCareExpenses: money.optional(),
  childCareProviderEIN: z.string().optional(),
  energyCredits: money.optional(),
  electricVehicleCredit: z.boolean().optional(),
  adoptionExpenses: money.optional(),

  // Payments
  estimatedTaxPayments: money,
  priorYearOverpaymentApplied: money.optional(),
  earnedIncomeTaxCredit: z.boolean().optional(),

  // State
  stateTaxInfo: z.object({
    state: z.enum(["CA", "PA", "WA"]),
    residencyStatus: z.enum(["resident", "nonresident", "part_year_resident"]),
    partYearFromDate: z.string().optional(),
    partYearToDate: z.string().optional(),
    caRenterCredit: z.boolean().optional(),
    caYoungChildCredit: z.boolean().optional(),
    paLocalEIT: money.optional(),
    paSchoolDistrict: z.string().optional(),
    paLocalWithheld: money.optional(),
  }).optional(),

  // Preferences
  directDepositRouting: z.string().optional(),
  directDepositAccount: z.string().optional(),
  directDepositType: z.enum(["checking", "savings"]).optional(),
  applyOverpaymentToNextYear: z.boolean().optional(),
});

export type ValidatedTaxReturnInput = z.infer<typeof TaxReturnInputSchema>;
