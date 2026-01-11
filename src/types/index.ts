// Filing status options
export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

// Account types with tax character
export interface TaxableAccount {
  type: 'taxable';
  balance: number;
  costBasis: number;        // For capital gains calculation
  unrealizedGains: number;  // balance - costBasis
}

export interface TraditionalAccount {
  type: 'traditional';      // 401k or IRA (pre-tax)
  balance: number;
  priorYearEndBalance?: number; // For RMD calculation (defaults to balance if not set)
}

export interface RothAccount {
  type: 'roth';
  balance: number;
}

export interface SocialSecurityIncome {
  type: 'socialSecurity';
  annualBenefit: number;
}

export interface PensionIncome {
  type: 'pension';
  annualBenefit: number;
  cola: number;  // Annual COLA percentage (e.g., 0.02 for 2%)
}

export interface Portfolio {
  taxable: TaxableAccount | null;
  traditional: TraditionalAccount | null;
  roth: RothAccount | null;
  socialSecurity: SocialSecurityIncome | null;
  pension: PensionIncome | null;
}

// State tax input method
export type StateTaxMethod = 'none' | 'rate' | 'fixed';

// Goal definition
export interface IncomeGoal {
  targetType: 'afterTax' | 'gross';
  amount: number;
  filingStatus: FilingStatus;
  primaryAge: number;
  spouseAge?: number;
  useItemizedDeductions: boolean;
  itemizedAmount?: number;
  // State tax options
  stateTaxMethod: StateTaxMethod;
  stateTaxRate?: number;      // As decimal (e.g., 0.055 for 5.5%)
  stateTaxFixedAmount?: number;
  // Planning horizon
  planningHorizon: number;    // End age for multi-year planning (e.g., 95)
}

// Withdrawal strategy (system-proposed or user-modified)
export interface WithdrawalStrategy {
  traditionalWithdrawal: number;
  taxableWithdrawal: number;
  rothWithdrawal: number;
  socialSecurityIncome: number;
  pensionIncome: number;
  rmdAmount: number;              // Required minimum distribution (included in traditionalWithdrawal)
  isSystemGenerated: boolean;
}

// RMD calculation result
export interface RMDInfo {
  isRequired: boolean;
  amount: number;
  age: number;
  priorYearBalance: number;
  distributionPeriod: number;
}

// Tax character for income sources
export type TaxCharacter = 'ordinary' | 'capitalGains' | 'taxFree' | 'partiallyTaxable';

// Income source with full traceability
export interface IncomeSource {
  account: 'traditional' | 'taxable' | 'roth' | 'socialSecurity' | 'pension';
  amount: number;
  taxCharacter: TaxCharacter;
  description: string;  // Human-readable description
}

// How income fills a specific bracket
export interface BracketFill {
  rate: number;              // 10, 12, 22, etc. (as percentage)
  bracketMin: number;        // Bracket start
  bracketMax: number;        // Bracket end
  incomeInBracket: number;   // Amount filling this bracket
  taxFromBracket: number;    // Tax generated from this bracket
  sources: IncomeSource[];   // Which dollars came from which accounts
}

// Tax calculation result - full traceability
export interface TaxBreakdown {
  // Income by source
  ordinaryIncome: number;           // Traditional withdrawals
  qualifiedDividends: number;       // From taxable account (if applicable)
  longTermCapitalGains: number;     // From taxable withdrawal
  socialSecurityGross: number;      // Full SS benefit
  socialSecurityTaxable: number;    // Taxable portion (0%, 50%, or 85%)
  pensionGross: number;             // Full pension benefit
  pensionTaxable: number;           // Taxable portion (100% ordinary income)
  rothIncome: number;               // Tax-free

  // Total income
  grossIncome: number;

  // Tax calculations
  adjustedGrossIncome: number;
  deductions: number;
  deductionType: 'standard' | 'itemized';
  taxableIncome: number;

  // Tax by type
  ordinaryIncomeTax: number;
  capitalGainsTax: number;
  stateTax: number;

