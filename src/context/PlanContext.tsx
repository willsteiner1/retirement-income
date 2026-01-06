import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  AppState,
  AppAction,
  Portfolio,
  IncomeGoal,
  WithdrawalStrategy,
  TaxBreakdown,
  WorkflowStep,
  ViewMode
} from '../types';

// Initial state
const initialState: AppState = {
  currentStep: 'goal',
  viewMode: 'advisor',
  portfolio: {
    taxable: null,
    traditional: null,
    roth: null,
    socialSecurity: null,
    pension: null,
  },
  goal: null,
  strategy: null,
  taxBreakdown: null,
};

// Reducer
function planReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_PORTFOLIO':
      return { ...state, portfolio: action.portfolio };
    case 'SET_GOAL':
      return { ...state, goal: action.goal };
    case 'SET_STRATEGY':
      return { ...state, strategy: action.strategy };
    case 'SET_TAX_BREAKDOWN':
      return { ...state, taxBreakdown: action.breakdown };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context types
interface PlanContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience actions
  setStep: (step: WorkflowStep) => void;
  setViewMode: (mode: ViewMode) => void;
  setPortfolio: (portfolio: Portfolio) => void;
  setGoal: (goal: IncomeGoal) => void;
  setStrategy: (strategy: WithdrawalStrategy) => void;
  setTaxBreakdown: (breakdown: TaxBreakdown) => void;
  reset: () => void;
}

// Create context
const PlanContext = createContext<PlanContextType | null>(null);

// Provider component
export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(planReducer, initialState);

  const value: PlanContextType = {
    state,
    dispatch,
    setStep: (step) => dispatch({ type: 'SET_STEP', step }),
    setViewMode: (mode) => dispatch({ type: 'SET_VIEW_MODE', mode }),
    setPortfolio: (portfolio) => dispatch({ type: 'SET_PORTFOLIO', portfolio }),
    setGoal: (goal) => dispatch({ type: 'SET_GOAL', goal }),
    setStrategy: (strategy) => dispatch({ type: 'SET_STRATEGY', strategy }),
    setTaxBreakdown: (breakdown) => dispatch({ type: 'SET_TAX_BREAKDOWN', breakdown }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

// Hook to use the context
export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
