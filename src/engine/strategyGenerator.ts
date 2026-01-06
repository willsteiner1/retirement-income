import type {
  Portfolio,
  IncomeGoal,
  WithdrawalStrategy,
  FilingStatus,
  TaxBreakdown,
} from '../types';
import { calculateTaxBreakdown } from './calculateTax';
import { calculateDeduction } from './deductions';
import { calculateSocialSecurityTaxable } from './socialSecurity';
import { calculateRMD } from './rmd';
import { FEDERAL_BRACKETS, CAPITAL_GAINS_BRACKETS } from '../constants/tax2026';
import { formatCurrency } from '../utils/formatters';

/**
 * Generate a tax-efficient withdrawal strategy to meet an income goal.
 *
 * Strategy priorities:
 * 1. Include Social Security (it's "forced" income)
 * 2. Fill lower tax brackets with traditional withdrawals
 * 3. Harvest capital gains at 0% rate when possible
 * 4. Use Roth for remaining needs (tax-free)
 * 5. If more is needed, continue with traditional (higher brackets)
 */
export function generateStrategy(
  portfolio: Portfolio,
  goal: IncomeGoal
): WithdrawalStrategy {
  const { targetType, amount: targetAmount, filingStatus } = goal;

  // Get available balances
  const traditionalAvailable = portfolio.traditional?.balance ?? 0;
  const taxableAvailable = portfolio.taxable?.balance ?? 0;
  const rothAvailable = portfolio.roth?.balance ?? 0;
  const ssAnnual = portfolio.socialSecurity?.annualBenefit ?? 0;
  const pensionAnnual = portfolio.pension?.annualBenefit ?? 0;

  // Calculate RMD (Required Minimum Distribution) if applicable
  const priorYearBalance = portfolio.traditional?.priorYearEndBalance ?? traditionalAvailable;
  const rmdInfo = calculateRMD(goal.primaryAge, priorYearBalance);
  const rmdRequired = rmdInfo.amount;

  // Calculate deduction for bracket planning
  const deduction = calculateDeduction(
    filingStatus,
    goal.useItemizedDeductions,
    goal.itemizedAmount
  ).amount;

  // Start with Social Security and Pension (they're "forced" income) and RMD (if required)
  let socialSecurityIncome = ssAnnual;
  let pensionIncome = pensionAnnual;
  let traditionalWithdrawal = rmdRequired; // Start with RMD as minimum
  let taxableWithdrawal = 0;
  let rothWithdrawal = 0;

  // Helper to calculate current SS taxable based on current withdrawals
  // Note: Pension counts as "other income" for SS taxation purposes
  const getCurrentSSTaxable = (traditionalAmt: number, capGains: number) => {
    const otherIncome = traditionalAmt + capGains + pensionAnnual;
    return calculateSocialSecurityTaxable(ssAnnual, otherIncome, 0, filingStatus).taxableAmount;
  };

  // Determine target gross income
  let targetGross: number;
  if (targetType === 'gross') {
    targetGross = targetAmount;
  } else {
    // After-tax target - need to estimate gross
    // Start with a rough multiplier and refine
    targetGross = estimateGrossForAfterTax(targetAmount, filingStatus, deduction);
  }

  // Remaining income needed after Social Security, Pension, and RMD
  let remainingNeeded = targetGross - ssAnnual - pensionAnnual - rmdRequired;

  // Strategy 1: Fill lower brackets with traditional withdrawals
  // Get the brackets we want to fill
  const bracketsToFill = getLowBrackets(filingStatus);

  for (const bracket of bracketsToFill) {
    if (remainingNeeded <= 0) break;
    if (traditionalWithdrawal >= traditionalAvailable) break;

    // Recalculate SS taxable with current traditional withdrawal
    // This is important because SS taxation depends on other income
    const currentSSTaxable = getCurrentSSTaxable(traditionalWithdrawal, 0);

    // How much room in this bracket?
    // Need to account for deduction and SS taxable portion
    const currentTaxableOrdinary = traditionalWithdrawal + currentSSTaxable - deduction;
    const bracketRoom = Math.max(0, bracket.max - Math.max(0, currentTaxableOrdinary));

    if (bracketRoom > 0) {
      // How much traditional can we add?
      // Note: Adding $1 traditional may increase SS taxable by up to $0.85
      // So we need to be conservative about how much room we actually have
      const ssMultiplier = currentSSTaxable > 0 ? 1.85 : 1.5; // Account for SS taxation interaction
      const effectiveRoom = bracketRoom / ssMultiplier;

      const additionalTraditional = Math.min(
        effectiveRoom,
        remainingNeeded,
        traditionalAvailable - traditionalWithdrawal
      );

      traditionalWithdrawal += additionalTraditional;
      remainingNeeded -= additionalTraditional;
    }
  }

  // Recalculate SS taxable with final traditional amount
  const finalSSTaxable = getCurrentSSTaxable(traditionalWithdrawal, 0);

  // Strategy 2: Harvest 0% capital gains if available
  if (remainingNeeded > 0 && taxableAvailable > 0) {
    const zeroCapGainsBracket = CAPITAL_GAINS_BRACKETS[filingStatus][0];
    const currentTaxableIncome = traditionalWithdrawal + finalSSTaxable - deduction;

    if (currentTaxableIncome < zeroCapGainsBracket.max) {
      const zeroRateRoom = zeroCapGainsBracket.max - Math.max(0, currentTaxableIncome);

      // Calculate gains ratio for this account
      const gainsRatio = portfolio.taxable
        ? (portfolio.taxable.balance - portfolio.taxable.costBasis) / portfolio.taxable.balance
        : 0.4; // Default assumption

      // How much can we withdraw while keeping gains in 0% bracket?
      const maxGainsAt0Pct = zeroRateRoom;
      const maxWithdrawalFor0Pct = gainsRatio > 0 ? maxGainsAt0Pct / gainsRatio : taxableAvailable;

      const taxableNeeded = Math.min(
        remainingNeeded,
        taxableAvailable,
        maxWithdrawalFor0Pct
      );

      taxableWithdrawal = taxableNeeded;
      remainingNeeded -= taxableNeeded;
    }
  }

  // Strategy 3: Use Roth for remaining (tax-free)
  if (remainingNeeded > 0 && rothAvailable > 0) {
    const rothNeeded = Math.min(remainingNeeded, rothAvailable);
    rothWithdrawal = rothNeeded;
    remainingNeeded -= rothNeeded;
  }

  // Strategy 4: If still need more, use more traditional (higher brackets)
  if (remainingNeeded > 0 && traditionalWithdrawal < traditionalAvailable) {
    const additionalTraditional = Math.min(
      remainingNeeded,
      traditionalAvailable - traditionalWithdrawal
    );
    traditionalWithdrawal += additionalTraditional;
    remainingNeeded -= additionalTraditional;
  }

  // Strategy 5: Use taxable if still needed
  if (remainingNeeded > 0 && taxableWithdrawal < taxableAvailable) {
    const additionalTaxable = Math.min(
      remainingNeeded,
      taxableAvailable - taxableWithdrawal
    );
    taxableWithdrawal += additionalTaxable;
    remainingNeeded -= additionalTaxable;
  }

  // Round all values, ensure traditional meets RMD minimum
  const strategy: WithdrawalStrategy = {
    traditionalWithdrawal: Math.max(Math.round(traditionalWithdrawal), rmdRequired),
    taxableWithdrawal: Math.round(taxableWithdrawal),
    rothWithdrawal: Math.round(rothWithdrawal),
    socialSecurityIncome: Math.round(socialSecurityIncome),
    pensionIncome: Math.round(pensionIncome),
    rmdAmount: rmdRequired,
    isSystemGenerated: true,
  };

  // If targeting after-tax, refine the strategy
  if (targetType === 'afterTax') {
    return refineForAfterTaxTarget(strategy, portfolio, goal);
  }

  return strategy;
}

