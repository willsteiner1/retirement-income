import { formatCurrency } from '../../utils/formatters';

interface WithdrawalSliderProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  color: string;
  description?: string;
  disabled?: boolean;
}

export function WithdrawalSlider({
  label,
  value,
  max,
  onChange,
  color,
  description,
  disabled = false,
}: WithdrawalSliderProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">
          of {formatCurrency(max)}
        </span>
      </div>

      {/* Value display */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {/* Track */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${percentage}%`,
                backgroundColor: color,
              }}
            />
          </div>
          {/* Slider input */}
          <input
            type="range"
            min={0}
            max={max}
            step={1000}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Number input */}
        <div className="relative w-28">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="text"
            value={value.toLocaleString()}
            onChange={(e) => {
              const num = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
              onChange(Math.min(num, max));
            }}
            disabled={disabled}
            className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded text-right disabled:bg-gray-50"
          />
        </div>
      </div>

      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}
