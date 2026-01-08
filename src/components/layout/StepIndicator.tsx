import type { WorkflowStep } from '../../types';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; shortLabel: string; number: number }[] = [
  { id: 'goal', label: 'Define Goal', shortLabel: 'Goal', number: 1 },
  { id: 'plan', label: 'Plan Income', shortLabel: 'Plan', number: 2 },
  { id: 'narrative', label: 'Client Summary', shortLabel: 'Summary', number: 3 },
];

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <nav className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const isClickable = onStepClick && index <= currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle and label */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors
                ${isClickable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
                ${isCurrent ? 'bg-blue-50' : ''}
              `}
            >
              <span
                className={`
                  flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0
                  ${isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'}
                `}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </span>
              <span
                className={`
                  text-xs sm:text-sm font-medium whitespace-nowrap
                  ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                `}
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-4 sm:w-8 md:w-12 h-0.5 mx-1 sm:mx-2
                  ${index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
