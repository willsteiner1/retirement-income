import type { TaxBreakdown, WithdrawalStrategy, Portfolio } from '../../types';
import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface TaxFlowChartProps {
  breakdown: TaxBreakdown;
  strategy: WithdrawalStrategy;
  portfolio?: Portfolio;
}

// Colors for income sources
const SOURCE_COLORS = {
  roth: '#DBEAFE',           // Light blue
  traditional: '#DDD6FE',    // Light purple
  socialSecurity: '#E9D5FF', // Lavender
  pension: '#FDBA74',        // Orange for pension
  taxable: '#D1FAE5',        // Light mint for taxable account
};

// Colors for ordinary income brackets
const BRACKET_COLORS: Record<number, string> = {
  10: '#BBF7D0',  // Light green
  12: '#FEF08A',  // Yellow
  22: '#FDE047',  // Darker yellow
  24: '#FDBA74',  // Orange
  32: '#FCA5A5',  // Light red
  35: '#F87171',  // Red
  37: '#EF4444',  // Dark red
};

// Colors for capital gains rates
const CAP_GAINS_COLORS: Record<number, string> = {
  0: '#A7F3D0',   // Mint green - 0% rate (excellent!)
  15: '#FDE68A',  // Amber - 15% rate
  20: '#FDBA74',  // Orange - 20% rate
};

const TAX_FREE_COLOR = '#86EFAC';  // Bright green
const DEDUCTION_COLOR = '#E5E7EB'; // Gray

