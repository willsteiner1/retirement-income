import type { FilingStatus } from '../types';
import { SS_TAXATION_THRESHOLDS } from '../constants/tax2026';

/**
 * Calculate the taxable portion of Social Security benefits.
 *
 * Social Security taxation is based on "provisional income":
 * Provisional Income = AGI (excluding SS) + Tax-exempt interest + 50% of SS benefits
 *
 * Taxation rules:
 * - Below first threshold: 0% taxable
 * - Between thresholds: Up to 50% taxable
 * - Above second threshold: Up to 85% taxable
 */
export function calculateSocialSecurityTaxable(
  ssBenefits: number,
  otherIncome: number, // AGI excluding SS
  taxExemptInterest: number = 0,
  filingStatus: FilingStatus
): {
  taxableAmount: number;
  taxablePercent: number;
  provisionalIncome: number;
  explanation: string;
} {
  if (ssBenefits <= 0) {
    return {
      taxableAmount: 0,
      taxablePercent: 0,
      provisionalIncome: 0,
      explanation: 'No Social Security benefits to tax.',
    };
  }

  // Get thresholds based on filing status
  // For MFS, HoH - use single thresholds (simplification)
  const thresholds = filingStatus === 'mfj'
    ? SS_TAXATION_THRESHOLDS.mfj
    : SS_TAXATION_THRESHOLDS.single;

  // Calculate provisional income
  const provisionalIncome = otherIncome + taxExemptInterest + (ssBenefits * 0.5);

  let taxableAmount = 0;
  let taxablePercent = 0;
  let explanation = '';

  if (provisionalIncome <= thresholds.zeroThreshold) {
    // Below first threshold: 0% taxable
    taxableAmount = 0;
    taxablePercent = 0;
    explanation = `Your provisional income ($${provisionalIncome.toLocaleString()}) is below the first threshold ($${thresholds.zeroThreshold.toLocaleString()}), so none of your Social Security is taxable.`;
  } else if (provisionalIncome <= thresholds.fiftyThreshold) {
    // Between thresholds: Up to 50% taxable
    // Taxable = min(50% of SS, 50% of excess over first threshold)
    const excessOverFirst = provisionalIncome - thresholds.zeroThreshold;
    taxableAmount = Math.min(ssBenefits * 0.5, excessOverFirst * 0.5);
    taxablePercent = (taxableAmount / ssBenefits) * 100;
    explanation = `Your provisional income ($${provisionalIncome.toLocaleString()}) is between the thresholds, so up to 50% of your Social Security may be taxable. Actual taxable amount: $${taxableAmount.toLocaleString()} (${taxablePercent.toFixed(1)}%).`;
  } else {
    // Above second threshold: Up to 85% taxable
    // Complex formula:
    // Taxable = min(85% of SS,
    //               50% of SS + 85% of (provisional income - second threshold))
    const baseAmount = Math.min(
      ssBenefits * 0.5,
      (thresholds.fiftyThreshold - thresholds.zeroThreshold) * 0.5
    );
    const excessOverSecond = provisionalIncome - thresholds.fiftyThreshold;
    const additionalTaxable = excessOverSecond * 0.85;
    taxableAmount = Math.min(ssBenefits * 0.85, baseAmount + additionalTaxable);
    taxablePercent = (taxableAmount / ssBenefits) * 100;
    explanation = `Your provisional income ($${provisionalIncome.toLocaleString()}) exceeds the second threshold ($${thresholds.fiftyThreshold.toLocaleString()}), so up to 85% of your Social Security is taxable. Actual taxable amount: $${taxableAmount.toLocaleString()} (${taxablePercent.toFixed(1)}%).`;
  }

  return {
    taxableAmount: Math.round(taxableAmount),
    taxablePercent,
    provisionalIncome,
    explanation,
  };
}

/**
 * Get a plain-language explanation of Social Security taxation
 */
export function getSocialSecurityExplanation(
  taxablePercent: number
): string {
  if (taxablePercent === 0) {
    return 'None of your Social Security benefit is subject to federal income tax because your combined income is below the taxable threshold.';
  } else if (taxablePercent <= 50) {
    return `${taxablePercent.toFixed(0)}% of your Social Security benefit is subject to federal income tax. This happens when your combined income falls between the two taxation thresholds.`;
  } else {
    return `${taxablePercent.toFixed(0)}% of your Social Security benefit is subject to federal income tax. This is the maximum taxable percentage, triggered when combined income exceeds the upper threshold.`;
  }
}

/**
 * Estimate how much additional income would push SS taxation to the next tier
 */
export function getSSThresholdRoom(
  currentProvisionalIncome: number,
  filingStatus: FilingStatus
): { toFiftyPercent: number; toEightyFivePercent: number } {
  const thresholds = filingStatus === 'mfj'
    ? SS_TAXATION_THRESHOLDS.mfj
    : SS_TAXATION_THRESHOLDS.single;

  return {
    toFiftyPercent: Math.max(0, thresholds.zeroThreshold - currentProvisionalIncome),
    toEightyFivePercent: Math.max(0, thresholds.fiftyThreshold - currentProvisionalIncome),
  };
}
