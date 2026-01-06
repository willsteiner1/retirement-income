import type { FilingStatus } from '../types';
import { CAPITAL_GAINS_BRACKETS, NIIT_THRESHOLD, NIIT_RATE } from '../constants/tax2026';

/**
 * Calculate long-term capital gains tax.
 *
 * Important: Capital gains rates are determined by total taxable income
 * (ordinary income + capital gains), but ordinary income "fills up" the
 * lower brackets first.
 */
export function calculateCapitalGainsTax(
  longTermCapitalGains: number,
  taxableOrdinaryIncome: number,
  filingStatus: FilingStatus
): {
  tax: number;
  effectiveRate: number;
  bracketBreakdown: { rate: number; amount: number; tax: number }[];
} {
  if (longTermCapitalGains <= 0) {
    return { tax: 0, effectiveRate: 0, bracketBreakdown: [] };
  }

  const brackets = CAPITAL_GAINS_BRACKETS[filingStatus];
  let totalTax = 0;
  let remainingGains = longTermCapitalGains;
  const bracketBreakdown: { rate: number; amount: number; tax: number }[] = [];

  // Ordinary income fills brackets first, then capital gains stack on top
  let incomeProcessed = taxableOrdinaryIncome;

  for (const bracket of brackets) {
    if (remainingGains <= 0) break;

    // How much of this bracket is already filled by ordinary income?
    const bracketStart = bracket.min;
    const bracketEnd = bracket.max;

    if (incomeProcessed >= bracketEnd) {
      // This bracket is fully filled by ordinary income, skip it
      continue;
    }

    // Start position for capital gains in this bracket
    const gainsStartInBracket = Math.max(bracketStart, incomeProcessed);
    const roomInBracket = bracketEnd - gainsStartInBracket;
    const gainsInBracket = Math.min(remainingGains, roomInBracket);

    if (gainsInBracket > 0) {
      const taxInBracket = gainsInBracket * bracket.rate;
      totalTax += taxInBracket;
      remainingGains -= gainsInBracket;

      bracketBreakdown.push({
        rate: bracket.rate * 100,
        amount: gainsInBracket,
        tax: taxInBracket,
      });
    }

    incomeProcessed = bracketEnd;
  }

  const effectiveRate = longTermCapitalGains > 0 ? totalTax / longTermCapitalGains : 0;

  return {
    tax: totalTax,
    effectiveRate,
    bracketBreakdown,
  };
}

/**
 * Calculate Net Investment Income Tax (NIIT) - the 3.8% surtax
 * Applies to the lesser of: net investment income OR the amount by which
 * MAGI exceeds the threshold.
 */
export function calculateNIIT(
  netInvestmentIncome: number,
  magi: number,
  filingStatus: FilingStatus
): number {
  const threshold = NIIT_THRESHOLD[filingStatus];
  const excessIncome = Math.max(0, magi - threshold);

  if (excessIncome <= 0) {
    return 0;
  }

  // NIIT applies to the lesser of NII or excess over threshold
  const niitBase = Math.min(netInvestmentIncome, excessIncome);
  return niitBase * NIIT_RATE;
}

/**
 * Get the capital gains rate for a given total taxable income level
 */
export function getCapitalGainsRate(
  totalTaxableIncome: number,
  filingStatus: FilingStatus
): number {
  const brackets = CAPITAL_GAINS_BRACKETS[filingStatus];

  for (const bracket of brackets) {
    if (totalTaxableIncome <= bracket.max) {
      return bracket.rate * 100;
    }
  }

  // Default to highest rate
  return brackets[brackets.length - 1].rate * 100;
}

/**
 * Calculate how much capital gains can be realized at 0% rate
 */
export function getZeroPercentCapGainsRoom(
  taxableOrdinaryIncome: number,
  filingStatus: FilingStatus
): number {
  const brackets = CAPITAL_GAINS_BRACKETS[filingStatus];
  const zeroRateBracket = brackets.find(b => b.rate === 0);

  if (!zeroRateBracket) return 0;

  return Math.max(0, zeroRateBracket.max - taxableOrdinaryIncome);
}
