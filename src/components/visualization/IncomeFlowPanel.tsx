import type { TaxBreakdown, WithdrawalStrategy } from '../../types';
import { TaxBracketStack, BracketLegend } from './TaxBracketStack';
import { IncomeSourcesGroup } from './IncomeSourceBar';
import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface IncomeFlowPanelProps {
  breakdown: TaxBreakdown;
  strategy: WithdrawalStrategy;
}

export function IncomeFlowPanel({ breakdown, strategy }: IncomeFlowPanelProps) {
  // Build income sources for visualization
  const incomeSources = [];

  if (strategy.rothWithdrawal > 0) {
    incomeSources.push({
      label: 'Roth withdrawal',
      amount: strategy.rothWithdrawal,
      color: '#DBEAFE',
      explanation: 'Qualified Roth withdrawals are completely tax-free.',
      taxCharacter: 'Tax-free',
    });
  }

  if (breakdown.ordinaryIncome - breakdown.socialSecurityTaxable > 0) {
    incomeSources.push({
      label: 'qualified withdrawal',
      amount: breakdown.ordinaryIncome - breakdown.socialSecurityTaxable,
      color: '#F3E8FF',
      explanation: 'Traditional 401(k)/IRA withdrawals are taxed as ordinary income.',
      taxCharacter: 'Ordinary income',
    });
  }

  if (breakdown.socialSecurityGross > 0) {
    incomeSources.push({
      label: 'social security',
      amount: breakdown.socialSecurityGross,
      color: '#EDE9FE',
      explanation: `${((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0)}% of Social Security is taxable based on your provisional income.`,
      taxCharacter: `${((breakdown.socialSecurityTaxable / breakdown.socialSecurityGross) * 100).toFixed(0)}% taxable`,
    });
  }

  if (breakdown.longTermCapitalGains > 0) {
    incomeSources.push({
      label: 'capital gains',
      amount: breakdown.longTermCapitalGains,
      color: '#D1FAE5',
      explanation: 'Long-term capital gains are taxed at preferential rates (0%, 15%, or 20%).',
      taxCharacter: `${breakdown.capitalGainsBracket.rate}% cap gains rate`,
    });
  }

  return (
    <div className="panel h-full">
      <h3 className="font-semibold text-gray-700 mb-4">This Year</h3>

      <div className="grid grid-cols-4 gap-4 h-80">
        {/* Income Sources */}
        <div className="col-span-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Income Sources</p>
          <IncomeSourcesGroup sources={incomeSources} height={240} />
        </div>

        {/* Tax Treatment - Bracket Stack */}
        <div className="col-span-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Tax Treatment</p>
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <TaxBracketStack bracketFill={breakdown.bracketFill} totalHeight={200} />
            </div>
            {/* Tax-free portion */}
            {strategy.rothWithdrawal > 0 && (
              <Tooltip
                content={
                  <HoverCard
                    title="Tax-Free Income"
                    items={[
                      { label: 'Roth withdrawal', value: formatCurrency(strategy.rothWithdrawal) },
                    ]}
                    explanation="Roth withdrawals are not subject to federal income tax."
                  />
                }
                position="left"
              >
                <div
                  className="w-full mt-2 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: '#A7F3D0',
                    height: 40,
                  }}
                >
                  <span className="text-xs font-medium text-gray-700">tax free</span>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="col-span-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Deductions</p>
          <div className="flex flex-col items-center justify-end h-60">
            <Tooltip
              content={
                <HoverCard
                  title={`${breakdown.deductionType === 'standard' ? 'Standard' : 'Itemized'} Deduction`}
                  items={[
                    { label: 'Amount', value: formatCurrency(breakdown.deductions) },
                  ]}
                  explanation="Deductions reduce your taxable income, lowering your tax liability."
                />
              }
              position="left"
            >
              <div
                className="w-16 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: '#E5E7EB',
                  height: 60,
                }}
              >
                <span className="text-xs text-gray-600 text-center">deductions</span>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Taxes (Result) */}
        <div className="col-span-1">
          <p className="text-xs text-gray-500 mb-2 text-center">Taxes</p>
          <div className="flex flex-col items-center justify-end h-60">
            <Tooltip
              content={
                <HoverCard
                  title="Total Taxes"
                  items={[
                    { label: 'Ordinary income tax', value: formatCurrency(breakdown.ordinaryIncomeTax) },
                    { label: 'Capital gains tax', value: formatCurrency(breakdown.capitalGainsTax) },
                    { label: 'Total', value: formatCurrency(breakdown.totalTax) },
                  ]}
                  explanation={`Effective tax rate: ${formatPercent(breakdown.effectiveRate)}`}
                />
              }
              position="left"
            >
              <div
                className="w-16 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: '#86EFAC',
                  height: Math.max(40, (breakdown.totalTax / breakdown.grossIncome) * 200),
                }}
              >
                <span className="text-xs font-medium text-gray-700">
                  {formatCurrency(breakdown.totalTax)}
                </span>
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total income</p>
            <p className="text-xl font-bold">{formatCurrency(breakdown.grossIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total taxes</p>
            <p className="text-xl font-bold">{formatCurrency(breakdown.totalTax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">After-tax income</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(breakdown.afterTaxIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Effective tax rate</p>
            <p className="text-xl font-bold text-blue-600">{formatPercent(breakdown.effectiveRate)}</p>
          </div>
        </div>
      </div>

      {/* Bracket Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Tax Brackets:</p>
        <BracketLegend />
      </div>
    </div>
  );
}
