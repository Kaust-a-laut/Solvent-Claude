import { StateCreator } from 'zustand';
import { AppState } from './types';
import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL } from '../lib/config';
import { waterfallStateMachine } from '../lib/waterfallStateMachine';

export interface WaterfallStepData {
  status: 'idle' | 'processing' | 'completed' | 'error' | 'paused';
  data: any | null;
  error: string | null;
}

export interface WaterfallSlice {
  waterfall: {
    prompt: string;
    currentStep: 'architect' | 'reasoner' | 'executor' | 'reviewer' | null;
    steps: {
      architect: WaterfallStepData;
      reasoner: WaterfallStepData;
      executor: WaterfallStepData;
      reviewer: WaterfallStepData;
    };
  };
  waterfallAbortController: AbortController | null;
  
  setWaterfallPrompt: (prompt: string) => void;
  runFullWaterfall: (prompt: string, forceProceed?: boolean) => Promise<void>;
  proceedWithWaterfall: () => void;
  runWaterfallStep: (step: 'architect' | 'reasoner' | 'executor' | 'reviewer', input: any) => Promise<void>;
  cancelWaterfall: () => void;
  resetWaterfall: () => void;
}

const initialStepState: WaterfallStepData = { status: 'idle', data: null, error: null };

export const createWaterfallSlice: StateCreator<AppState, [], [], WaterfallSlice> = (set, get) => ({
  waterfall: {
    prompt: '',
    currentStep: null,
    steps: {
      architect: { ...initialStepState },
      reasoner: { ...initialStepState },
      executor: { ...initialStepState },
      reviewer: { ...initialStepState }
    }
  },
  waterfallAbortController: null,

  setWaterfallPrompt: (prompt) => set((state) => ({
    waterfall: { ...state.waterfall, prompt }
  })),

  resetWaterfall: () => {
    const { waterfallAbortController } = get();
    if (waterfallAbortController) waterfallAbortController.abort();
    
    set({
      waterfall: {
        prompt: '',
        currentStep: null,
        steps: {
          architect: { ...initialStepState },
          reasoner: { ...initialStepState },
          executor: { ...initialStepState },
          reviewer: { ...initialStepState }
        }
      },
      waterfallAbortController: null
    });
  },

  cancelWaterfall: () => {
    const { waterfallAbortController } = get();
    if (waterfallAbortController) {
      waterfallAbortController.abort();
      set((state) => ({
        waterfallAbortController: null,
        waterfall: {
          ...state.waterfall,
          steps: {
            ...state.waterfall.steps,
            [state.waterfall.currentStep || 'architect']: { 
              status: 'error', 
              data: null, 
              error: 'Cancelled by user.' 
            }
          }
        }
      }));
    }
  },

  proceedWithWaterfall: () => {
    const { waterfall } = get();
    get().runFullWaterfall(waterfall.prompt, true);
  },

  runFullWaterfall: async (prompt: string, forceProceed: boolean = false) => {
    const { globalProvider, notepadContent, openFiles, waterfallAbortController } = get();
    
    if (waterfallAbortController) waterfallAbortController.abort();

    const controller = new AbortController();
    
    // Only reset state if starting fresh (not proceeding from pause)
    if (!forceProceed) {
      set((state) => ({
        waterfallAbortController: controller,
        waterfall: { 
          ...state.waterfall, 
          prompt, 
          currentStep: 'architect', 
          steps: { 
            ...initialStepState,
            architect: { status: 'processing', data: { message: 'Analyzing requirements...' }, error: null },
            reasoner: { ...initialStepState },
            executor: { ...initialStepState },
            reviewer: { ...initialStepState }
          } 
        }
      }));
    } else {
      // If proceeding, we just update the controller and keep state
      set({ waterfallAbortController: controller });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/waterfall`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-solvent-secret': 'solvent_internal_dev_secret'
        },
        body: JSON.stringify({ prompt, globalProvider, notepadContent, openFiles, forceProceed }),
        signal: controller.signal
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              const { phase, message, estimate } = payload;

              set((state) => {
                // HANDLE GATING
                if (phase === 'gated') {
                   return {
                     waterfall: {
                       ...state.waterfall,
                       currentStep: 'architect',
                       steps: {
                         ...state.waterfall.steps,
                         architect: { 
                           status: 'paused', // New status for UI to show "Resume" button
                           data: { ...state.waterfall.steps.architect.data, estimate }, 
                           error: message 
                         }
                       }
                     }
                   };
                }

                if (phase === 'final') {
                   return {
                     waterfall: {
                       ...state.waterfall,
                       currentStep: 'reviewer',
                       steps: {
                         architect: { status: 'completed', data: payload.architect, error: null },
                         reasoner: { status: 'completed', data: payload.reasoner, error: null },
                         executor: { status: 'completed', data: payload.executor, error: null },
                         reviewer: { status: 'completed', data: payload.reviewer, error: null }
                       }
                     }
                   };
                } else if (phase === 'error') {
                   throw new Error(message || 'Unknown waterfall error');
                }

                const newWaterfall = waterfallStateMachine.transition(state.waterfall, phase, payload);
                return { waterfall: newWaterfall };
              });
            } catch (e) {
              // Ignore partial chunk errors
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Waterfall] Request cancelled');
      } else {
        set((state) => ({
          waterfall: {
            ...state.waterfall,
            steps: {
              ...state.waterfall.steps,
              [state.waterfall.currentStep || 'architect']: { 
                status: 'error', 
                data: null, 
                error: error.message 
              }
            }
          }
        }));
      }
    } finally {
      set({ waterfallAbortController: null });
    }
  },

  runWaterfallStep: async (step, input) => {
    // ... (same as before)
    const currentState = get().waterfall;
    if (!waterfallStateMachine.canTransition(currentState.currentStep, step)) {
       console.warn(`[Waterfall] Manual step blocked: ${currentState.currentStep} -> ${step}`);
    }

    set((state) => ({
      waterfall: {
        ...state.waterfall,
        currentStep: step,
        steps: {
          ...state.waterfall.steps,
          [step]: { ...state.waterfall.steps[step], status: 'processing', error: null }
        }
      }
    }));

    try {
      const { globalProvider } = get();
      const context = step === 'reviewer' ? { plan: get().waterfall.steps.reasoner.data } : undefined;

      const data = await fetchWithRetry(`${API_BASE_URL}/waterfall/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step,
          input,
          context,
          globalProvider
        })
      });

      set((state) => ({
        waterfall: {
          ...state.waterfall,
          steps: {
            ...state.waterfall.steps,
            [step]: { status: 'completed', data, error: null }
          }
        }
      }));
    } catch (error: any) {
      set((state) => ({
        waterfall: {
          ...state.waterfall,
          steps: {
            ...state.waterfall.steps,
            [step]: { ...state.waterfall.steps[step], status: 'error', error: error.message }
          }
        }
      }));
    }
  }
});