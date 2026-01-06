import type { WorkflowStep } from '../../types';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; number: number }[] = [
  { id: 'goal', label: 'Define Goal', number: 1 },
  { id: 'plan', label: 'Plan Income', number: 2 },
  { id: 'narrative', label: 'Client Summary', number: 3 },
];

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <nav className="flex items-center justify-center space-x-4">
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
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                ${isClickable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
                ${isCurrent ? 'bg-blue-50' : ''}
              `}
            >
              <span
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                  ${isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
                  text-sm font-medium
                  ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-12 h-0.5 mx-2
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
