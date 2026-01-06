import { useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import type { FilingStatus, Portfolio, IncomeGoal, StateTaxMethod } from '../../types';
import { FILING_STATUS_LABELS, STANDARD_DEDUCTION } from '../../constants/tax2026';
import { formatCurrency } from '../../utils/formatters';

export function GoalDefinition() {
  const { setGoal, setPortfolio, setStep } = usePlan();

  // Form state
  const [targetType, setTargetType] = useState<'afterTax' | 'gross'>('afterTax');
  const [targetAmount, setTargetAmount] = useState<string>('150000');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('mfj');
  const [primaryAge, setPrimaryAge] = useState<string>('65');
  const [spouseAge, setSpouseAge] = useState<string>('63');
  const [useItemized, setUseItemized] = useState(false);
  const [itemizedAmount, setItemizedAmount] = useState<string>('');
  const [stateTaxMethod, setStateTaxMethod] = useState<StateTaxMethod>('none');
  const [stateTaxRate, setStateTaxRate] = useState<string>('');
  const [stateTaxFixed, setStateTaxFixed] = useState<string>('');
  const [planningHorizon, setPlanningHorizon] = useState<string>('95');

  // Portfolio state
  const [traditionalBalance, setTraditionalBalance] = useState<string>('800000');
  const [traditionalPriorYear, setTraditionalPriorYear] = useState<string>('');
  const [taxableBalance, setTaxableBalance] = useState<string>('500000');
  const [taxableBasis, setTaxableBasis] = useState<string>('300000');
  const [rothBalance, setRothBalance] = useState<string>('200000');
  const [ssAnnualBenefit, setSsAnnualBenefit] = useState<string>('36000');
  const [pensionAnnualBenefit, setPensionAnnualBenefit] = useState<string>('');
  const [pensionCola, setPensionCola] = useState<string>('0');

  const handleContinue = () => {
    // Build portfolio
    const priorYearBal = traditionalPriorYear ? parseFloat(traditionalPriorYear) : undefined;
    const portfolio: Portfolio = {
      traditional: traditionalBalance ? {
        type: 'traditional',
        balance: parseFloat(traditionalBalance) || 0,
        priorYearEndBalance: priorYearBal,
      } : null,
      taxable: taxableBalance ? {
        type: 'taxable',
        balance: parseFloat(taxableBalance) || 0,
        costBasis: parseFloat(taxableBasis) || 0,
        unrealizedGains: (parseFloat(taxableBalance) || 0) - (parseFloat(taxableBasis) || 0),
      } : null,
      roth: rothBalance ? {
        type: 'roth',
        balance: parseFloat(rothBalance) || 0,
      } : null,
      socialSecurity: ssAnnualBenefit ? {
        type: 'socialSecurity',
        annualBenefit: parseFloat(ssAnnualBenefit) || 0,
      } : null,
      pension: pensionAnnualBenefit ? {
        type: 'pension',
        annualBenefit: parseFloat(pensionAnnualBenefit) || 0,
        cola: (parseFloat(pensionCola) || 0) / 100,
      } : null,
    };

    // Build goal
    const goal: IncomeGoal = {
      targetType,
      amount: parseFloat(targetAmount) || 0,
      filingStatus,
      primaryAge: parseInt(primaryAge) || 65,
      spouseAge: spouseAge ? parseInt(spouseAge) : undefined,
      useItemizedDeductions: useItemized,
      itemizedAmount: useItemized ? parseFloat(itemizedAmount) || 0 : undefined,
      stateTaxMethod,
      stateTaxRate: stateTaxMethod === 'rate' ? (parseFloat(stateTaxRate) || 0) / 100 : undefined,
      stateTaxFixedAmount: stateTaxMethod === 'fixed' ? parseFloat(stateTaxFixed) || 0 : undefined,
      planningHorizon: parseInt(planningHorizon) || 95,
    };

    setPortfolio(portfolio);
    setGoal(goal);
    setStep('plan');
  };

  const standardDeduction = STANDARD_DEDUCTION[filingStatus];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Define Your Income Goal</h2>
        <p className="mt-1 text-gray-600">
          Start by telling us how much income you need and about your accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Income Goal */}
        <div className="card space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Income Target</h3>

          {/* Target Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to specify my target as:
            </label>
            <div className="inline-flex gap-2 p-1.5 bg-gray-100 rounded-lg">
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors
                ${targetType === 'afterTax' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  value="afterTax"
                  checked={targetType === 'afterTax'}
                  onChange={(e) => setTargetType(e.target.value as 'afterTax' | 'gross')}
                  className="sr-only"
                />
                <span className={`text-sm ${targetType === 'afterTax' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>After-tax income</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors
                ${targetType === 'gross' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  value="gross"
                  checked={targetType === 'gross'}
                  onChange={(e) => setTargetType(e.target.value as 'afterTax' | 'gross')}
                  className="sr-only"
                />
                <span className={`text-sm ${targetType === 'gross' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>Gross income</span>
              </label>
            </div>
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target {targetType === 'afterTax' ? 'After-Tax' : 'Gross'} Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-field pl-8"
                placeholder="150,000"
              />
            </div>
          </div>

          {/* Filing Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filing Status
            </label>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
              className="input-field"
            >
              {Object.entries(FILING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Ages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Age
              </label>
              <input
                type="text"
                value={primaryAge}
                onChange={(e) => setPrimaryAge(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-field"
                placeholder="65"
              />
            </div>
            {(filingStatus === 'mfj' || filingStatus === 'mfs') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spouse's Age
                </label>
                <input
                  type="text"
                  value={spouseAge}
                  onChange={(e) => setSpouseAge(e.target.value.replace(/[^0-9]/g, ''))}
                  className="input-field"
                  placeholder="63"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Through Age
              </label>
              <input
                type="text"
                value={planningHorizon}
                onChange={(e) => setPlanningHorizon(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-field"
                placeholder="95"
              />
              <p className="text-xs text-gray-500 mt-1">Planning horizon for projections</p>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={useItemized}
                onChange={(e) => setUseItemized(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Use itemized deductions
              </span>
            </label>
            {useItemized ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={itemizedAmount}
                  onChange={(e) => setItemizedAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="input-field pl-8"
                  placeholder="Itemized amount"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Standard deduction: {formatCurrency(standardDeduction)}
              </p>
            )}
          </div>

          {/* State Taxes */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State Income Tax
            </label>
            <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
              {(['none', 'rate', 'fixed'] as const).map((method) => (
                <label
                  key={method}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm
                    ${stateTaxMethod === method ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    value={method}
                    checked={stateTaxMethod === method}
                    onChange={(e) => setStateTaxMethod(e.target.value as StateTaxMethod)}
                    className="sr-only"
                  />
                  {method === 'none' ? 'None' : method === 'rate' ? 'Flat rate' : 'Fixed amount'}
                </label>
              ))}
            </div>
            {stateTaxMethod === 'rate' && (
              <div className="relative">
                <input
                  type="text"
                  value={stateTaxRate}
                  onChange={(e) => setStateTaxRate(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="input-field pr-8"
                  placeholder="5.5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                <p className="text-xs text-gray-500 mt-1">Applied to federal taxable income</p>
              </div>
            )}
            {stateTaxMethod === 'fixed' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={stateTaxFixed}
                  onChange={(e) => setStateTaxFixed(e.target.value.replace(/[^0-9]/g, ''))}
                  className="input-field pl-8"
                  placeholder="5000"
                />
                <p className="text-xs text-gray-500 mt-1">Your estimated state tax liability</p>
              </div>
            )}
            {stateTaxMethod === 'none' && (
              <p className="text-xs text-gray-500">
                Select if you live in a state with no income tax (e.g., FL, TX, NV)
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Portfolio */}
        <div className="card space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Accounts</h3>

          {/* Traditional (401k/IRA) */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Traditional 401(k) / IRA
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={traditionalBalance}
                    onChange={(e) => setTraditionalBalance(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field pl-8"
                    placeholder="800,000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prior Year-End (for RMD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={traditionalPriorYear}
                    onChange={(e) => setTraditionalPriorYear(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field pl-8"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Pre-tax retirement savings. Prior year-end balance used for RMD calculation (defaults to current if blank).</p>
          </div>

          {/* Taxable Brokerage */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Taxable Brokerage Account
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={taxableBalance}
                    onChange={(e) => setTaxableBalance(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field pl-8"
                    placeholder="500,000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cost Basis</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={taxableBasis}
                    onChange={(e) => setTaxableBasis(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field pl-8"
                    placeholder="300,000"
                  />
                </div>
              </div>
            </div>
            {taxableBalance && taxableBasis && (
              <p className="text-xs text-gray-500">
                Unrealized gains: {formatCurrency((parseFloat(taxableBalance) || 0) - (parseFloat(taxableBasis) || 0))}
              </p>
            )}
          </div>

          {/* Roth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roth 401(k) / Roth IRA Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={rothBalance}
                onChange={(e) => setRothBalance(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-field pl-8"
                placeholder="200,000"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Tax-free withdrawals</p>
          </div>

          {/* Portfolio Summary */}
          {(() => {
            const totalPortfolio =
              (parseFloat(traditionalBalance) || 0) +
              (parseFloat(taxableBalance) || 0) +
              (parseFloat(rothBalance) || 0);
            const fourPercentWithdrawal = totalPortfolio * 0.04;
            const ssIncome = parseFloat(ssAnnualBenefit) || 0;
            const pensionIncome = parseFloat(pensionAnnualBenefit) || 0;
            const sustainableGross = fourPercentWithdrawal + ssIncome + pensionIncome;
            const goalAmount = parseFloat(targetAmount) || 0;
            // For gross goals, compare directly. For after-tax, we can't easily compare without running tax calc
            const isGrossGoal = targetType === 'gross';
            const exceedsSustainable = isGrossGoal && goalAmount > sustainableGross;

            return totalPortfolio > 0 ? (
              <div className={`p-4 rounded-lg border ${exceedsSustainable ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Portfolio</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPortfolio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">4% Withdrawal</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(fourPercentWithdrawal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">+ Income = Gross</p>
                    <p className={`text-lg font-bold ${exceedsSustainable ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(sustainableGross)}
                    </p>
                  </div>
                </div>
                {exceedsSustainable && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-sm text-red-700">
                      ⚠ Your {formatCurrency(goalAmount)} gross goal exceeds the {formatCurrency(sustainableGross)} sustainable gross income.
                    </p>
                  </div>
                )}
                {!isGrossGoal && goalAmount > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Sustainability check available on next page with actual tax calculations
                  </p>
                )}
                {isGrossGoal && !exceedsSustainable && (
                  <p className="text-xs text-gray-500 mt-2">
                    4% rule suggests a safe starting withdrawal rate for 30-year retirement
                  </p>
                )}
              </div>
            ) : null;
          })()}

          {/* Social Security */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Social Security Annual Benefit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={ssAnnualBenefit}
                onChange={(e) => setSsAnnualBenefit(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-field pl-8"
                placeholder="36,000"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Combined household benefit</p>
          </div>

          {/* Pension */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Pension Income (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Annual Benefit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={pensionAnnualBenefit}
                    onChange={(e) => setPensionAnnualBenefit(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field pl-8"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Annual COLA</label>
                <div className="relative">
                  <input
                    type="text"
                    value={pensionCola}
                    onChange={(e) => setPensionCola(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="input-field pr-8"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Pension income is taxed as ordinary income (100% taxable)</p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button onClick={handleContinue} className="btn-primary">
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}
