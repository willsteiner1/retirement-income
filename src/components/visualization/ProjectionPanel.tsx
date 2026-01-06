import { useState, useMemo } from 'react';
import type { Portfolio, IncomeGoal, ProjectionAssumptions, WithdrawalStrategy, TaxBreakdown } from '../../types';
import {
  generateRetirementProjection,
  getProjectionStats,
  DEFAULT_ASSUMPTIONS,
} from '../../engine/projectionEngine';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ProjectionPanelProps {
  portfolio: Portfolio;
  goal: IncomeGoal;
  currentStrategy: WithdrawalStrategy;
  currentBreakdown: TaxBreakdown;
}

export function ProjectionPanel({ portfolio, goal, currentStrategy, currentBreakdown }: ProjectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>(DEFAULT_ASSUMPTIONS);
  const [isEditingAssumptions, setIsEditingAssumptions] = useState(false);

  // Local state for editing assumptions
  const [editGrowth, setEditGrowth] = useState('');
  const [editInflation, setEditInflation] = useState('');

  // Sync edit fields when entering edit mode
  const handleStartEditing = () => {
    setEditGrowth((assumptions.growthRate * 100).toString());
    setEditInflation((assumptions.inflationRate * 100).toString());
    setIsEditingAssumptions(true);
  };

  // Generate projection (memoized to avoid recalculation)
  // Uses current strategy as Year 1, then projects forward
  const projection = useMemo(() => {
    if (!isExpanded) return null;
    return generateRetirementProjection(portfolio, goal, assumptions, currentStrategy, currentBreakdown);
  }, [portfolio, goal, assumptions, isExpanded, currentStrategy, currentBreakdown]);

  const stats = useMemo(() => {
    if (!projection) return null;
    return getProjectionStats(projection);
  }, [projection]);

  // Handle assumption save - SS COLA matches inflation
  const handleSaveAssumptions = () => {
    const inflationRate = parseFloat(editInflation) / 100 || 0.025;
    setAssumptions({
      growthRate: parseFloat(editGrowth) / 100 || 0.05,
      inflationRate,
      socialSecurityCOLA: inflationRate, // SS COLA tracks inflation
    });
    setIsEditingAssumptions(false);
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-gray-900">Multi-Year Projection</span>
          <span className="text-sm text-gray-500">
            (Age {goal.primaryAge} to {goal.planningHorizon})
          </span>
        </div>
        {projection && !isExpanded && (
          <div className="flex items-center gap-4 text-sm">
            {projection.isSustainable ? (
              <span className="text-green-600 font-medium">Sustainable</span>
            ) : (
              <span className="text-red-600 font-medium">Depletes at {projection.depletionAge}</span>
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && projection && (
        <div className="px-6 pb-6 border-t border-gray-200">
          {/* Assumptions Bar */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            {isEditingAssumptions ? (
              <div className="space-y-3">
                <div className="flex gap-6">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Growth Rate</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={editGrowth}
                        onChange={(e) => setEditGrowth(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="ml-1 text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inflation Rate</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={editInflation}
                        onChange={(e) => setEditInflation(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="ml-1 text-sm text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Also applies to SS benefits</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAssumptions}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setIsEditingAssumptions(false)}
                    className="px-3 py-1.5 border border-gray-300 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Assumptions:</span>
                  <span className="font-medium">{(assumptions.growthRate * 100).toFixed(1)}% growth</span>
                  <span className="font-medium">{(assumptions.inflationRate * 100).toFixed(1)}% inflation</span>
                  <span className="text-gray-400 text-xs">(applied annually after withdrawals)</span>
                </div>
                <button
                  onClick={handleStartEditing}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Projection Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Year</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Age</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600" title="Beginning of year">Portfolio (Start)</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">RMD</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Withdrawals</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Taxes</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">After-Tax</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Eff. Rate</th>
                </tr>
              </thead>
              <tbody>
                {projection?.years.map((year, idx) => {
                  const isRmdStart = year.age === 73;
                  const isDepletion = projection.depletionAge === year.age;
                  const rowClass = isDepletion
                    ? 'bg-red-50'
                    : isRmdStart
                      ? 'bg-amber-50'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50';

                  return (
                    <tr key={year.year} className={`${rowClass} border-b border-gray-100 hover:bg-gray-100 transition-colors`}>
                      <td className="py-2 px-2 text-gray-900">{year.year}</td>
                      <td className="py-2 px-2 text-gray-900">
                        {year.age}
                        {isRmdStart && <span className="ml-1 text-amber-600 text-xs">(RMD start)</span>}
                        {isDepletion && <span className="ml-1 text-red-600 text-xs">(depleted)</span>}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {year.balances.total > 0 ? formatCurrency(year.balances.total) : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-amber-700">
                        {year.rmdAmount > 0 ? formatCurrency(year.rmdAmount) : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {formatCurrency(year.withdrawals.total)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-red-600">
                        {year.taxes.total > 0 ? formatCurrency(year.taxes.total) : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-green-600">
                        {formatCurrency(year.afterTaxIncome)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {formatPercent(year.effectiveRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            {/* Sustainability Indicator */}
            <div className="mb-4">
              {projection.isSustainable ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                  <span className="text-lg">&#10003;</span>
                  <span className="font-medium">
                    Portfolio sustainable through age {goal.planningHorizon}
                  </span>
                </div>
              ) : (
                <div className="text-red-700 bg-red-50 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">&#9888;</span>
                    <span className="font-medium">
                      Portfolio depletes at age {projection.depletionAge}
                    </span>
                    <span className="text-sm text-red-600">
                      ({(projection.depletionAge! - goal.primaryAge)} years)
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1 ml-7">
                    After depletion, only Social Security income remains
                  </p>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(projection.totalTaxesPaid)}
                </p>
                <p className="text-xs text-gray-500">Total Taxes Paid</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(projection.totalWithdrawals)}
                </p>
                <p className="text-xs text-gray-500">Total Withdrawals</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(projection.finalPortfolioValue)}
                </p>
                <p className="text-xs text-gray-500">Final Portfolio</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xl font-bold text-blue-600">
                  {stats ? formatPercent(stats.averageEffectiveRate) : '-'}
                </p>
                <p className="text-xs text-gray-500">Avg. Effective Rate</p>
              </div>
            </div>

            {/* Additional Stats */}
            {stats && stats.totalAfterTaxIncome > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Total after-tax income over {stats.yearsInRetirement} years:{' '}
                <span className="font-medium text-green-600">
                  {formatCurrency(stats.totalAfterTaxIncome)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