/**
 * Get low tax brackets worth filling (10% and 12%)
 */
function getLowBrackets(filingStatus: FilingStatus): { max: number; rate: number }[] {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  // Return brackets with rates <= 12%
  return brackets
    .filter(b => b.rate <= 0.12)
    .map(b => ({ max: b.max, rate: b.rate }));
}

/**
 * Estimate gross income needed for a target after-tax amount
 */
function estimateGrossForAfterTax(
  afterTaxTarget: number,
  filingStatus: FilingStatus,
  deduction: number
): number {
  // Use an iterative approach
  let gross = afterTaxTarget;

  for (let i = 0; i < 10; i++) {
    const taxableIncome = Math.max(0, gross - deduction);
    const estimatedTax = estimateOrdinaryTax(taxableIncome, filingStatus);
    const afterTax = gross - estimatedTax;

    if (Math.abs(afterTax - afterTaxTarget) < 500) {
      break;
    }

    // Adjust gross
    gross += (afterTaxTarget - afterTax);
  }

  return gross;
}

/**
 * Quick tax estimate for planning purposes
 */
function estimateOrdinaryTax(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = FEDERAL_BRACKETS[filingStatus];
  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketSize = bracket.max - bracket.min;
    const incomeInBracket = Math.min(remaining, bracketSize);
    tax += incomeInBracket * bracket.rate;
    remaining -= incomeInBracket;
  }

  return tax;
}

