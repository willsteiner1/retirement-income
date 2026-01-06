import type {
  FilingStatus,
  WithdrawalStrategy,
  TaxBreakdown,
  Portfolio,
  IncomeSource,
  IncomeGoal,
} from '../types';
import { calculateOrdinaryIncomeTax } from './taxBrackets';
import { calculateCapitalGainsTax, getCapitalGainsRate } from './capitalGains';
import { calculateSocialSecurityTaxable } from './socialSecurity';
import { calculateDeduction } from './deductions';

/**
 * Calculate the complete tax breakdown for a withdrawal strategy.
 * This is the main orchestration function that combines all tax calculations.
 */
export function calculateTaxBreakdown(
  strategy: WithdrawalStrategy,
  portfolio: Portfolio,
  goal: IncomeGoal
): TaxBreakdown {
  const { filingStatus, useItemizedDeductions, itemizedAmount } = goal;
  const {
    traditionalWithdrawal,
    taxableWithdrawal,
    rothWithdrawal,
    socialSecurityIncome,
    pensionIncome,
  } = strategy;

  // Step 1: Calculate capital gains from taxable withdrawal
  // When selling from taxable account, a portion is return of basis (not taxed)
  // and a portion is capital gains
  let longTermCapitalGains = 0;

  if (portfolio.taxable && taxableWithdrawal > 0) {
    const { balance, costBasis } = portfolio.taxable;
    // Proportional calculation: gains ratio of the account
    const gainsRatio = balance > 0 ? (balance - costBasis) / balance : 0;
    longTermCapitalGains = taxableWithdrawal * gainsRatio;
  }

  // Step 2: Calculate taxable Social Security
  // First, we need "other income" for provisional income calculation
  // This includes traditional withdrawal, pension, and capital gains, but NOT Roth
  const otherIncomeForSS = traditionalWithdrawal + pensionIncome + longTermCapitalGains;

  const ssResult = calculateSocialSecurityTaxable(
    socialSecurityIncome,
    otherIncomeForSS,
    0, // tax-exempt interest
    filingStatus
  );

  // Step 3: Calculate total income
  const grossIncome =
    traditionalWithdrawal +
    taxableWithdrawal + // Full withdrawal (basis + gains)
    rothWithdrawal +
    socialSecurityIncome +
    pensionIncome;

  // Step 4: Calculate AGI
  // AGI = Traditional + Pension + Taxable gains (not basis) + SS taxable portion
  // Note: Roth is not included, full taxable withdrawal basis is not income
  const adjustedGrossIncome =
    traditionalWithdrawal +
    pensionIncome + // Pension is 100% taxable as ordinary income
    longTermCapitalGains +
    ssResult.taxableAmount;

  // Step 5: Calculate deduction
  const deductionResult = calculateDeduction(
    filingStatus,
    useItemizedDeductions,
    itemizedAmount
  );

  // Step 6: Calculate taxable income for ordinary income tax
  // Ordinary income = Traditional withdrawal + Pension + SS taxable
  const ordinaryIncome = traditionalWithdrawal + pensionIncome + ssResult.taxableAmount;
  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - deductionResult.amount);

  // Step 7: Build income sources for bracket tracing
  const ordinarySources: IncomeSource[] = [];

  if (traditionalWithdrawal > 0) {
    ordinarySources.push({
      account: 'traditional',
      amount: traditionalWithdrawal,
      taxCharacter: 'ordinary',
      description: 'Traditional 401(k)/IRA withdrawal',
    });
  }

  if (pensionIncome > 0) {
    ordinarySources.push({
      account: 'pension',
      amount: pensionIncome,
      taxCharacter: 'ordinary',
      description: 'Pension income',
    });
  }

  if (ssResult.taxableAmount > 0) {
    ordinarySources.push({
      account: 'socialSecurity',
      amount: ssResult.taxableAmount,
      taxCharacter: 'partiallyTaxable',
      description: `Social Security (${ssResult.taxablePercent.toFixed(0)}% taxable)`,
    });
  }

  // Step 8: Calculate ordinary income tax
  const ordinaryTaxResult = calculateOrdinaryIncomeTax(
    taxableOrdinaryIncome,
    filingStatus,
    ordinarySources
  );

  // Step 9: Calculate capital gains tax
  // Capital gains stack on top of ordinary income for rate determination
  const capGainsResult = calculateCapitalGainsTax(
    longTermCapitalGains,
    taxableOrdinaryIncome,
    filingStatus
  );

  // Step 10: Calculate state tax
  let stateTax = 0;
  if (goal.stateTaxMethod === 'rate' && goal.stateTaxRate) {
    // Apply rate to federal taxable income
    stateTax = (taxableOrdinaryIncome + longTermCapitalGains) * goal.stateTaxRate;
  } else if (goal.stateTaxMethod === 'fixed' && goal.stateTaxFixedAmount) {
    stateTax = goal.stateTaxFixedAmount;
  }

  // Step 11: Total tax and results
  const federalTax = ordinaryTaxResult.tax + capGainsResult.tax;
  const totalTax = federalTax + stateTax;

  // After-tax income = Gross income - Total tax
  // Note: We include full taxable withdrawal (including basis return) in gross
  const afterTaxIncome = grossIncome - totalTax;

  // Effective tax rates from different perspectives
  // 1. On gross income: What % of total money received goes to tax
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  // 2. On AGI: Rate on income that "counts" for tax purposes
  const effectiveRateOnAGI = adjustedGrossIncome > 0 ? totalTax / adjustedGrossIncome : 0;

  // 3. On taxable income: Rate on income actually subject to tax
  const totalTaxableIncome = taxableOrdinaryIncome + longTermCapitalGains;
  const effectiveRateOnTaxable = totalTaxableIncome > 0 ? totalTax / totalTaxableIncome : 0;

  // Get marginal capital gains rate
  const marginalCapGainsRate = getCapitalGainsRate(totalTaxableIncome, filingStatus);

  return {
    // Income by source
    ordinaryIncome,
    qualifiedDividends: 0, // Not implemented for simplicity
    longTermCapitalGains,
    socialSecurityGross: socialSecurityIncome,
    socialSecurityTaxable: ssResult.taxableAmount,
    pensionGross: pensionIncome,
    pensionTaxable: pensionIncome, // 100% taxable as ordinary income
    rothIncome: rothWithdrawal,

    // Total income
    grossIncome,

    // Tax calculations
    adjustedGrossIncome,
    deductions: deductionResult.amount,
    deductionType: deductionResult.type,
    taxableIncome: taxableOrdinaryIncome + longTermCapitalGains,

    // Tax by type
    ordinaryIncomeTax: ordinaryTaxResult.tax,
    capitalGainsTax: capGainsResult.tax,
    stateTax,

    // Bracket fill (for visualization)
    bracketFill: ordinaryTaxResult.bracketFill,

    // Capital gains info
    capitalGainsRate: capGainsResult.effectiveRate * 100,
    capitalGainsBracket: {
      rate: marginalCapGainsRate,
      threshold: totalTaxableIncome,
    },

    // Results
    totalTax,
    afterTaxIncome,
    effectiveRate,
    effectiveRateOnAGI,
    effectiveRateOnTaxable,
    marginalOrdinaryRate: ordinaryTaxResult.marginalRate * 100,
    marginalCapGainsRate,

    // RMD tracking (passed through from strategy)
    rmdAmount: strategy.rmdAmount,
    rmdIsSatisfied: strategy.rmdAmount === 0 || traditionalWithdrawal >= strategy.rmdAmount,
  };
}

