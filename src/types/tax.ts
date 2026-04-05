// ─── Core Tax Types for Tax Year 2025 ───────────────────────────────────────

export type FilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_surviving_spouse";

export type ResidencyStatus = "resident" | "nonresident" | "part_year_resident";

export type StateCode = "CA" | "PA" | "WA";

export const TAX_YEAR = 2025;

// ─── Income Inputs ───────────────────────────────────────────────────────────

export interface W2Income {
  employerName: string;
  employerEIN: string;
  wages: number;              // Box 1
  federalWithheld: number;    // Box 2
  socialSecurityWages: number; // Box 3
  socialSecurityWithheld: number; // Box 4
  medicareWages: number;      // Box 5
  medicareWithheld: number;   // Box 6
  stateWages: number;         // Box 16
  stateWithheld: number;      // Box 17
  state: StateCode | string;
  localWages?: number;
  localWithheld?: number;
  box14CaSdi?: number;        // Box 14: CA SDI withheld (deductible on CA return)
}

export interface Form1099NEC {
  payerName: string;
  payerEIN: string;
  nonemployeeCompensation: number; // Box 1
  federalWithheld: number;         // Box 4
}

export interface Form1099MISC {
  payerName: string;
  payerEIN: string;
  rents?: number;            // Box 1
  royalties?: number;        // Box 2
  otherIncome?: number;      // Box 3
  federalWithheld?: number;  // Box 4
  medicalPayments?: number;  // Box 6
  nonQualifiedDeferredComp?: number; // Box 14
}

export interface Form1099DIV {
  payerName: string;
  totalOrdinaryDividends: number;  // Box 1a
  qualifiedDividends: number;      // Box 1b
  totalCapitalGainDistr: number;   // Box 2a
  unrecaptured1250Gain?: number;   // Box 2b
  section1202Gain?: number;        // Box 2c
  collectiblesGain?: number;       // Box 2d
  federalWithheld: number;         // Box 4
  foreignTaxPaid?: number;         // Box 7
}

export interface Form1099INT {
  payerName: string;
  interestIncome: number;          // Box 1
  earlyWithdrawalPenalty?: number; // Box 2
  usSavingsBondInterest?: number;  // Box 3
  federalWithheld: number;         // Box 4
  investmentExpenses?: number;     // Box 5
  foreignTaxPaid?: number;         // Box 6
  taxExemptInterest?: number;      // Box 8
  privateActivityBondInterest?: number; // Box 9
  marketDiscount?: number;         // Box 10
  bondPremium?: number;            // Box 11
}

export interface Form1099B {
  brokerName: string;
  proceeds: number;
  costBasis: number;
  dateAcquired: string;
  dateSold: string;
  longTermOrShortTerm: "short" | "long";
  federalWithheld: number;
  basisReportedToIRS: boolean;
  washSaleLossDisallowed?: number;
  adjustmentCode?: string;
  waRealEstate?: boolean;     // WA LTCG: real estate gains are exempt from WA capital gains tax
}

export interface Form1099G {
  payerName: string;                   // State agency or federal payer
  unemploymentCompensation: number;    // Box 1 — fully taxable federally
  stateOrLocalRefund?: number;         // Box 2 — taxable only if prior year was itemized
  priorYearItemized?: boolean;         // Whether taxpayer itemized in the prior year
  federalWithheld: number;             // Box 4
  stateWithheld?: number;              // Box 11
}

export interface Form1042S {
  payerName: string;
  incomeCode: string;                  // Box 1: 16=scholarship, 17=independent, 18=dependent, 19=wages
  grossIncome: number;                 // Box 2
  taxWithheld: number;                 // Box 7a
  exemptionCode?: string;              // Box 6 (04=treaty exempt)
  treatyCountry?: string;              // Box 13g
  treatyArticle?: string;              // Box 13h
  exemptedIncome?: number;             // Amount exempt under treaty (reduces taxable gross)
}

export interface Form1099R {
  payerName: string;
  grossDistribution: number;      // Box 1
  taxableAmount: number;          // Box 2a
  taxableAmountNotDetermined: boolean; // Box 2b
  federalWithheld: number;        // Box 4
  employeeContributions?: number; // Box 5
  distributionCode: string;       // Box 7 (1=early, 2=early exception, 7=normal, G=rollover, etc.)
  iraOrSepSimple: boolean;        // Box 7 IRA/SEP/SIMPLE checkbox
  stateWithheld?: number;
}

export interface SocialSecurityBenefits {
  netBenefits: number;            // SSA-1099 Box 5
  federalWithheld?: number;
}

