import type { TaxBreakdown, WithdrawalStrategy } from '../../types';
import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface IncomeFlowVizProps {
  breakdown: TaxBreakdown;
  strategy: WithdrawalStrategy;
}

// Colors matching the mockup
const COLORS = {
  roth: '#DBEAFE',           // Light blue
  traditional: '#F3E8FF',    // Light purple
  socialSecurity: '#EDE9FE', // Lavender
  capitalGains: '#D1FAE5',   // Light green
  taxFree: '#A7F3D0',        // Bright green
  deductions: '#E5E7EB',     // Gray
  taxes: '#86EFAC',          // Green (money kept)
};

const BRACKET_COLORS: Record<number, string> = {
  10: '#D1FAE5',
  12: '#FEF3C7',
  22: '#FDE68A',
  24: '#FDBA74',
  32: '#FCA5A5',
  35: '#FB7185',
  37: '#F43F5E',
};

export function IncomeFlowViz({ breakdown, strategy }: IncomeFlowVizProps) {
  // Calculate max height reference (total gross income)
  const maxIncome = breakdown.grossIncome;
  const chartHeight = 280;

  // Helper to calculate bar height
  const getHeight = (amount: number) => {
    if (maxIncome === 0) return 0;
    return Math.max(4, (amount / maxIncome) * chartHeight);
  };

  // Income sources data
  const incomeSources = [
    {
      id: 'roth',
      label: 'Roth\nwithdrawal',
      amount: strategy.rothWithdrawal,
      color: COLORS.roth,
      taxChar: 'Tax-free',
      explanation: 'Qualified Roth withdrawals are completely tax-free.',
    },
    {
      id: 'traditional',
      label: 'Traditional\nwithdrawal',
      amount: strategy.traditionalWithdrawal,
      color: COLORS.traditional,
      taxChar: 'Ordinary income',
      explanation: 'Traditional 401(k)/IRA withdrawals are taxed as ordinary income.',
    },
    {
      id: 'ss',
      label: 'Social\nSecurity',
      amount: breakdown.socialSecurityGross,
      color: COLORS.socialSecurity,
      taxChar: `${((breakdown.socialSecurityTaxable / Math.max(1, breakdown.socialSecurityGross)) * 100).toFixed(0)}% taxable`,
      explanation: `Based on your provisional income, ${((breakdown.socialSecurityTaxable / Math.max(1, breakdown.socialSecurityGross)) * 100).toFixed(0)}% of your Social Security is subject to tax.`,
    },
    {
      id: 'capgains',
      label: 'Capital\ngains',
      amount: breakdown.longTermCapitalGains,
      color: COLORS.capitalGains,
      taxChar: `${breakdown.capitalGainsBracket.rate}% rate`,
      explanation: `Long-term capital gains taxed at ${breakdown.capitalGainsBracket.rate}% preferential rate.`,
    },
  ].filter(s => s.amount > 0);

  // Tax bracket fill data (reversed for bottom-up stacking)
  const filledBrackets = breakdown.bracketFill
    .filter(b => b.incomeInBracket > 0)
    .reverse(); // Bottom brackets first

  // Total taxable for bracket scaling
  const totalTaxable = filledBrackets.reduce((sum, b) => sum + b.incomeInBracket, 0);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-4">This Year</h3>

      <div className="flex items-end justify-between gap-2 overflow-x-auto pb-2" style={{ minHeight: chartHeight + 60 }}>
        {/* Income Sources */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Income Sources</p>
          <div className="flex items-end justify-center gap-1" style={{ height: chartHeight }}>
            {incomeSources.map((source) => (
              <Tooltip
                key={source.id}
                content={
                  <HoverCard
                    title={source.label.replace('\n', ' ')}
                    items={[
                      { label: 'Amount', value: formatCurrency(source.amount) },
                      { label: 'Tax treatment', value: source.taxChar },
                    ]}
                    explanation={source.explanation}
                  />
                }
                position="top"
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                    style={{
                      height: getHeight(source.amount),
                      backgroundColor: source.color,
                    }}
                  />
                  <p className="text-[10px] text-gray-500 mt-1 text-center whitespace-pre-line leading-tight">
                    {source.label}
                  </p>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Tax Treatment - Bracket Stack */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Tax Treatment</p>
          <div className="flex flex-col items-center" style={{ height: chartHeight }}>
            {/* Taxable brackets */}
            <div className="flex flex-col-reverse w-16" style={{ height: getHeight(totalTaxable) }}>
              {filledBrackets.map((bracket, idx) => {
                const bracketHeight = totalTaxable > 0
                  ? (bracket.incomeInBracket / totalTaxable) * getHeight(totalTaxable)
                  : 0;
                return (
                  <Tooltip
                    key={idx}
                    content={
                      <HoverCard
                        title={`${bracket.rate}% Bracket`}
                        items={[
                          { label: 'Income in bracket', value: formatCurrency(bracket.incomeInBracket) },
                          { label: 'Tax from bracket', value: formatCurrency(bracket.taxFromBracket) },
                        ]}
                        explanation={`Income in this bracket is taxed at ${bracket.rate}%.`}
                      />
                    }
                    position="left"
                  >
                    <div
                      className="w-full flex items-center justify-end pr-1 border-b border-white/30 transition-all hover:opacity-80 cursor-pointer"
                      style={{
                        height: bracketHeight,
                        backgroundColor: BRACKET_COLORS[bracket.rate] || '#E5E7EB',
                        minHeight: bracketHeight > 0 ? 8 : 0,
                      }}
                    >
                      {bracketHeight > 16 && (
                        <span className="text-[10px] font-medium text-gray-700">{bracket.rate}%</span>
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>

            {/* Tax-free section */}
            {strategy.rothWithdrawal > 0 && (
              <Tooltip
                content={
                  <HoverCard
                    title="Tax-Free Income"
                    items={[{ label: 'Roth', value: formatCurrency(strategy.rothWithdrawal) }]}
                    explanation="This income is not subject to federal income tax."
                  />
                }
                position="left"
              >
                <div
                  className="w-16 mt-1 rounded flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    height: getHeight(strategy.rothWithdrawal),
                    backgroundColor: COLORS.taxFree,
                  }}
                >
                  <span className="text-[10px] font-medium text-gray-700">tax free</span>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="w-14">
          <p className="text-xs text-gray-500 mb-2 text-center">Deductions</p>
          <div className="flex flex-col items-center justify-end" style={{ height: chartHeight }}>
            <Tooltip
              content={
                <HoverCard
                  title={`${breakdown.deductionType === 'standard' ? 'Standard' : 'Itemized'} Deduction`}
                  items={[{ label: 'Amount', value: formatCurrency(breakdown.deductions) }]}
                  explanation="Deductions reduce your taxable income."
                />
              }
              position="left"
            >
              <div
                className="w-12 rounded flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                style={{
                  height: Math.max(30, getHeight(breakdown.deductions) * 0.5),
                  backgroundColor: COLORS.deductions,
                }}
              />
            </Tooltip>
          </div>
        </div>

        {/* Taxes */}
        <div className="w-14">
          <p className="text-xs text-gray-500 mb-2 text-center">Taxes</p>
          <div className="flex flex-col items-center justify-end" style={{ height: chartHeight }}>
            <Tooltip
              content={
                <HoverCard
                  title="Total Taxes"
                  items={[
                    { label: 'Ordinary income tax', value: formatCurrency(breakdown.ordinaryIncomeTax) },
                    { label: 'Capital gains tax', value: formatCurrency(breakdown.capitalGainsTax) },
                    { label: 'Total', value: formatCurrency(breakdown.totalTax) },
                  ]}
                  explanation={`Effective rate: ${formatPercent(breakdown.effectiveRate)}`}
                />
              }
              position="left"
            >
              <div
                className="w-12 rounded flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                style={{
                  height: Math.max(30, getHeight(breakdown.totalTax)),
                  backgroundColor: COLORS.taxes,
                }}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Total income</p>
          <p className="text-lg font-bold">{formatCurrency(breakdown.grossIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total taxes</p>
          <p className="text-lg font-bold">{formatCurrency(breakdown.totalTax)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">After-tax income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(breakdown.afterTaxIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Effective tax rate</p>
          <p className="text-lg font-bold text-blue-600">{formatPercent(breakdown.effectiveRate)}</p>
        </div>
      </div>
    </div>
  );
}