/**
 * Quick calculation to estimate tax for a given gross income target.
 * Useful for the strategy generator when working backwards from a goal.
 */
export function estimateTaxForGrossIncome(
  grossTarget: number,
  filingStatus: FilingStatus
): number {
  // Rough estimate using effective tax rate assumptions
  // This is a simplification for strategy generation
  const deduction = calculateDeduction(filingStatus, false).amount;
  const taxableIncome = Math.max(0, grossTarget - deduction);

  const { tax } = calculateOrdinaryIncomeTax(taxableIncome, filingStatus);
  return tax;
}

/**
 * Calculate the gross income needed to achieve a target after-tax income.
 * Uses iterative approach since tax is progressive.
 */
export function calculateGrossForAfterTax(
  afterTaxTarget: number,
  filingStatus: FilingStatus,
  _portfolio: Portfolio,
  maxIterations: number = 20
): number {
  // Start with a rough estimate (after-tax / 0.75 assumes ~25% effective rate)
  let grossEstimate = afterTaxTarget / 0.75;

  for (let i = 0; i < maxIterations; i++) {
    const estimatedTax = estimateTaxForGrossIncome(grossEstimate, filingStatus);
    const calculatedAfterTax = grossEstimate - estimatedTax;
    const difference = afterTaxTarget - calculatedAfterTax;

    if (Math.abs(difference) < 100) {
      // Close enough
      break;
    }

    // Adjust estimate
    grossEstimate += difference;
  }

  return Math.round(grossEstimate);
}
