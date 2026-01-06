import type { FilingStatus, TaxBracket, BracketFill, IncomeSource } from '../types';
import { FEDERAL_BRACKETS } from '../constants/tax2026';

/**
 * Calculate federal income tax on ordinary income using progressive brackets.
 * Returns the total tax and a breakdown of how income fills each bracket.
 */
export function calculateOrdinaryIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
  incomeSources: IncomeSource[] = []
): { tax: number; bracketFill: BracketFill[]; marginalRate: number } {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  let remainingIncome = Math.max(0, taxableIncome);
  let totalTax = 0;
  const bracketFill: BracketFill[] = [];
  let marginalRate = 0;

  // Track which sources fill each bracket (proportionally)
  const totalSourceAmount = incomeSources.reduce((sum, s) => sum + s.amount, 0);

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketSize = bracket.max - bracket.min;
    const incomeInBracket = Math.min(remainingIncome, bracketSize);
    const taxFromBracket = incomeInBracket * bracket.rate;

    // Distribute sources proportionally into this bracket
    const bracketSources: IncomeSource[] = [];
    if (incomeSources.length > 0 && totalSourceAmount > 0) {
      for (const source of incomeSources) {
        const proportion = source.amount / totalSourceAmount;
        const sourceAmountInBracket = incomeInBracket * proportion;
        if (sourceAmountInBracket > 0) {
          bracketSources.push({
            ...source,
            amount: sourceAmountInBracket,
          });
        }
      }
    }

    bracketFill.push({
      rate: bracket.rate * 100, // Convert to percentage for display
      bracketMin: bracket.min,
      bracketMax: bracket.max,
      incomeInBracket,
      taxFromBracket,
      sources: bracketSources,
    });

    totalTax += taxFromBracket;
    remainingIncome -= incomeInBracket;

    // Track marginal rate (the rate of the highest bracket used)
    if (incomeInBracket > 0) {
      marginalRate = bracket.rate;
    }
  }

  return {
    tax: totalTax,
    bracketFill,
    marginalRate,
  };
}

/**
 * Find which bracket a given taxable income falls into
 */
export function findMarginalBracket(
  taxableIncome: number,
  filingStatus: FilingStatus
): TaxBracket {
  const brackets = FEDERAL_BRACKETS[filingStatus];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.max) {
      return bracket;
    }
  }

  // If income exceeds all brackets, return the top bracket
  return brackets[brackets.length - 1];
}

/**
 * Calculate how much more income can fit in a given bracket
 */
export function getRoomInBracket(
  currentTaxableIncome: number,
  targetRate: number,
  filingStatus: FilingStatus
): number {
  const brackets = FEDERAL_BRACKETS[filingStatus];

  for (const bracket of brackets) {
    if (bracket.rate * 100 === targetRate) {
      if (currentTaxableIncome < bracket.max) {
        return Math.max(0, bracket.max - currentTaxableIncome);
      }
      return 0;
    }
  }

  return 0;
}

/**
 * Get all bracket thresholds for a filing status
 */
export function getBracketThresholds(filingStatus: FilingStatus): { rate: number; threshold: number }[] {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  return brackets.map(b => ({
    rate: b.rate * 100,
    threshold: b.max === Infinity ? b.min : b.max,
  }));
}
