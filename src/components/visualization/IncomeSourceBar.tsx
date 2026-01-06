import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency } from '../../utils/formatters';

interface IncomeSourceBarProps {
  label: string;
  amount: number;
  maxAmount: number;
  color: string;
  explanation: string;
  taxCharacter: string;
  height?: number;
}

export function IncomeSourceBar({
  label,
  amount,
  maxAmount,
  color,
  explanation,
  taxCharacter,
  height = 200,
}: IncomeSourceBarProps) {
  const barHeight = maxAmount > 0 ? (amount / maxAmount) * height : 0;

  const tooltipContent = (
    <HoverCard
      title={label}
      items={[
        { label: 'Amount', value: formatCurrency(amount) },
        { label: 'Tax treatment', value: taxCharacter },
      ]}
      explanation={explanation}
    />
  );

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-end justify-center"
        style={{ height }}
      >
        <Tooltip content={tooltipContent} position="top">
          <div
            className="w-12 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: color,
              height: Math.max(barHeight, 4),
            }}
          />
        </Tooltip>
      </div>
      <p className="text-xs text-gray-600 mt-2 text-center max-w-16">{label}</p>
    </div>
  );
}

interface IncomeSourcesGroupProps {
  sources: {
    label: string;
    amount: number;
    color: string;
    explanation: string;
    taxCharacter: string;
  }[];
  height?: number;
}

export function IncomeSourcesGroup({ sources, height = 200 }: IncomeSourcesGroupProps) {
  const maxAmount = Math.max(...sources.map(s => s.amount), 1);

  return (
    <div className="flex items-end justify-around gap-2">
      {sources.map((source, i) => (
        <IncomeSourceBar
          key={i}
          {...source}
          maxAmount={maxAmount}
          height={height}
        />
      ))}
    </div>
  );
}
