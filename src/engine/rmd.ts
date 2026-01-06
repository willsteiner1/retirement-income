/**
 * RMD (Required Minimum Distribution) Calculation Engine
 *
 * Calculates Required Minimum Distributions from Traditional retirement accounts
 * based on IRS rules and the Uniform Lifetime Table.
 */

import type { RMDInfo } from '../types';
import { RMD_START_AGE, getDistributionPeriod } from '../constants/rmdTables';

/**
 * Check if RMD is required based on age
 */
export function isRMDRequired(age: number): boolean {
  return age >= RMD_START_AGE;
}

/**
 * Get years until RMD requirement begins
 */
export function getYearsUntilRMD(currentAge: number): number {
  if (currentAge >= RMD_START_AGE) {
    return 0;
  }
  return RMD_START_AGE - currentAge;
}

/**
 * Calculate the Required Minimum Distribution for a given year
 *
 * @param age - Age at end of distribution year
 * @param priorYearEndBalance - Traditional account balance at end of prior year
 * @returns RMDInfo with calculation details
 */
export function calculateRMD(
  age: number,
  priorYearEndBalance: number
): RMDInfo {
  // Not required if under RMD age or no balance
  if (age < RMD_START_AGE || priorYearEndBalance <= 0) {
    return {
      isRequired: false,
      amount: 0,
      age,
      priorYearBalance: priorYearEndBalance,
      distributionPeriod: 0,
    };
  }

  const distributionPeriod = getDistributionPeriod(age);

  // RMD = Prior Year-End Balance / Distribution Period
  const amount = Math.round(priorYearEndBalance / distributionPeriod);

  return {
    isRequired: true,
    amount,
    age,
    priorYearBalance: priorYearEndBalance,
    distributionPeriod,
  };
}

/**
 * Project RMD schedule over multiple years
 * Useful for multi-year planning visualization
 *
 * @param currentAge - Starting age
 * @param endAge - End of projection (planning horizon)
 * @param currentBalance - Current Traditional account balance
 * @param estimatedGrowthRate - Annual growth rate assumption (default 5%)
 * @param additionalWithdrawals - Extra withdrawals beyond RMD per year (default 0)
 */
export function projectRMDSchedule(
  currentAge: number,
  endAge: number,
  currentBalance: number,
  estimatedGrowthRate: number = 0.05,
  additionalWithdrawals: number = 0
): Array<{
  year: number;
  age: number;
  startBalance: number;
  rmd: number;
  totalWithdrawal: number;
  endBalance: number;
}> {
  const projections = [];
  let balance = currentBalance;
  const currentYear = new Date().getFullYear();

  for (let age = currentAge; age <= endAge; age++) {
    const yearOffset = age - currentAge;
    const year = currentYear + yearOffset;

    // Calculate RMD based on prior year balance (use current balance for first year)
    const rmdInfo = calculateRMD(age, balance);
    const rmd = rmdInfo.amount;

    // Total withdrawal is RMD + any additional
    const totalWithdrawal = Math.min(rmd + additionalWithdrawals, balance);

    // End of year balance after withdrawal and growth
    const endBalance = Math.max(0, (balance - totalWithdrawal) * (1 + estimatedGrowthRate));

    projections.push({
      year,
      age,
      startBalance: Math.round(balance),
      rmd: Math.round(rmd),
      totalWithdrawal: Math.round(totalWithdrawal),
      endBalance: Math.round(endBalance),
    });

    // Next year starts with this year's end balance
    balance = endBalance;
  }

  return projections;
}

/**
 * Calculate total RMDs over a planning horizon
 */
export function calculateTotalRMDs(
  currentAge: number,
  endAge: number,
  currentBalance: number,
  estimatedGrowthRate: number = 0.05
): number {
  const schedule = projectRMDSchedule(currentAge, endAge, currentBalance, estimatedGrowthRate, 0);
  return schedule.reduce((total, year) => total + year.rmd, 0);
}

/**
 * Get RMD explanation text for narrative generation
 */
export function getRMDExplanation(rmdInfo: RMDInfo): string {
  if (!rmdInfo.isRequired) {
    if (rmdInfo.age < RMD_START_AGE) {
      const yearsUntil = RMD_START_AGE - rmdInfo.age;
      return `You won't need to take Required Minimum Distributions for another ${yearsUntil} year${yearsUntil !== 1 ? 's' : ''} (until age ${RMD_START_AGE}).`;
    }
    return 'No RMD is required because you have no Traditional account balance.';
  }

  return `At age ${rmdInfo.age}, you must withdraw at least $${rmdInfo.amount.toLocaleString()} from your Traditional retirement accounts. This is your Required Minimum Distribution (RMD), calculated by dividing your prior year-end balance of $${rmdInfo.priorYearBalance.toLocaleString()} by ${rmdInfo.distributionPeriod.toFixed(1)} (your life expectancy factor from the IRS tables).`;
}