/**
 * Refine strategy to hit after-tax target more precisely
 */
function refineForAfterTaxTarget(
  initialStrategy: WithdrawalStrategy,
  portfolio: Portfolio,
  goal: IncomeGoal
): WithdrawalStrategy {
  let strategy = { ...initialStrategy };
  const targetAfterTax = goal.amount;

  // Calculate current after-tax
  let breakdown = calculateTaxBreakdown(strategy, portfolio, goal);
  let iterations = 0;
  const maxIterations = 15;

  while (iterations < maxIterations) {
    const difference = targetAfterTax - breakdown.afterTaxIncome;

    if (Math.abs(difference) < 500) {
      // Close enough
      break;
    }

    // Adjust withdrawals
    // Prefer Roth adjustments since they don't affect tax
    if (difference > 0) {
      // Need more income
      const rothAvailable = (portfolio.roth?.balance ?? 0) - strategy.rothWithdrawal;
      const traditionalAvailable = (portfolio.traditional?.balance ?? 0) - strategy.traditionalWithdrawal;
      const taxableAvailable = (portfolio.taxable?.balance ?? 0) - strategy.taxableWithdrawal;

      if (rothAvailable > 0) {
        strategy.rothWithdrawal = Math.min(
          strategy.rothWithdrawal + Math.abs(difference),
          portfolio.roth?.balance ?? 0
        );
      } else if (traditionalAvailable > 0) {
        // Need to add more than the difference to account for tax
        const adjustment = Math.abs(difference) * 1.25; // Rough tax adjustment
        strategy.traditionalWithdrawal = Math.min(
          strategy.traditionalWithdrawal + adjustment,
          portfolio.traditional?.balance ?? 0
        );
      } else if (taxableAvailable > 0) {
        const adjustment = Math.abs(difference) * 1.15;
        strategy.taxableWithdrawal = Math.min(
          strategy.taxableWithdrawal + adjustment,
          portfolio.taxable?.balance ?? 0
        );
      }
    } else {
      // Need less income - reduce from least tax-efficient first
      // But never reduce traditional below RMD requirement
      const minTraditional = strategy.rmdAmount;
      if (strategy.traditionalWithdrawal > minTraditional) {
        const reduction = Math.min(
          Math.abs(difference) * 0.8,
          strategy.traditionalWithdrawal - minTraditional
        );
        strategy.traditionalWithdrawal -= reduction;
      } else if (strategy.taxableWithdrawal > 0) {
        const reduction = Math.min(
          Math.abs(difference) * 0.9,
          strategy.taxableWithdrawal
        );
        strategy.taxableWithdrawal -= reduction;
      } else if (strategy.rothWithdrawal > 0) {
        const reduction = Math.min(
          Math.abs(difference),
          strategy.rothWithdrawal
        );
        strategy.rothWithdrawal -= reduction;
      }
    }

    // Round values, ensure traditional stays at or above RMD
    strategy.traditionalWithdrawal = Math.max(Math.round(strategy.traditionalWithdrawal), strategy.rmdAmount);
    strategy.taxableWithdrawal = Math.round(strategy.taxableWithdrawal);
    strategy.rothWithdrawal = Math.round(strategy.rothWithdrawal);

    // Recalculate
    breakdown = calculateTaxBreakdown(strategy, portfolio, goal);
    iterations++;
  }

  return strategy;
}

