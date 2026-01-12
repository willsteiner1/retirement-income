/**
 * Guyton-Klinger Guardrails
 *
 * A dynamic withdrawal strategy that adjusts spending based on portfolio performance.
 * More flexible than the static 4% rule, potentially supporting higher initial rates.
 *
 * Key rules:
 * - Initial withdrawal rate: 5% (vs traditional 4%)
 * - Upper guardrail: If rate exceeds initial + 20%, cut spending 10%
 * - Lower guardrail: If rate falls below initial - 20%, increase spending 10%
 */

export interface GuardrailsConfig {
  initialRate: number;      // Starting withdrawal rate (e.g., 0.05 for 5%)
  upperBuffer: number;      // How much above initial triggers cut (e.g., 0.20 for 20%)
  lowerBuffer: number;      // How much below initial triggers raise (e.g., 0.20 for 20%)
  adjustmentPercent: number; // How much to adjust when triggered (e.g., 0.10 for 10%)
}

export interface GuardrailsResult {
  currentRate: number;           // Current withdrawal rate
  initialRate: number;           // Target initial rate
  upperGuardrail: number;        // Rate that triggers spending cut
  lowerGuardrail: number;        // Rate that triggers spending increase
  status: 'within' | 'above' | 'below';
  sustainableWithdrawal: number; // Withdrawal at initial rate
  maxSafeWithdrawal: number;     // Withdrawal at upper guardrail
  recommendation: string;
}

// Default Guyton-Klinger parameters
export const DEFAULT_GUARDRAILS: GuardrailsConfig = {
  initialRate: 0.05,        // 5% initial withdrawal rate
  upperBuffer: 0.20,        // Upper guardrail at 6% (5% + 20% of 5%)
  lowerBuffer: 0.20,        // Lower guardrail at 4% (5% - 20% of 5%)
  adjustmentPercent: 0.10,  // 10% adjustment when guardrail hit
};

/**
 * Calculate guardrails thresholds and status
 */
export function calculateGuardrails(
  portfolioValue: number,
  currentWithdrawal: number,
  fixedIncome: number = 0,  // Social Security, pension (not from portfolio)
  config: GuardrailsConfig = DEFAULT_GUARDRAILS
): GuardrailsResult {
  // Portfolio withdrawal only (exclude fixed income like SS)
  const portfolioWithdrawal = Math.max(0, currentWithdrawal - fixedIncome);

  // Current withdrawal rate from portfolio
  const currentRate = portfolioValue > 0 ? portfolioWithdrawal / portfolioValue : 0;

  // Calculate guardrail thresholds
  const upperGuardrail = config.initialRate * (1 + config.upperBuffer);
  const lowerGuardrail = config.initialRate * (1 - config.lowerBuffer);

  // Sustainable withdrawal at initial rate
  const sustainableWithdrawal = portfolioValue * config.initialRate + fixedIncome;

  // Max safe withdrawal at upper guardrail
  const maxSafeWithdrawal = portfolioValue * upperGuardrail + fixedIncome;

  // Determine status
  let status: 'within' | 'above' | 'below';
  let recommendation: string;

  if (currentRate > upperGuardrail) {
    status = 'above';
    const cutAmount = portfolioWithdrawal * config.adjustmentPercent;
    recommendation = `Withdrawal rate (${(currentRate * 100).toFixed(1)}%) exceeds upper guardrail. Consider reducing portfolio withdrawals by ${formatMoney(cutAmount)}/year.`;
  } else if (currentRate < lowerGuardrail && currentRate > 0) {
    status = 'below';
    const raiseAmount = portfolioWithdrawal * config.adjustmentPercent;
    recommendation = `Withdrawal rate (${(currentRate * 100).toFixed(1)}%) is below lower guardrail. You could increase spending by ${formatMoney(raiseAmount)}/year.`;
  } else {
    status = 'within';
    recommendation = `Withdrawal rate (${(currentRate * 100).toFixed(1)}%) is within guardrails. Current strategy is sustainable.`;
  }

  return {
    currentRate,
    initialRate: config.initialRate,
    upperGuardrail,
    lowerGuardrail,
    status,
    sustainableWithdrawal,
    maxSafeWithdrawal,
    recommendation,
  };
}

/**
 * Get a simple sustainability assessment based on guardrails
 */
export function getGuardrailsAssessment(
  portfolioValue: number,
  targetIncome: number,
  fixedIncome: number = 0
): {
  isSustainable: boolean;
  isRisky: boolean;
  sustainableIncome: number;
  maxIncome: number;
  withdrawalRate: number;
  message: string;
} {
  const result = calculateGuardrails(portfolioValue, targetIncome, fixedIncome);

  const isSustainable = result.status !== 'above';
  const isRisky = result.currentRate > result.initialRate; // Above 5% but below upper guardrail

  let message: string;
  if (result.status === 'above') {
    message = `Above upper guardrail (${(result.upperGuardrail * 100).toFixed(0)}%). High depletion risk.`;
  } else if (isRisky) {
    message = `Above initial rate but within guardrails. Monitor closely.`;
  } else if (result.status === 'below') {
    message = `Below lower guardrail. Room to increase spending.`;
  } else {
    message = `Within target range. Sustainable strategy.`;
  }

  return {
    isSustainable,
    isRisky,
    sustainableIncome: result.sustainableWithdrawal,
    maxIncome: result.maxSafeWithdrawal,
    withdrawalRate: result.currentRate,
    message,
  };
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
