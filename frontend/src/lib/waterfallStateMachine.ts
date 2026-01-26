export type WaterfallPhase = 'architect' | 'reasoner' | 'executor' | 'reviewer';
export type StepStatus = 'idle' | 'processing' | 'completed' | 'error';

const VALID_TRANSITIONS: Record<WaterfallPhase, WaterfallPhase[]> = {
  architect: ['reasoner'],
  reasoner: ['executor'],
  executor: ['reviewer'],
  reviewer: ['executor'] // Loop back for retries
};

export const waterfallStateMachine = {
  canTransition(current: WaterfallPhase | null, next: WaterfallPhase): boolean {
    if (!current) return next === 'architect'; // Initial start
    if (current === next) return true; // Re-entrant updates (processing -> completed)
    return VALID_TRANSITIONS[current]?.includes(next) || false;
  },

  /**
   * Validates and returns the new full state object if valid, throws otherwise.
   */
  transition(
    currentState: any, 
    phase: string, 
    payload: any
  ): any {
    const nextStep = this.mapPhaseToStep(phase);
    
    // Allow 'retrying' as a special pseudo-phase that maps to Executor but implies a loop
    if (phase === 'retrying') {
       if (currentState.currentStep !== 'reviewer') {
         console.warn(`[StateMachine] Invalid retry trigger from ${currentState.currentStep}`);
       }
       return {
         ...currentState,
         currentStep: 'executor',
         steps: {
           ...currentState.steps,
           reviewer: { status: 'error', error: payload.message }, // Mark review as failed
           executor: { status: 'processing', data: { message: 'Refining code based on feedback...' }, error: null }
         }
       };
    }

    if (!nextStep) return currentState; // Ignore unknown phases like 'final' handled separately

    // Strict Transition Check
    if (currentState.currentStep && !this.canTransition(currentState.currentStep, nextStep)) {
       console.warn(`[StateMachine] Invalid transition blocked: ${currentState.currentStep} -> ${nextStep}`);
       return currentState;
    }

    // Auto-complete previous step
    const newState = { ...currentState, currentStep: nextStep };
    const prevStep = this.getPreviousStep(nextStep);
    
    if (prevStep && currentState.steps[prevStep].status !== 'completed') {
       newState.steps[prevStep] = { ...newState.steps[prevStep], status: 'completed' };
    }

    newState.steps[nextStep] = { 
      status: 'processing', 
      data: payload, 
      error: null 
    };

    return newState;
  },

  mapPhaseToStep(phase: string): WaterfallPhase | null {
    if (phase === 'architecting') return 'architect';
    if (phase === 'reasoning') return 'reasoner';
    if (phase === 'executing') return 'executor';
    if (phase === 'reviewing') return 'reviewer';
    return null;
  },

  getPreviousStep(step: WaterfallPhase): WaterfallPhase | null {
    if (step === 'reasoner') return 'architect';
    if (step === 'executor') return 'reasoner';
    if (step === 'reviewer') return 'executor';
    return null;
  }
};
