import { useState, useEffect, useMemo } from 'react';
import { usePlan } from '../../context/PlanContext';
import { generateStrategy, validateStrategy, explainStrategy } from '../../engine/strategyGenerator';
import { calculateTaxBreakdown } from '../../engine/calculateTax';
import { WithdrawalSlider } from '../inputs/WithdrawalSlider';
import { TaxFlowChart } from '../visualization/TaxFlowChart';
import { ProjectionPanel } from '../visualization/ProjectionPanel';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { WithdrawalStrategy } from '../../types';

export function IncomePlanner() {
  const { state, setStep, setStrategy, setTaxBreakdown } = usePlan();
  const { portfolio, goal, viewMode } = state;

  // Local strategy state for real-time updates
  const [localStrategy, setLocalStrategy] = useState<WithdrawalStrategy>({
    traditionalWithdrawal: 0,
    taxableWithdrawal: 0,
    rothWithdrawal: 0,
    socialSecurityIncome: 0,
    pensionIncome: 0,
    rmdAmount: 0,
    isSystemGenerated: true,
  });

  // Generate initial strategy when component mounts
  useEffect(() => {
    if (goal && portfolio) {
      const generated = generateStrategy(portfolio, goal);
      setLocalStrategy(generated);
    }
  }, [goal, portfolio]);

  // Calculate tax breakdown in real-time (memoized for performance)
  const breakdown = useMemo(() => {
    if (!goal || !portfolio) return null;
    return calculateTaxBreakdown(localStrategy, portfolio, goal);
  }, [localStrategy, goal, portfolio]);

  // Validate strategy
  const validation = useMemo(() => {
    if (!portfolio) return { valid: true, errors: [] };
    return validateStrategy(localStrategy, portfolio);
  }, [localStrategy, portfolio]);

  // Generate strategy explanation
  const strategyExplanation = useMemo(() => {
    if (!breakdown) return [];
    return explainStrategy(localStrategy, breakdown);
  }, [localStrategy, breakdown]);

  // Handle slider changes
  const handleChange = (field: keyof WithdrawalStrategy, value: number) => {
    setLocalStrategy(prev => {
      // Enforce RMD minimum for traditional withdrawals
      const adjustedValue = field === 'traditionalWithdrawal' && prev.rmdAmount > 0
        ? Math.max(value, prev.rmdAmount)
        : value;

      return {
        ...prev,
        [field]: adjustedValue,
        isSystemGenerated: false,
      };
    });
  };

  // Regenerate optimal strategy
  const handleRegenerate = () => {
    if (goal && portfolio) {
      const generated = generateStrategy(portfolio, goal);
      setLocalStrategy(generated);
    }
  };

  // Continue to narrative
  const handleContinue = () => {
    if (breakdown) {
      setStrategy(localStrategy);
      setTaxBreakdown(breakdown);
      setStep('narrative');
    }
  };

  if (!goal || !portfolio) {
    return (
      <div className="card">
        <p className="text-gray-500">Please complete the goal definition first.</p>
        <button onClick={() => setStep('goal')} className="btn-primary mt-4">
          Go to Goal Definition
        </button>
      </div>
    );
  }

  // Goal achievement check
  const goalMet = goal.targetType === 'afterTax'
    ? (breakdown?.afterTaxIncome ?? 0) >= goal.amount * 0.99
    : (breakdown?.grossIncome ?? 0) >= goal.amount * 0.99;

  const goalDiff = goal.targetType === 'afterTax'
    ? (breakdown?.afterTaxIncome ?? 0) - goal.amount
    : (breakdown?.grossIncome ?? 0) - goal.amount;

  // Sustainability check (4% rule)
  const totalPortfolio =
    (portfolio.traditional?.balance ?? 0) +
    (portfolio.taxable?.balance ?? 0) +
    (portfolio.roth?.balance ?? 0);
  const portfolioWithdrawals =
    localStrategy.traditionalWithdrawal +
    localStrategy.taxableWithdrawal +
    localStrategy.rothWithdrawal;
  const withdrawalRate = totalPortfolio > 0 ? portfolioWithdrawals / totalPortfolio : 0;
  const isSustainable = withdrawalRate <= 0.04;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Plan Your Income</h2>
          <p className="mt-1 text-gray-600 text-sm sm:text-base">
            Adjust withdrawals and see tax impact in real-time.
          </p>
        </div>

        {/* Goal Status Badges */}
        <div className="flex flex-col items-start sm:items-end gap-2">
          <span className="text-sm text-gray-500">
            Goal: {formatCurrency(goal.amount)} {goal.targetType === 'afterTax' ? 'after-tax' : 'gross'}
          </span>
          <div className="flex gap-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              ${goalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <span>{goalMet ? '✓' : '!'}</span>
              <span>{goalMet ? 'Achieved' : `${formatCurrency(Math.abs(goalDiff))} ${goalDiff < 0 ? 'short' : 'over'}`}</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              ${isSustainable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              <span>{isSustainable ? '✓' : '⚠'}</span>
              <span>{isSustainable ? 'Sustainable' : `${(withdrawalRate * 100).toFixed(1)}% rate`}</span>
            </div>
          </div>
          {!isSustainable && (
            <p className="text-xs text-red-600 text-right max-w-xs">
              Withdrawal rate exceeds 4% — portfolio may deplete early
            </p>
          )}
        </div>
      </div>

      {/* Main Layout: Controls + Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Withdrawal Controls */}
        <div className="md:col-span-5 lg:col-span-4 space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-900">Withdrawals</h3>
              {!localStrategy.isSystemGenerated && (
                <button
                  onClick={handleRegenerate}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Reset to suggested
                </button>
              )}
            </div>

            {/* Strategy explanation */}
            {localStrategy.isSystemGenerated && strategyExplanation.length > 0 ? (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-medium text-emerald-800 mb-1">Suggested strategy</p>
                <ul className="text-xs text-emerald-700 space-y-1">
                  {strategyExplanation.map((explanation, i) => (
                    <li key={i}>• {explanation}</li>
                  ))}
                </ul>
              </div>
            ) : !localStrategy.isSystemGenerated ? (
              <p className="mb-4 text-xs text-gray-500 italic">
                You've customized this strategy. Adjust sliders or reset to see the tax-optimized recommendation.
              </p>
            ) : null}

            <div className="space-y-5">
              {/* Traditional */}
              {portfolio.traditional && (
                <WithdrawalSlider
                  label="Traditional 401(k)/IRA"
                  value={localStrategy.traditionalWithdrawal}
                  max={portfolio.traditional.balance}
                  onChange={(v) => handleChange('traditionalWithdrawal', v)}
                  color="#C4B5FD"
                  description={localStrategy.rmdAmount > 0
                    ? `Taxed as ordinary income (min ${formatCurrency(localStrategy.rmdAmount)} RMD)`
                    : "Taxed as ordinary income"
                  }
                />
              )}

              {/* Taxable */}
              {portfolio.taxable && (
                <WithdrawalSlider
                  label="Taxable Brokerage"
                  value={localStrategy.taxableWithdrawal}
                  max={portfolio.taxable.balance}
                  onChange={(v) => handleChange('taxableWithdrawal', v)}
                  color="#93C5FD"
                  description={`${((portfolio.taxable.unrealizedGains / portfolio.taxable.balance) * 100).toFixed(0)}% is gains (capital gains rates)`}
                />
              )}

              {/* Roth */}
              {portfolio.roth && (
                <WithdrawalSlider
                  label="Roth 401(k)/IRA"
                  value={localStrategy.rothWithdrawal}
                  max={portfolio.roth.balance}
                  onChange={(v) => handleChange('rothWithdrawal', v)}
                  color="#6EE7B7"
                  description="Tax-free withdrawals"
                />
              )}

              {/* Social Security (display only) */}
              {portfolio.socialSecurity && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Social Security</span>
                    <span className="font-medium">{formatCurrency(localStrategy.socialSecurityIncome)}</span>
                  </div>
                  {breakdown && (
                    <p className="text-xs text-gray-500 mt-1">
                      {((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0)}% taxable
                    </p>
                  )}
                </div>
              )}

              {/* Pension (display only) */}
              {portfolio.pension && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pension</span>
                    <span className="font-medium">{formatCurrency(localStrategy.pensionIncome)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    100% taxable as ordinary income
                  </p>
                </div>
              )}

              {/* RMD (display only - forced withdrawal) */}
              {localStrategy.rmdAmount > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Required Minimum Distribution</span>
                    <span className="font-medium">{formatCurrency(localStrategy.rmdAmount)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Included in Traditional withdrawal above
                  </p>
                </div>
              )}
            </div>

            {/* RMD Warning */}
            {localStrategy.rmdAmount > 0 && localStrategy.traditionalWithdrawal < localStrategy.rmdAmount && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Traditional withdrawal must be at least {formatCurrency(localStrategy.rmdAmount)} to satisfy your Required Minimum Distribution.
                </p>
              </div>
            )}

            {/* Validation Errors */}
            {!validation.valid && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{validation.errors[0]}</p>
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          {breakdown && (
            <div className="card">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(breakdown.afterTaxIncome)}
                  </p>
                  <p className="text-xs text-gray-500">After-Tax Income</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPercent(breakdown.effectiveRate)}
                  </p>
                  <p className="text-xs text-gray-500">Effective Tax Rate</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Gross income</span>
                  <span>{formatCurrency(breakdown.grossIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Federal tax</span>
                  <span className="text-red-600">-{formatCurrency(breakdown.ordinaryIncomeTax + breakdown.capitalGainsTax)}</span>
                </div>
                {breakdown.stateTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">State tax</span>
                    <span className="text-red-600">-{formatCurrency(breakdown.stateTax)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Marginal rate</span>
                  <span>{breakdown.marginalOrdinaryRate.toFixed(0)}%</span>
                </div>
                {breakdown.stateTax === 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cap gains rate</span>
                    <span>{breakdown.capitalGainsBracket.rate}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Visualization */}
        <div className="md:col-span-7 lg:col-span-8">
          {breakdown && (
            <TaxFlowChart breakdown={breakdown} strategy={localStrategy} />
          )}
        </div>
      </div>

      {/* Multi-Year Projection */}
      {portfolio && goal && breakdown && (
        <ProjectionPanel
          portfolio={portfolio}
          goal={goal}
          currentStrategy={localStrategy}
          currentBreakdown={breakdown}
        />
      )}

      {/* Key Insights */}
      {breakdown && viewMode === 'advisor' && (
        <div className="card card-info">
          <h3 className="font-semibold text-gray-900 mb-3">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {breakdown.socialSecurityGross > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="font-medium text-gray-800">Social Security</p>
                <p className="text-gray-600">
                  {((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0)}% is taxable based on your other income.
                </p>
              </div>
            )}
            {breakdown.longTermCapitalGains > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="font-medium text-gray-800">Capital Gains</p>
                <p className="text-gray-600">
                  Taxed at {breakdown.capitalGainsBracket.rate}% — {breakdown.capitalGainsBracket.rate === 0 ? 'taking advantage of the 0% bracket!' : 'preferential rate.'}
                </p>
              </div>
            )}
            <div className="bg-white rounded-lg p-3">
              <p className="font-medium text-gray-800">Tax Efficiency</p>
              <p className="text-gray-600">
                {breakdown.effectiveRate < 0.10
                  ? 'Excellent! Under 10% effective rate.'
                  : breakdown.effectiveRate < 0.15
                    ? 'Very good tax efficiency.'
                    : 'Consider adjusting the mix to reduce taxes.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep('goal')} className="btn-secondary">
          Back to Goals
        </button>
        <button
          onClick={handleContinue}
          disabled={!validation.valid}
          className={`btn-primary ${!validation.valid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Generate Client Summary
        </button>
      </div>
    </div>
  );
}