export function TaxFlowChart({ breakdown, strategy }: TaxFlowChartProps) {
  const maxChartHeight = 300;
  const barWidth = 80;

  // Total income for this scenario
  const totalIncome = breakdown.grossIncome;
  if (totalIncome === 0) {
    return <div className="text-gray-400 text-center py-8">No income to display</div>;
  }

  // Scale reference: use current income with 25% headroom for slider adjustments
  // This ensures bars are reasonably sized and grow when income increases
  const scaleReference = Math.max(totalIncome * 1.25, 100000);

  // Helper to get pixel height from dollar amount - scales relative to max possible
  const getHeight = (amount: number) => (amount / scaleReference) * maxChartHeight;

  // Calculate how tall the current income bar should be
  const incomeBarHeight = getHeight(totalIncome);

  // === CALCULATE RETURN OF BASIS ===
  // When withdrawing from taxable account, part is return of basis (not taxable)
  const returnOfBasis = strategy.taxableWithdrawal - breakdown.longTermCapitalGains;

  // === BUILD INCOME SOURCES DATA ===
  const incomeSources = [
    { id: 'roth', label: 'Roth', amount: strategy.rothWithdrawal, color: SOURCE_COLORS.roth },
    { id: 'traditional', label: 'Traditional', amount: strategy.traditionalWithdrawal, color: SOURCE_COLORS.traditional },
    { id: 'ss', label: 'Soc. Security', amount: breakdown.socialSecurityGross, color: SOURCE_COLORS.socialSecurity },
    { id: 'pension', label: 'Pension', amount: breakdown.pensionGross, color: SOURCE_COLORS.pension },
    { id: 'taxable', label: 'Taxable Acct', amount: strategy.taxableWithdrawal, color: SOURCE_COLORS.taxable },
  ].filter(s => s.amount > 0);

  // === BUILD TAX TREATMENT DATA ===
  // Tax-free portions:
  // 1. Roth withdrawals
  // 2. Return of basis from taxable account
  // 3. Non-taxable portion of Social Security
  const nonTaxableSS = breakdown.socialSecurityGross - breakdown.socialSecurityTaxable;
  const totalTaxFree = strategy.rothWithdrawal + returnOfBasis + nonTaxableSS;

  // Capital gains (taxed at preferential rates)
  const capitalGains = breakdown.longTermCapitalGains;
  const capGainsRate = breakdown.capitalGainsBracket.rate;

  // Get filled brackets (ordinary income only)
  const filledBrackets = breakdown.bracketFill.filter(b => b.incomeInBracket > 0);

  // === BUILD TAXES BREAKDOWN ===
  const totalTax = breakdown.totalTax;
  const afterTax = breakdown.afterTaxIncome;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-700 mb-6">This Year</h3>

      <div className="flex items-end justify-around" style={{ height: maxChartHeight + 80 }}>

        {/* COLUMN 1: Income Sources - Stacked Bar (height grows with income) */}
        <div className="flex flex-col items-center justify-end" style={{ height: maxChartHeight }}>
          <div
            className="flex flex-col-reverse rounded-lg overflow-hidden border border-gray-200"
            style={{ width: barWidth, height: Math.max(incomeBarHeight, 40) }}
          >
            {incomeSources.map((source) => (
              <Tooltip
                key={source.id}
                content={
                  <HoverCard
                    title={source.label}
                    items={
                      source.id === 'taxable' ? [
                        { label: 'Withdrawal', value: formatCurrency(source.amount) },
                        { label: 'Return of basis', value: formatCurrency(returnOfBasis) },
                        { label: 'Capital gains', value: formatCurrency(capitalGains) },
                      ] : source.id === 'ss' ? [
                        { label: 'Gross benefit', value: formatCurrency(source.amount) },
                        { label: 'Taxable portion', value: formatCurrency(breakdown.socialSecurityTaxable) },
                        { label: 'Non-taxable', value: formatCurrency(nonTaxableSS) },
                      ] : source.id === 'pension' ? [
                        { label: 'Annual benefit', value: formatCurrency(source.amount) },
                        { label: 'Taxable portion', value: formatCurrency(breakdown.pensionTaxable) },
                      ] : [
                        { label: 'Amount', value: formatCurrency(source.amount) },
                        { label: '% of total', value: `${((source.amount / totalIncome) * 100).toFixed(1)}%` },
                      ]
                    }
                    explanation={
                      source.id === 'roth' ? 'Tax-free qualified withdrawals' :
                      source.id === 'traditional' ? 'Taxed as ordinary income' :
                      source.id === 'ss' ? `${breakdown.socialSecurityGross > 0 ? ((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0) : 0}% is taxable based on provisional income` :
                      source.id === 'pension' ? '100% taxable as ordinary income' :
                      `${returnOfBasis > 0 ? formatCurrency(returnOfBasis) + ' is return of basis (tax-free). ' : ''}${capitalGains > 0 ? formatCurrency(capitalGains) + ` in gains taxed at ${capGainsRate}%.` : ''}`
                    }
                  />
                }
                position="left"
              >
                <div
                  className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-b border-white/50 last:border-b-0"
                  style={{
                    height: getHeight(source.amount),
                    backgroundColor: source.color,
                    minHeight: getHeight(source.amount) > 0 ? 4 : 0,
                  }}
                >
                  {getHeight(source.amount) > 24 && (
                    <span className="text-[10px] text-gray-600 text-center px-1 leading-tight">
                      {source.label}
                    </span>
                  )}
                </div>
              </Tooltip>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center font-medium">Income Sources</p>
        </div>

        {/* COLUMN 2: Tax Treatment - Stacked Bar (same height as Income Sources) */}
        <div className="flex flex-col items-center justify-end" style={{ height: maxChartHeight }}>
          <div
            className="flex flex-col-reverse rounded-lg overflow-hidden border border-gray-200"
            style={{ width: barWidth, height: Math.max(incomeBarHeight, 40) }}
          >
            {/* Tax-free section at bottom (Roth + return of basis + non-taxable SS) */}
            {totalTaxFree > 0 && (
              <Tooltip
                content={
                  <HoverCard
                    title="Tax Free"
                    items={[
                      ...(strategy.rothWithdrawal > 0 ? [{ label: 'Roth withdrawal', value: formatCurrency(strategy.rothWithdrawal) }] : []),
                      ...(returnOfBasis > 0 ? [{ label: 'Return of basis', value: formatCurrency(returnOfBasis) }] : []),
                      ...(nonTaxableSS > 0 ? [{ label: 'Non-taxable SS', value: formatCurrency(nonTaxableSS) }] : []),
                    ]}
                    explanation="This income is not subject to federal income tax."
                  />
                }
                position="left"
              >
                <div
                  className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    height: getHeight(totalTaxFree),
                    backgroundColor: TAX_FREE_COLOR,
                  }}
                >
                  {getHeight(totalTaxFree) > 20 && (
                    <span className="text-[10px] text-gray-700 font-medium">tax free</span>
                  )}
                </div>
              </Tooltip>
            )}

            {/* Capital gains section (taxed at preferential rates) */}
            {capitalGains > 0 && (
              <Tooltip
                content={
                  <HoverCard
                    title={`Capital Gains (${capGainsRate}% rate)`}
                    items={[
                      { label: 'Long-term gains', value: formatCurrency(capitalGains) },
                      { label: 'Tax on gains', value: formatCurrency(breakdown.capitalGainsTax) },
                    ]}
                    explanation={capGainsRate === 0
                      ? "These gains fall within the 0% capital gains bracket - no tax owed!"
                      : `Long-term capital gains are taxed at a preferential ${capGainsRate}% rate.`}
                  />
                }
                position="left"
              >
                <div
                  className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-b border-white/30"
                  style={{
                    height: getHeight(capitalGains),
                    backgroundColor: CAP_GAINS_COLORS[capGainsRate] || CAP_GAINS_COLORS[15],
                    minHeight: 4,
                  }}
                >
                  {getHeight(capitalGains) > 20 && (
                    <span className="text-[10px] font-semibold text-gray-700">
                      {capGainsRate}% CG
                    </span>
                  )}
                </div>
              </Tooltip>
            )}

            {/* Ordinary income tax brackets */}
            {filledBrackets.map((bracket, idx) => (
              <Tooltip
                key={idx}
                content={
                  <HoverCard
                    title={`${bracket.rate}% Ordinary Income`}
                    items={[
                      { label: 'Income in bracket', value: formatCurrency(bracket.incomeInBracket) },
                      { label: 'Tax from bracket', value: formatCurrency(bracket.taxFromBracket) },
                    ]}
                    explanation={`Taxable ordinary income from $${bracket.bracketMin.toLocaleString()} to $${bracket.bracketMax === Infinity ? '∞' : bracket.bracketMax.toLocaleString()} is taxed at ${bracket.rate}%.`}
                  />
                }
                position="left"
              >
                <div
                  className="w-full flex items-center justify-end pr-1 cursor-pointer hover:opacity-80 transition-opacity border-b border-white/30"
                  style={{
                    height: getHeight(bracket.incomeInBracket),
                    backgroundColor: BRACKET_COLORS[bracket.rate] || '#E5E7EB',
                    minHeight: getHeight(bracket.incomeInBracket) > 0 ? 4 : 0,
                  }}
                >
                  {getHeight(bracket.incomeInBracket) > 18 && (
                    <span className="text-[10px] font-semibold text-gray-700">{bracket.rate}%</span>
                  )}
                </div>
              </Tooltip>
            ))}

            {/* Deductions - shields ordinary income from tax */}
            {breakdown.deductions > 0 && (
              <Tooltip
                content={
                  <HoverCard
                    title="Deductions"
                    items={[
                      { label: breakdown.deductionType === 'standard' ? 'Standard deduction' : 'Itemized deductions', value: formatCurrency(breakdown.deductions) },
                    ]}
                    explanation="This amount is subtracted from taxable ordinary income before calculating tax."
                  />
                }
                position="left"
              >
                <div
                  className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    height: getHeight(Math.min(breakdown.deductions, breakdown.ordinaryIncome)),
                    backgroundColor: DEDUCTION_COLOR,
                  }}
                >
                  {getHeight(Math.min(breakdown.deductions, breakdown.ordinaryIncome)) > 20 && (
                    <span className="text-[10px] text-gray-500">deduction</span>
                  )}
                </div>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center font-medium">Tax Treatment</p>
        </div>

        {/* COLUMN 3: Taxes Owed - Height proportional to tax amount */}
        <div className="flex flex-col items-center justify-end" style={{ height: maxChartHeight }}>
          <div
            className="flex flex-col justify-end"
            style={{ width: barWidth, height: maxChartHeight }}
          >
            <Tooltip
              content={
                <HoverCard
                  title="Total Taxes"
                  items={[
                    { label: 'Ordinary income tax', value: formatCurrency(breakdown.ordinaryIncomeTax) },
                    { label: 'Capital gains tax', value: formatCurrency(breakdown.capitalGainsTax) },
                    ...(breakdown.stateTax > 0 ? [{ label: 'State tax', value: formatCurrency(breakdown.stateTax) }] : []),
                    { label: 'Total', value: formatCurrency(totalTax) },
                  ]}
                  explanation={`This is ${formatPercent(breakdown.effectiveRate)} of your gross income.`}
                />
              }
              position="left"
            >
              <div
                className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity rounded-lg border border-gray-200"
                style={{
                  height: Math.max(getHeight(totalTax), 24),
                  backgroundColor: '#FCA5A5',
                }}
              >
                <span className="text-xs font-semibold text-gray-700">
                  {formatCurrency(totalTax)}
                </span>
              </div>
            </Tooltip>
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center font-medium">Taxes</p>
        </div>

        {/* COLUMN 4: After-Tax Income - Height proportional to after-tax amount */}
        <div className="flex flex-col items-center justify-end" style={{ height: maxChartHeight }}>
          <div
            className="flex flex-col justify-end"
            style={{ width: barWidth, height: maxChartHeight }}
          >
            <Tooltip
              content={
                <HoverCard
                  title="After-Tax Income"
                  items={[
                    { label: 'Gross income', value: formatCurrency(totalIncome) },
                    { label: 'Minus taxes', value: `-${formatCurrency(totalTax)}` },
                    { label: 'You keep', value: formatCurrency(afterTax) },
                  ]}
                  explanation="This is what you actually receive after all taxes."
                />
              }
              position="left"
            >
              <div
                className="w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity rounded-lg border border-gray-200"
                style={{
                  height: Math.max(getHeight(afterTax), 24),
                  backgroundColor: '#86EFAC',
                }}
              >
                <span className="text-xs font-semibold text-gray-700">
                  {formatCurrency(afterTax)}
                </span>
              </div>
            </Tooltip>
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center font-medium">After-Tax Income</p>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-gray-500">Total income</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalTax)}</p>
          <p className="text-xs text-gray-500">Total taxes</p>
          {breakdown.stateTax > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Fed: {formatCurrency(breakdown.ordinaryIncomeTax + breakdown.capitalGainsTax)} / State: {formatCurrency(breakdown.stateTax)}
            </p>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(afterTax)}</p>
          <p className="text-xs text-gray-500">After-tax income</p>
        </div>
      </div>

      {/* Effective Rate Breakdown */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Tooltip
            content={
              <HoverCard
                title="Rate on Gross Income"
                items={[
                  { label: 'Total tax', value: formatCurrency(totalTax) },
                  { label: 'Gross income', value: formatCurrency(totalIncome) },
                ]}
                explanation="What percentage of all money you receive goes to taxes. Includes tax-free sources like Roth and return of basis."
              />
            }
            position="top"
          >
            <div className="cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors">
              <p className="text-xl font-bold text-blue-600">{formatPercent(breakdown.effectiveRate)}</p>
              <p className="text-xs text-gray-500">on gross income</p>
            </div>
          </Tooltip>
          <Tooltip
            content={
              <HoverCard
                title="Rate on AGI"
                items={[
                  { label: 'Total tax', value: formatCurrency(totalTax) },
                  { label: 'AGI', value: formatCurrency(breakdown.adjustedGrossIncome) },
                ]}
                explanation="Rate on Adjusted Gross Income - excludes tax-free sources but includes all taxable income before deductions."
              />
            }
            position="top"
          >
            <div className="cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors">
              <p className="text-xl font-bold text-blue-600">{formatPercent(breakdown.effectiveRateOnAGI)}</p>
              <p className="text-xs text-gray-500">on AGI</p>
            </div>
          </Tooltip>
          <Tooltip
            content={
              <HoverCard
                title="Rate on Taxable Income"
                items={[
                  { label: 'Total tax', value: formatCurrency(totalTax) },
                  { label: 'Taxable income', value: formatCurrency(breakdown.taxableIncome) },
                ]}
                explanation="Rate on taxable income after deductions. This is what the IRS actually taxes."
              />
            }
            position="top"
          >
            <div className="cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors">
              <p className="text-xl font-bold text-blue-600">{formatPercent(breakdown.effectiveRateOnTaxable)}</p>
              <p className="text-xs text-gray-500">on taxable income</p>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
        <div className="inline-flex flex-wrap gap-3 p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TAX_FREE_COLOR }} />
            <span className="text-xs text-gray-600">Tax-free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CAP_GAINS_COLORS[0] }} />
            <span className="text-xs text-gray-600">0% CG</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CAP_GAINS_COLORS[15] }} />
            <span className="text-xs text-gray-600">15% CG</span>
          </div>
          {[10, 12, 22, 24].map(rate => (
            <div key={rate} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: BRACKET_COLORS[rate] }}
              />
              <span className="text-xs text-gray-600">{rate}%</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: DEDUCTION_COLOR }} />
            <span className="text-xs text-gray-600">Deduction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
