import type { FilingStatus } from '../types';
import { STANDARD_DEDUCTION } from '../constants/tax2026';

/**
 * Determine the deduction amount and type to use
 */
export function calculateDeduction(
  filingStatus: FilingStatus,
  useItemized: boolean,
  itemizedAmount?: number
): {
  amount: number;
  type: 'standard' | 'itemized';
  explanation: string;
} {
  const standardAmount = STANDARD_DEDUCTION[filingStatus];

  if (!useItemized || !itemizedAmount) {
    return {
      amount: standardAmount,
      type: 'standard',
      explanation: `Using the standard deduction of $${standardAmount.toLocaleString()} for ${getFilingStatusLabel(filingStatus)} filers.`,
    };
  }

  // Compare and use the larger
  if (itemizedAmount > standardAmount) {
    return {
      amount: itemizedAmount,
      type: 'itemized',
      explanation: `Using itemized deductions of $${itemizedAmount.toLocaleString()}, which exceeds the standard deduction of $${standardAmount.toLocaleString()}.`,
    };
  } else {
    return {
      amount: standardAmount,
      type: 'standard',
      explanation: `Using the standard deduction of $${standardAmount.toLocaleString()} because it exceeds your itemized deductions of $${itemizedAmount.toLocaleString()}.`,
    };
  }
}

/**
 * Get the standard deduction amount for a filing status
 */
export function getStandardDeduction(filingStatus: FilingStatus): number {
  return STANDARD_DEDUCTION[filingStatus];
}

/**
 * Get filing status label
 */
function getFilingStatusLabel(filingStatus: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    single: 'Single',
    mfj: 'Married Filing Jointly',
    mfs: 'Married Filing Separately',
    hoh: 'Head of Household',
  };
  return labels[filingStatus];
}

/**
 * Calculate Adjusted Gross Income (AGI)
 * For this tool, we're focused on retirement income sources,
 * so AGI is relatively straightforward.
 */
export function calculateAGI(
  traditionalWithdrawal: number,
  taxableWithdrawal: number, // Gains portion only
  socialSecurityTaxable: number,
  otherIncome: number = 0
): number {
  // Traditional withdrawal is fully taxable as ordinary income
  // Taxable account: gains portion is capital gains (separate calculation)
  // Social Security: only the taxable portion is included
  // Roth withdrawals: not included in AGI

  return traditionalWithdrawal + taxableWithdrawal + socialSecurityTaxable + otherIncome;
}