/**
 * Validate a withdrawal strategy against portfolio constraints
 */
export function validateStrategy(
  strategy: WithdrawalStrategy,
  portfolio: Portfolio
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (strategy.traditionalWithdrawal > (portfolio.traditional?.balance ?? 0)) {
    errors.push('Traditional withdrawal exceeds available balance');
  }

  if (strategy.taxableWithdrawal > (portfolio.taxable?.balance ?? 0)) {
    errors.push('Taxable withdrawal exceeds available balance');
  }

  if (strategy.rothWithdrawal > (portfolio.roth?.balance ?? 0)) {
    errors.push('Roth withdrawal exceeds available balance');
  }

  if (strategy.socialSecurityIncome > (portfolio.socialSecurity?.annualBenefit ?? 0)) {
    errors.push('Social Security income exceeds annual benefit');
  }

  if (strategy.pensionIncome > (portfolio.pension?.annualBenefit ?? 0)) {
    errors.push('Pension income exceeds annual benefit');
  }

  // Check RMD is satisfied
  if (strategy.rmdAmount > 0 && strategy.traditionalWithdrawal < strategy.rmdAmount) {
    errors.push(`Traditional withdrawal must be at least ${formatCurrency(strategy.rmdAmount)} to satisfy your Required Minimum Distribution`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a brief explanation of why this strategy was chosen
 */
export function explainStrategy(
  strategy: WithdrawalStrategy,
  breakdown: TaxBreakdown
): string[] {
  const explanations: string[] = [];

  // RMD explanation first (it's a requirement)
  if (strategy.rmdAmount > 0) {
    explanations.push(
      `Includes ${formatCurrency(strategy.rmdAmount)} Required Minimum Distribution from Traditional accounts.`
    );
  }

  if (strategy.traditionalWithdrawal > 0) {
    if (strategy.traditionalWithdrawal > strategy.rmdAmount) {
      explanations.push(
        `Traditional withdrawal fills lower tax brackets (up to ${breakdown.marginalOrdinaryRate.toFixed(0)}% marginal rate).`
      );
    }
  }

  if (strategy.taxableWithdrawal > 0) {
    if (breakdown.capitalGainsRate <= 15) {
      explanations.push(
        `Taxable account withdrawal benefits from ${breakdown.capitalGainsRate.toFixed(0)}% capital gains rate.`
      );
    }
  }

  if (strategy.rothWithdrawal > 0) {
    explanations.push(
      'Roth withdrawal provides tax-free income, preserving tax-deferred growth in other accounts.'
    );
  }

  if (breakdown.effectiveRate < 0.15) {
    explanations.push(
      `Overall effective tax rate of ${(breakdown.effectiveRate * 100).toFixed(1)}% achieved through strategic withdrawal sequencing.`
    );
  }

  return explanations;
}