export interface ScheduleCBusiness {
  businessName: string;
  ein?: string;
  principalProductOrService: string;
  businessCode: string;           // 6-digit principal business code
  grossReceipts: number;
  returns?: number;
  costOfGoods?: number;
  otherIncome?: number;
  // Deductions
  advertising?: number;
  carTruck?: number;
  commissions?: number;
  contractLabor?: number;
  depletion?: number;
  depreciation?: number;
  employeeBenefitPrograms?: number;
  insurance?: number;
  mortgageInterest?: number;
  otherInterest?: number;
  legal?: number;
  officeExpense?: number;
  pensionProfit?: number;
  rentLeaseMachinery?: number;
  rentLeaseOther?: number;
  repairs?: number;
  supplies?: number;
  taxesLicenses?: number;
  travel?: number;
  meals?: number; // 50% deductible
  utilities?: number;
  wages?: number;
  otherExpenses?: { description: string; amount: number }[];
  homeOfficeSqFt?: number;
  totalHomeSqFt?: number;
  homeOfficeDirect?: number;
  homeOfficeIndirect?: number;
  vehicleMiles?: number;
  personalMiles?: number;
  mileageRate?: number; // defaults to IRS standard
}

export interface RentalProperty {
  address: string;
  daysRented: number;
  daysPersonalUse: number;
  rents: number;
  advertising?: number;
  autoTravel?: number;
  cleaning?: number;
  commissions?: number;
  insurance?: number;
  legalProfessional?: number;
  managementFees?: number;
  mortgageInterest?: number;
  otherInterest?: number;
  repairs?: number;
  supplies?: number;
  taxes?: number;
  utilities?: number;
  depreciation?: number;
  otherExpenses?: { description: string; amount: number }[];
  priorYearPassiveLosses?: number;
}

export interface CapitalAssetSale {
  description: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: number;
  costBasis: number;
  adjustments?: number;
  longTermOrShortTerm: "short" | "long";
  basisReportedToIRS: boolean;
  washSaleLossDisallowed?: number;
  waRealEstate?: boolean;     // WA LTCG: real estate is exempt from WA capital gains tax
}

export interface ForeignIncome {
  country: string;
  foreignWages: number;
  foreignTaxPaid: number;
  excludedUnderFEIE: boolean;    // Foreign Earned Income Exclusion (Form 2555)
  housingExclusion?: number;
}

export interface StudentLoanInterest {
  interestPaid: number;          // From Form 1098-E
}

export interface TuitionEducation {
  institutionName: string;
  qualifiedExpenses: number;     // From Form 1098-T
  scholarships: number;
  halfTimeOrMore: boolean;
  firstFourYears: boolean;       // For American Opportunity Credit
}

export interface HomeOwnership {
  mortgageInterest: number;      // From Form 1098
  pointsPaid?: number;
  mortgageInsurancePremiums?: number;
  propertyTaxes: number;
  isFirstHome?: boolean;
  proceeds?: number;             // If sold
  costBasis?: number;
  yearsLivedIn?: number;
}

export interface CharitableContributions {
  cashContributions: number;
  nonCashContributions: number;  // Requires Form 8283 if > $500
  carryoverFromPrior?: number;
}

export interface MedicalExpenses {
  totalMedicalExpenses: number;
  // Only deductible above 7.5% of AGI
}

export interface RetirementContributions {
  traditionalIRA: number;
  rothIRA: number;
  sep_ira: number;
  simple_ira: number;
  solo401k_traditional: number;
  solo401k_roth: number;
  hsa: number;                   // Health Savings Account
  fsaDependentCare: number;      // Flexible Spending Account
}

export interface DependentInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  relationship: string;
  monthsLived: number;
  fullTimeStudent: boolean;
  disabled: boolean;
  childTaxCreditEligible: boolean;
  eitcEligible: boolean;
  ctcQualifyingChild: boolean;
}

// ─── Full Tax Return Input ───────────────────────────────────────────────────

export interface TaxReturnInput {
  // Taxpayer info
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth: string;
  occupation: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;

  // Spouse (if MFJ or MFS)
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseSsn?: string;
  spouseDateOfBirth?: string;
  spouseOccupation?: string;
  spouseDeceased?: boolean;

  filingStatus: FilingStatus;
  residencyStatus: ResidencyStatus;
  stateOfResidence?: StateCode;

  // Dependents
  dependents: DependentInfo[];

  // Income sources
  w2Income: W2Income[];
  form1099NEC: Form1099NEC[];
  form1099MISC: Form1099MISC[];
  form1099DIV: Form1099DIV[];
  form1099INT: Form1099INT[];
  form1099B: Form1099B[];
  form1099R: Form1099R[];
  form1099G: Form1099G[];
  form1042S: Form1042S[];
  socialSecurity?: SocialSecurityBenefits;
  scheduleC: ScheduleCBusiness[];
  rentalProperties: RentalProperty[];
  capitalAssetSales: CapitalAssetSale[];
  foreignIncome?: ForeignIncome;

