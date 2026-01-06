import type { TaxBracket, FilingStatus } from '../types';

export const TAX_YEAR = 2026;

// Federal income tax brackets for 2026
// Source: Tax Foundation, IRS 2026 adjustments
export const FEDERAL_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0, max: 24800, rate: 0.10 },
    { min: 24800, max: 100800, rate: 0.12 },
    { min: 100800, max: 211400, rate: 0.22 },
    { min: 211400, max: 403550, rate: 0.24 },
    { min: 403550, max: 512450, rate: 0.32 },
    { min: 512450, max: 768700, rate: 0.35 },
    { min: 768700, max: Infinity, rate: 0.37 },
  ],
  mfs: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 384350, rate: 0.35 },
    { min: 384350, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17700, rate: 0.10 },
    { min: 17700, max: 67450, rate: 0.12 },
    { min: 67450, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256200, rate: 0.32 },
    { min: 256200, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
};

// Standard deduction amounts for 2026
export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16100,
  mfj: 32200,
  mfs: 16100,
  hoh: 24150,
};

// Long-term capital gains brackets for 2026
// Note: Capital gains are taxed based on taxable income (ordinary + cap gains)
export const CAPITAL_GAINS_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 49450, rate: 0 },
    { min: 49450, max: 545500, rate: 0.15 },
    { min: 545500, max: Infinity, rate: 0.20 },
  ],
  mfj: [
    { min: 0, max: 98900, rate: 0 },
    { min: 98900, max: 613700, rate: 0.15 },
    { min: 613700, max: Infinity, rate: 0.20 },
  ],
  mfs: [
    { min: 0, max: 49450, rate: 0 },
    { min: 49450, max: 306850, rate: 0.15 },
    { min: 306850, max: Infinity, rate: 0.20 },
  ],
  hoh: [
    { min: 0, max: 66200, rate: 0 },
    { min: 66200, max: 579600, rate: 0.15 },
    { min: 579600, max: Infinity, rate: 0.20 },
  ],
};

// Social Security taxation thresholds (based on "provisional income")
// Provisional income = AGI + nontaxable interest + 50% of SS benefits
export const SS_TAXATION_THRESHOLDS: Record<'single' | 'mfj', { zeroThreshold: number; fiftyThreshold: number }> = {
  single: {
    zeroThreshold: 25000,      // Below: 0% of SS is taxable
    fiftyThreshold: 34000,     // Between zero and fifty: up to 50% taxable
    // Above fifty threshold: up to 85% taxable
  },
  mfj: {
    zeroThreshold: 32000,
    fiftyThreshold: 44000,
  },
};

// Net Investment Income Tax (NIIT) - 3.8% surtax
export const NIIT_THRESHOLD: Record<FilingStatus, number> = {
  single: 200000,
  mfj: 250000,
  mfs: 125000,
  hoh: 200000,
};

export const NIIT_RATE = 0.038;

// Filing status labels for UI
export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married Filing Jointly',
  mfs: 'Married Filing Separately',
  hoh: 'Head of Household',
};

// Tax bracket labels for visualization
export const BRACKET_COLORS: Record<number, string> = {
  10: 'bg-bracket-10',
  12: 'bg-bracket-12',
  22: 'bg-bracket-22',
  24: 'bg-bracket-24',
  32: 'bg-bracket-32',
  35: 'bg-bracket-35',
  37: 'bg-bracket-37',
};