  // Bracket fill (for visualization)
  bracketFill: BracketFill[];

  // Capital gains bracket info
  capitalGainsRate: number;
  capitalGainsBracket: {
    rate: number;
    threshold: number;
  };

  // Results
  totalTax: number;
  afterTaxIncome: number;
  effectiveRate: number;           // Tax / Gross income (what % of total money received goes to tax)
  effectiveRateOnAGI: number;      // Tax / AGI (rate on income that "counts")
  effectiveRateOnTaxable: number;  // Tax / Taxable income (rate on income actually subject to tax)
  marginalOrdinaryRate: number;
  marginalCapGainsRate: number;

  // RMD tracking
  rmdAmount: number;               // Required minimum distribution for the year
  rmdIsSatisfied: boolean;         // Whether traditional withdrawal meets RMD
}

// Tax bracket definition
export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

// Application state for the workflow
export type WorkflowStep = 'goal' | 'plan' | 'narrative';

export type ViewMode = 'advisor' | 'client';

// Goal form draft (string values for form persistence)
export interface GoalFormDraft {
  targetAmount: string;
  targetType: 'afterTax' | 'gross';
  primaryAge: string;
  spouseAge: string;
  planningHorizon: string;
  filingStatus: FilingStatus;
  traditionalBalance: string;
  taxableBalance: string;
  taxableUnrealizedGains: string;
  rothBalance: string;
  ssEnabled: boolean;
  ssStartAge: string;
  ssAnnualBenefit: string;
  spouseSsEnabled: boolean;
  spouseSsStartAge: string;
  spouseSsAnnualBenefit: string;
  pensionEnabled: boolean;
  pensionStartAge: string;
  pensionAnnualBenefit: string;
  stateTaxMethod: StateTaxMethod;
  stateTaxRate: string;
  stateTaxFixed: string;
}

// Main application state
export interface AppState {
  currentStep: WorkflowStep;
  viewMode: ViewMode;
  portfolio: Portfolio;
  goal: IncomeGoal | null;
  strategy: WithdrawalStrategy | null;
  taxBreakdown: TaxBreakdown | null;
  goalFormDraft: GoalFormDraft | null;
}

// Action types for reducer
export type AppAction =
  | { type: 'SET_STEP'; step: WorkflowStep }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'SET_GOAL'; goal: IncomeGoal }
  | { type: 'SET_STRATEGY'; strategy: WithdrawalStrategy }
  | { type: 'SET_TAX_BREAKDOWN'; breakdown: TaxBreakdown }
  | { type: 'SET_GOAL_FORM_DRAFT'; draft: GoalFormDraft }
  | { type: 'RESET' };

// ============================================
// Multi-Year Projection Types
// ============================================

// Growth rate assumptions for projections
export interface ProjectionAssumptions {
  growthRate: number;           // e.g., 0.05 for 5% (applies to all accounts)
  inflationRate: number;        // e.g., 0.025 for 2.5%
  socialSecurityCOLA: number;   // e.g., 0.02 for 2%
}

// Single year in projection
export interface ProjectionYear {
  year: number;
  age: number;
  balances: {
    traditional: number;
    taxable: number;
    roth: number;
    total: number;
  };
  rmdAmount: number;
  withdrawals: {
    traditional: number;
    taxable: number;
    roth: number;
    socialSecurity: number;
    pension: number;
    total: number;
  };
  taxes: {
    federal: number;
    state: number;
    total: number;
  };
  afterTaxIncome: number;
  effectiveRate: number;
}

// Full projection result
export interface RetirementProjection {
  startAge: number;
  endAge: number;
  assumptions: ProjectionAssumptions;
  years: ProjectionYear[];

  // Summary metrics
  totalTaxesPaid: number;
  totalWithdrawals: number;
  finalPortfolioValue: number;

  // Sustainability
  isSustainable: boolean;
  depletionAge: number | null;  // Age when portfolio runs out (null if sustainable)
}
