import type { BracketFill } from '../../types';
import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency, formatPercentRaw } from '../../utils/formatters';

interface TaxBracketStackProps {
  bracketFill: BracketFill[];
  totalHeight?: number;
}

// Colors for each bracket rate
const BRACKET_COLORS: Record<number, string> = {
  10: '#D1FAE5', // green
  12: '#FEF3C7', // yellow
  22: '#FDE68A', // darker yellow
  24: '#FDBA74', // orange
  32: '#FCA5A5', // red
  35: '#FB7185', // pink-red
  37: '#F43F5E', // dark red
};

export function TaxBracketStack({ bracketFill, totalHeight = 300 }: TaxBracketStackProps) {
  // Calculate total taxable income for scaling
  const totalIncome = bracketFill.reduce((sum, b) => sum + b.incomeInBracket, 0);

  if (totalIncome === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No taxable income
      </div>
    );
  }

  // Filter to only brackets with income
  const filledBrackets = bracketFill.filter(b => b.incomeInBracket > 0);

  return (
    <div className="flex flex-col-reverse" style={{ height: totalHeight }}>
      {filledBrackets.map((bracket, index) => {
        const heightPercent = (bracket.incomeInBracket / totalIncome) * 100;
        const color = BRACKET_COLORS[bracket.rate] ?? '#E5E7EB';

        const tooltipContent = (
          <HoverCard
            title={`${bracket.rate}% Tax Bracket`}
            items={[
              { label: 'Income in bracket', value: formatCurrency(bracket.incomeInBracket) },
              { label: 'Tax from bracket', value: formatCurrency(bracket.taxFromBracket) },
              {
                label: 'Bracket range',
                value: `${formatCurrency(bracket.bracketMin)} - ${bracket.bracketMax === Infinity ? '∞' : formatCurrency(bracket.bracketMax)}`,
              },
            ]}
            explanation={`Income between ${formatCurrency(bracket.bracketMin)} and ${bracket.bracketMax === Infinity ? 'unlimited' : formatCurrency(bracket.bracketMax)} is taxed at ${bracket.rate}%.`}
          />
        );

        return (
          <Tooltip key={index} content={tooltipContent} position="left">
            <div
              className="w-full flex items-center justify-end px-2 border-b border-white/50 transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: color,
                height: `${heightPercent}%`,
                minHeight: heightPercent > 5 ? 24 : 8,
              }}
            >
              {heightPercent > 8 && (
                <span className="text-xs font-medium text-gray-700">
                  {formatPercentRaw(bracket.rate)}
                </span>
              )}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Component for showing bracket legend
export function BracketLegend() {
  const brackets = [
    { rate: 10, label: '10%' },
    { rate: 12, label: '12%' },
    { rate: 22, label: '22%' },
    { rate: 24, label: '24%' },
    { rate: 32, label: '32%' },
    { rate: 35, label: '35%' },
    { rate: 37, label: '37%' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {brackets.map(b => (
        <div key={b.rate} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: BRACKET_COLORS[b.rate] }}
          />
          <span className="text-xs text-gray-600">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
