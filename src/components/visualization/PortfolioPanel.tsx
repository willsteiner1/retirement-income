import type { Portfolio, WithdrawalStrategy } from '../../types';
import { AccountBlock } from './AccountBlock';
import { formatCurrency } from '../../utils/formatters';

interface PortfolioPanelProps {
  portfolio: Portfolio;
  strategy: WithdrawalStrategy;
}

export function PortfolioPanel({ portfolio, strategy }: PortfolioPanelProps) {
  // Calculate max balance for scaling
  const balances = [
    portfolio.taxable?.balance ?? 0,
    portfolio.traditional?.balance ?? 0,
    portfolio.roth?.balance ?? 0,
  ];
  const maxBalance = Math.max(...balances, 1);
  const maxHeight = 300;

  return (
    <div className="panel h-full">
      <h3 className="font-semibold text-gray-700 mb-4">Total Portfolio</h3>

      <div className="flex items-end justify-around gap-4 h-80">
        {/* Taxable Account */}
        {portfolio.taxable && portfolio.taxable.balance > 0 && (
          <div className="flex flex-col items-center flex-1">
            <AccountBlock
              name="Taxable"
              balance={portfolio.taxable.balance}
              withdrawal={strategy.taxableWithdrawal}
              color="#E0F2FE"
              subdivisions={[
                {
                  name: 'principal',
                  amount: portfolio.taxable.costBasis,
                  color: '#E0F2FE',
                },
                {
                  name: 'gains',
                  amount: portfolio.taxable.unrealizedGains,
                  color: '#BFDBFE',
                },
              ]}
              explanation="Taxable brokerage account. Gains are taxed at preferential capital gains rates."
              maxHeight={maxHeight}
              maxBalance={maxBalance}
            />
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">taxable withdrawal</p>
              <p className="text-lg font-semibold">{formatCurrency(strategy.taxableWithdrawal)}</p>
            </div>
          </div>
        )}

        {/* Roth Account */}
        {portfolio.roth && portfolio.roth.balance > 0 && (
          <div className="flex flex-col items-center flex-1">
            <AccountBlock
              name="Roth"
              balance={portfolio.roth.balance}
              withdrawal={strategy.rothWithdrawal}
              color="#DBEAFE"
              explanation="Roth 401(k)/IRA. Qualified withdrawals are completely tax-free."
              maxHeight={maxHeight}
              maxBalance={maxBalance}
            />
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">Roth withdrawal</p>
              <p className="text-lg font-semibold">{formatCurrency(strategy.rothWithdrawal)}</p>
            </div>
          </div>
        )}

        {/* Social Security */}
        {portfolio.socialSecurity && portfolio.socialSecurity.annualBenefit > 0 && (
          <div className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center px-2"
              style={{
                backgroundColor: '#EDE9FE',
                height: 80,
              }}
            >
              <span className="text-sm font-medium text-gray-700">Social Security</span>
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">Social security income</p>
              <p className="text-lg font-semibold">{formatCurrency(strategy.socialSecurityIncome)}</p>
            </div>
          </div>
        )}

        {/* Traditional Account */}
        {portfolio.traditional && portfolio.traditional.balance > 0 && (
          <div className="flex flex-col items-center flex-1">
            <AccountBlock
              name="401k"
              balance={portfolio.traditional.balance}
              withdrawal={strategy.traditionalWithdrawal}
              color="#F3E8FF"
              explanation="Traditional 401(k)/IRA. Withdrawals are taxed as ordinary income."
              maxHeight={maxHeight}
              maxBalance={maxBalance}
            />
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">401k withdrawal</p>
              <p className="text-lg font-semibold">{formatCurrency(strategy.traditionalWithdrawal)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Inputs:</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>401k withdrawal: <strong>{formatCurrency(strategy.traditionalWithdrawal)}</strong></span>
          <span>taxable withdrawal: <strong>{formatCurrency(strategy.taxableWithdrawal)}</strong></span>
          <span>Roth withdrawal: <strong>{formatCurrency(strategy.rothWithdrawal)}</strong></span>
          <span>Social security income: <strong>{formatCurrency(strategy.socialSecurityIncome)}</strong></span>
        </div>
      </div>
    </div>
  );
}
