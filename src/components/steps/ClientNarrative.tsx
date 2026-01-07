import { useMemo } from 'react';
import { usePlan } from '../../context/PlanContext';
import { generateNarrative, generateShortSummary } from '../../engine/narrativeGenerator';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export function ClientNarrative() {
  const { state, setStep } = usePlan();
  const { portfolio, strategy, taxBreakdown, goal, viewMode } = state;

  // Generate narrative
  const narrative = useMemo(() => {
    if (!strategy || !taxBreakdown || !goal || !portfolio) return null;
    return generateNarrative(strategy, taxBreakdown, goal, portfolio);
  }, [strategy, taxBreakdown, goal, portfolio]);

  // Generate short summary for export
  const shortSummary = useMemo(() => {
    if (!strategy || !taxBreakdown) return '';
    return generateShortSummary(strategy, taxBreakdown);
  }, [strategy, taxBreakdown]);

  if (!strategy || !taxBreakdown || !goal || !portfolio || !narrative) {
    return (
      <div className="card">
        <p className="text-gray-500">Please complete the income planning step first.</p>
        <button onClick={() => setStep('plan')} className="btn-primary mt-4">
          Go to Income Planner
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shortSummary);
    alert('Summary copied to clipboard!');
  };

  // Client view - clean, narrative-focused
  if (viewMode === 'client') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card print:shadow-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {narrative.headline}
          </h1>

          <div className="space-y-8">
            {narrative.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  {section.title}
                </h2>
                <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Summary Box */}
          <div className="mt-8 p-4 sm:p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">At a Glance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(taxBreakdown.grossIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Taxes</p>
                <p className="text-2xl font-bold">{formatCurrency(taxBreakdown.totalTax)}</p>
                {taxBreakdown.stateTax > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Federal: {formatCurrency(taxBreakdown.ordinaryIncomeTax + taxBreakdown.capitalGainsTax)} / State: {formatCurrency(taxBreakdown.stateTax)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">After-Tax Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(taxBreakdown.afterTaxIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Effective Tax Rate</p>
                <p className="text-2xl font-bold text-blue-600">{formatPercent(taxBreakdown.effectiveRate)}</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-gray-400 text-center">
            {narrative.disclaimer}
          </p>
        </div>
      </div>
    );
  }

  // Advisor view - full controls and export options
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Client Summary</h2>
          <p className="mt-1 text-gray-600 text-sm sm:text-base">
            A clear, jargon-free explanation of the plan for your client.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={handleCopyToClipboard} className="btn-secondary text-sm">
            Copy to Clipboard
          </button>
          <button onClick={handlePrint} className="btn-primary text-sm">
            Print / PDF
          </button>
        </div>
      </div>

      {/* Preview Card */}
      <div className="card max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {narrative.headline}
        </h1>

        <div className="space-y-8">
          {narrative.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                {section.title}
              </h2>
              <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Summary Box */}
        <div className="mt-8 p-4 sm:p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-4">At a Glance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-xl font-bold">{formatCurrency(taxBreakdown.grossIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Taxes</p>
              <p className="text-xl font-bold">{formatCurrency(taxBreakdown.totalTax)}</p>
              {taxBreakdown.stateTax > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Fed: {formatCurrency(taxBreakdown.ordinaryIncomeTax + taxBreakdown.capitalGainsTax)} / State: {formatCurrency(taxBreakdown.stateTax)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">After-Tax Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(taxBreakdown.afterTaxIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Effective Tax Rate</p>
              <p className="text-xl font-bold text-blue-600">{formatPercent(taxBreakdown.effectiveRate)}</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-gray-400 text-center">
          {narrative.disclaimer}
        </p>
      </div>

      {/* What the Client Will See Section */}
      <div className="card card-warning print:hidden">
        <h3 className="font-semibold text-gray-900 mb-2">Advisor Note</h3>
        <p className="text-sm text-gray-600">
          Switch to "Client" view mode in the header to see exactly what your client will see.
          The client view hides the step navigation and presents only the narrative summary.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between print:hidden">
        <button onClick={() => setStep('plan')} className="btn-secondary">
          Back to Planner
        </button>
        <button onClick={() => setStep('goal')} className="btn-secondary">
          Start Over
        </button>
      </div>
    </div>
  );
}
