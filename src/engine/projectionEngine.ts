/**
 * Multi-Year Retirement Projection Engine
 *
 * Projects portfolio balances, withdrawals, taxes, and income from
 * current age through planning horizon. Uses existing strategy generator
 * and tax calculator for each year.
 */

import type {
  Portfolio,
  IncomeGoal,
  ProjectionAssumptions,
  ProjectionYear,
  RetirementProjection,
  WithdrawalStrategy,
  TaxBreakdown,
} from '../types';
import { generateStrategy } from './strategyGenerator';
import { calculateTaxBreakdown } from './calculateTax';

// Default assumptions
export const DEFAULT_ASSUMPTIONS: ProjectionAssumptions = {
  growthRate: 0.05,           // 5% annual growth
  inflationRate: 0.025,       // 2.5% inflation
  socialSecurityCOLA: 0.025,  // SS COLA tracks inflation by default
};

/**
 * Generate a multi-year retirement projection
 *
 * If initialStrategy and initialBreakdown are provided, Year 1 uses those exact values
 * (reflecting the user's current slider adjustments). Subsequent years scale withdrawals
 * based on inflation while respecting RMDs and account constraints.
 */
export function generateRetirementProjection(
  portfolio: Portfolio,
  goal: IncomeGoal,
  assumptions: ProjectionAssumptions = DEFAULT_ASSUMPTIONS,
  initialStrategy?: WithdrawalStrategy,
  initialBreakdown?: TaxBreakdown
): RetirementProjection {
  const startAge = goal.primaryAge;
  const endAge = goal.planningHorizon;
  const currentYear = new Date().getFullYear();

  // Track running balances (copy to avoid mutating original)
  let traditionalBalance = portfolio.traditional?.balance ?? 0;
  let taxableBalance = portfolio.taxable?.balance ?? 0;
  let rothBalance = portfolio.roth?.balance ?? 0;
  let taxableCostBasis = portfolio.taxable?.costBasis ?? 0;
  let socialSecurityBenefit = portfolio.socialSecurity?.annualBenefit ?? 0;
  let pensionBenefit = portfolio.pension?.annualBenefit ?? 0;
  const pensionCola = portfolio.pension?.cola ?? 0;

  // Track cumulative values
  let totalTaxesPaid = 0;
  let totalWithdrawals = 0;
  let depletionAge: number | null = null;

  const years: ProjectionYear[] = [];

  for (let age = startAge; age <= endAge; age++) {
    const yearOffset = age - startAge;
    const year = currentYear + yearOffset;

    // Check if portfolio is depleted
    const totalBalance = traditionalBalance + taxableBalance + rothBalance;
    if (totalBalance <= 0 && depletionAge === null) {
      depletionAge = age;
    }

    // Build portfolio snapshot for this year
    const yearPortfolio: Portfolio = {
      traditional: traditionalBalance > 0 ? {
        type: 'traditional',
        balance: traditionalBalance,
        priorYearEndBalance: traditionalBalance, // Use current as prior year proxy
      } : null,
      taxable: taxableBalance > 0 ? {
        type: 'taxable',
        balance: taxableBalance,
        costBasis: taxableCostBasis,
        unrealizedGains: taxableBalance - taxableCostBasis,
      } : null,
      roth: rothBalance > 0 ? {
        type: 'roth',
        balance: rothBalance,
      } : null,
      socialSecurity: socialSecurityBenefit > 0 ? {
        type: 'socialSecurity',
        annualBenefit: socialSecurityBenefit,
      } : null,
      pension: pensionBenefit > 0 ? {
        type: 'pension',
        annualBenefit: pensionBenefit,
        cola: pensionCola,
      } : null,
    };

    // Adjust income goal for inflation
    const inflationMultiplier = Math.pow(1 + assumptions.inflationRate, yearOffset);
    const adjustedGoal: IncomeGoal = {
      ...goal,
      amount: Math.round(goal.amount * inflationMultiplier),
      primaryAge: age,
      spouseAge: goal.spouseAge ? goal.spouseAge + yearOffset : undefined,
    };

    // Generate strategy and calculate taxes for this year
    let strategy: WithdrawalStrategy;
    let breakdown: TaxBreakdown;

    // Year 1: Use initial strategy if provided (reflects user's slider adjustments)
    const isFirstYear = age === startAge;

    if (isFirstYear && initialStrategy && initialBreakdown) {
      // Use the exact strategy the user configured
      strategy = { ...initialStrategy };
      breakdown = { ...initialBreakdown };
    } else if (totalBalance > 0 || socialSecurityBenefit > 0 || pensionBenefit > 0) {
      // Subsequent years: Generate strategy with inflation-adjusted goal
      strategy = generateStrategy(yearPortfolio, adjustedGoal);
      breakdown = calculateTaxBreakdown(strategy, yearPortfolio, adjustedGoal);
    } else {
      // Portfolio depleted - just Social Security and Pension if any
      strategy = {
        traditionalWithdrawal: 0,
        taxableWithdrawal: 0,
        rothWithdrawal: 0,
        socialSecurityIncome: socialSecurityBenefit,
        pensionIncome: pensionBenefit,
        rmdAmount: 0,
        isSystemGenerated: true,
      };
      breakdown = calculateTaxBreakdown(strategy, yearPortfolio, adjustedGoal);
    }

    // Record this year
    const yearData: ProjectionYear = {
      year,
      age,
      balances: {
        traditional: Math.round(traditionalBalance),
        taxable: Math.round(taxableBalance),
        roth: Math.round(rothBalance),
        total: Math.round(totalBalance),
      },
      rmdAmount: strategy.rmdAmount,
      withdrawals: {
        traditional: strategy.traditionalWithdrawal,
        taxable: strategy.taxableWithdrawal,
        roth: strategy.rothWithdrawal,
        socialSecurity: strategy.socialSecurityIncome,
        pension: strategy.pensionIncome,
        total: strategy.traditionalWithdrawal + strategy.taxableWithdrawal +
               strategy.rothWithdrawal + strategy.socialSecurityIncome + strategy.pensionIncome,
      },
      taxes: {
        federal: breakdown.ordinaryIncomeTax + breakdown.capitalGainsTax,
        state: breakdown.stateTax,
        total: breakdown.totalTax,
      },
      afterTaxIncome: breakdown.afterTaxIncome,
      effectiveRate: breakdown.effectiveRate,
    };

    years.push(yearData);

    // Track cumulative values
    totalTaxesPaid += breakdown.totalTax;
    totalWithdrawals += yearData.withdrawals.total;

    // Apply withdrawals to balances
    traditionalBalance = Math.max(0, traditionalBalance - strategy.traditionalWithdrawal);
    taxableBalance = Math.max(0, taxableBalance - strategy.taxableWithdrawal);
    rothBalance = Math.max(0, rothBalance - strategy.rothWithdrawal);

    // Adjust cost basis proportionally for taxable account
    if (yearPortfolio.taxable && strategy.taxableWithdrawal > 0) {
      const withdrawalRatio = strategy.taxableWithdrawal / yearPortfolio.taxable.balance;
      taxableCostBasis = Math.max(0, taxableCostBasis * (1 - withdrawalRatio));
    }

    // Apply growth to remaining balances (end of year)
    traditionalBalance *= (1 + assumptions.growthRate);
    taxableBalance *= (1 + assumptions.growthRate);
    rothBalance *= (1 + assumptions.growthRate);

    // Cost basis grows with the account (proportionally)
    if (taxableBalance > 0) {
      const gainsPortion = taxableBalance - taxableCostBasis;
      taxableCostBasis += gainsPortion * assumptions.growthRate;
    }

    // Apply COLA to Social Security
    socialSecurityBenefit *= (1 + assumptions.socialSecurityCOLA);

    // Apply COLA to Pension (user-specified rate)
    pensionBenefit *= (1 + pensionCola);
  }

  // Final portfolio value
  const finalPortfolioValue = traditionalBalance + taxableBalance + rothBalance;

  return {
    startAge,
    endAge,
    assumptions,
    years,
    totalTaxesPaid: Math.round(totalTaxesPaid),
    totalWithdrawals: Math.round(totalWithdrawals),
    finalPortfolioValue: Math.round(finalPortfolioValue),
    isSustainable: depletionAge === null,
    depletionAge,
  };
}