  // Adjustments to income
  educatorExpenses?: number;      // Above-the-line deduction, max $300 ($600 MFJ if both educators)
  studentLoanInterest?: StudentLoanInterest;
  tuitionEducation: TuitionEducation[];
  retirementContributions: RetirementContributions;
  alimonyPaid?: number;          // Pre-2019 divorce agreements
  alimonySSN?: string;
  earlyWithdrawalPenalties?: number;
  selfEmployedHealthInsurance?: number;

  // Deductions
  itemize: boolean;              // true = Schedule A, false = standard deduction
  homeOwnership?: HomeOwnership;
  charitableContributions?: CharitableContributions;
  medicalExpenses?: MedicalExpenses;
  unreimbursedEmployeeExpenses?: number; // Form 2106
  stateLocalTaxes?: number;     // SALT (capped at $10,000)
  casualtyLosses?: number;       // Federally declared disaster only

  // Credits
  childCareExpenses?: number;
  childCareProviderEIN?: string;
  energyCredits?: number;        // Form 5695
  electricVehicleCredit?: boolean;
  adoptionExpenses?: number;

  // Other payments / refundable credits
  estimatedTaxPayments: number;  // Quarterly estimates paid
  priorYearOverpaymentApplied?: number;
  earnedIncomeTaxCredit?: boolean; // Calculated automatically

  // State-specific
  stateTaxInfo?: StateTaxInput;

  // Preferences
  directDepositRouting?: string;
  directDepositAccount?: string;
  directDepositType?: "checking" | "savings";
  applyOverpaymentToNextYear?: boolean;
}

export interface StateTaxInput {
  state: StateCode;
  residencyStatus: ResidencyStatus;
  partYearFromDate?: string;
  partYearToDate?: string;
  // CA-specific
  caRenterCredit?: boolean;
  caYoungChildCredit?: boolean;
  // PA-specific
  paLocalEIT?: number;
  paSchoolDistrict?: string;
  paLocalWithheld?: number;
}

// ─── Calculated Results ──────────────────────────────────────────────────────

export interface FederalTaxResult {
  // Income
  totalWages: number;
  totalInterest: number;
  totalDividends: number;
  qualifiedDividends: number;
  totalCapitalGains: number;
  longTermCapitalGains: number;
  shortTermCapitalGains: number;
  iRADistributions: number;
  pensionAnnuities: number;
  scheduleCNetProfit: number;
  scheduleENetIncome: number;
  socialSecurityTaxable: number;
  otherIncome: number;
  totalIncome: number;

  // Adjustments
  totalAdjustments: number;
  adjustedGrossIncome: number;

  // Deductions
  standardOrItemizedDeduction: number;
  isItemized: boolean;
  qualifiedBusinessIncomeDeduction: number; // Section 199A
  totalDeductions: number;
  taxableIncome: number;

  // Tax
  regularTax: number;
  qualifiedDividendsTax: number;
  alternativeMinimumTax: number;
  netInvestmentIncomeTax: number;   // 3.8% on NIIT
  selfEmploymentTax: number;
  additionalMedicareTax: number;    // 0.9% above threshold
  totalTax: number;

  // Credits
  childTaxCredit: number;
  earnedIncomeCredit: number;
  childCareCredit: number;
  educationCredits: number;
  foreignTaxCredit: number;
  retirementSaverCredit: number;
  premiumTaxCredit: number;
  otherCredits: number;
  totalCredits: number;

  // Payments
  totalWithheld: number;
  estimatedTaxPaid: number;
  refundableCredits: number;
  totalPayments: number;

  // Bottom line
  totalOwed: number;
  refund: number;
  amountDue: number;
  underpaymentPenalty?: number;
  capitalLossCarryforward?: number; // Amount carried forward to future years (exceeds $3k limit)
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface StateTaxResult {
  state: StateCode;
  taxableIncome: number;
  stateTax: number;
  stateWithheld: number;
  stateCredits: number;
  refund: number;
  amountDue: number;
  effectiveTaxRate: number;
}

export interface TaxCalculationResult {
  taxYear: number;
  federal: FederalTaxResult;
  state?: StateTaxResult;
  formsRequired: string[];
  warnings: string[];
  filingInstructions: FilingInstruction[];
}

export interface FilingInstruction {
  form: string;
  title: string;
  deadline: string;
  mailTo?: string;
  efileAvailable: boolean;
  notes: string[];
}
