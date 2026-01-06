import { usePlan } from '../../context/PlanContext';
import { StepIndicator } from './StepIndicator';
import { GoalDefinition } from '../steps/GoalDefinition';
import { IncomePlanner } from '../steps/IncomePlanner';
import { ClientNarrative } from '../steps/ClientNarrative';

export function AppShell() {
  const { state, setStep, setViewMode } = usePlan();
  const { currentStep, viewMode } = state;

  const renderStep = () => {
    switch (currentStep) {
      case 'goal':
        return <GoalDefinition />;
      case 'plan':
        return <IncomePlanner />;
      case 'narrative':
        return <ClientNarrative />;
      default:
        return <GoalDefinition />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Retirement Income Tool
              </h1>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('advisor')}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${viewMode === 'advisor'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}
                  `}
                >
                  Advisor
                </button>
                <button
                  onClick={() => setViewMode('client')}
                  className={`
                    px-3 py-1 text-sm font-medium rounded-md transition-colors
                    ${viewMode === 'client'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}
                  `}
                >
                  Client
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator (Advisor mode only) */}
      {viewMode === 'advisor' && (
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <StepIndicator
              currentStep={currentStep}
              onStepClick={setStep}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-400 text-center">
            Tax Year 2026 | Federal taxes only | For educational purposes
          </p>
        </div>
      </footer>
    </div>
  );
}