/**
 * Get summary years (every 5 years + milestone years)
 */
export function getSummaryYears(projection: RetirementProjection): ProjectionYear[] {
  const milestoneAges = new Set([73, 80, 85, 90, 95, 100]); // RMD start, round ages

  return projection.years.filter((year, index) => {
    // Always include first and last year
    if (index === 0 || index === projection.years.length - 1) {
      return true;
    }

    // Include every 5 years
    if ((year.age - projection.startAge) % 5 === 0) {
      return true;
    }

    // Include milestone ages
    if (milestoneAges.has(year.age)) {
      return true;
    }

    // Include depletion year if applicable
    if (projection.depletionAge === year.age) {
      return true;
    }

    return false;
  });
}

/**
 * Calculate projection statistics for display
 */
export function getProjectionStats(projection: RetirementProjection): {
  averageEffectiveRate: number;
  peakTaxYear: ProjectionYear | null;
  yearsInRetirement: number;
  totalAfterTaxIncome: number;
} {
  const yearsInRetirement = projection.years.length;

  if (yearsInRetirement === 0) {
    return {
      averageEffectiveRate: 0,
      peakTaxYear: null,
      yearsInRetirement: 0,
      totalAfterTaxIncome: 0,
    };
  }

  // Average effective rate (weighted by income)
  let totalIncome = 0;
  let totalTax = 0;
  let totalAfterTaxIncome = 0;
  let peakTaxYear: ProjectionYear | null = null;

  for (const year of projection.years) {
    totalIncome += year.withdrawals.total;
    totalTax += year.taxes.total;
    totalAfterTaxIncome += year.afterTaxIncome;

    if (!peakTaxYear || year.taxes.total > peakTaxYear.taxes.total) {
      peakTaxYear = year;
    }
  }

  const averageEffectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

  return {
    averageEffectiveRate,
    peakTaxYear,
    yearsInRetirement,
    totalAfterTaxIncome: Math.round(totalAfterTaxIncome),
  };
}
