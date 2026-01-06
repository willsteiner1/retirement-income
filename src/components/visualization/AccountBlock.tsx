import { Tooltip, HoverCard } from './Tooltip';
import { formatCurrency } from '../../utils/formatters';

interface AccountBlockProps {
  name: string;
  balance: number;
  withdrawal: number;
  color: string;
  subdivisions?: { name: string; amount: number; color: string }[];
  explanation: string;
  maxHeight: number;
  maxBalance: number;
}

export function AccountBlock({
  name,
  balance,
  withdrawal,
  color,
  subdivisions,
  explanation,
  maxHeight,
  maxBalance,
}: AccountBlockProps) {
  // Calculate heights proportionally
  const heightRatio = balance / maxBalance;
  const blockHeight = Math.max(60, heightRatio * maxHeight);
  const withdrawalHeight = balance > 0 ? (withdrawal / balance) * blockHeight : 0;

  // Calculate subdivision heights
  const getSubdivisionHeight = (amount: number) => {
    return balance > 0 ? (amount / balance) * blockHeight : 0;
  };

  const tooltipContent = (
    <HoverCard
      title={name}
      items={[
        { label: 'Balance', value: formatCurrency(balance) },
        { label: 'Withdrawal', value: formatCurrency(withdrawal) },
        ...(subdivisions?.map(s => ({
          label: s.name,
          value: formatCurrency(s.amount),
        })) ?? []),
      ]}
      explanation={explanation}
    />
  );

  return (
    <Tooltip content={tooltipContent} position="right">
      <div className="relative" style={{ height: blockHeight }}>
        {/* Main block */}
        {subdivisions ? (
          // Block with subdivisions (like taxable with principal/gains)
          <div
            className={`w-full h-full rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex flex-col`}
          >
            {subdivisions.map((sub, i) => (
              <div
                key={i}
                className="flex items-end justify-center px-2"
                style={{
                  height: getSubdivisionHeight(sub.amount),
                  backgroundColor: sub.color,
                }}
              >
                {getSubdivisionHeight(sub.amount) > 30 && (
                  <span className="text-xs text-gray-600 truncate">{sub.name}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Simple block
          <div
            className={`w-full h-full rounded-lg border-2 border-dashed border-gray-300 flex items-end justify-center px-2 pb-2`}
            style={{ backgroundColor: color }}
          >
            <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
          </div>
        )}

        {/* Withdrawal overlay (outlined slice) */}
        {withdrawal > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 border-2 border-blue-600 rounded-b-lg bg-blue-600/10 pointer-events-none"
            style={{ height: withdrawalHeight }}
          />
        )}
      </div>
    </Tooltip>
  );
}
