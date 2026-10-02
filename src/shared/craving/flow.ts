import { JourneyAction } from '@/shared/journey/domain';

export type CravingStep = 'intensity' | 'practice' | 'reason' | 'result';
export type CravingFlowState = {
  step: CravingStep; intensity: number; trigger: string; note: string;
  startedAt: number; practice: 'breathing' | 'wave'; practiceStartedAt: number | null; endAt: number | null;
  outcome: 'passed' | 'ongoing' | 'smoked' | null; saved: boolean;
};
export type CravingFlowAction =
  | { type: 'intensity'; value: number }
  | { type: 'trigger'; value: string }
  | { type: 'note'; value: string }
  | { type: 'step'; step: CravingStep }
  | { type: 'practice'; value: 'breathing' | 'wave' }
  | { type: 'start_practice'; at: number; seconds: number }
  | { type: 'outcome'; value: 'passed' | 'ongoing' | 'smoked' }
  | { type: 'saved' }
  | { type: 'restart'; at: number };

export function beginCravingFlow(at = Date.now()): CravingFlowState {
  return { step: 'intensity', intensity: 5, trigger: '', note: '', startedAt: at, practice: 'breathing', practiceStartedAt: null, endAt: null, outcome: null, saved: false };
}
export function cravingFlowReducer(state: CravingFlowState, action: CravingFlowAction): CravingFlowState {
  if (action.type === 'restart') return beginCravingFlow(action.at);
  if (state.saved) return state;
  switch (action.type) {
    case 'intensity': return { ...state, intensity: Math.max(0, Math.min(10, Math.round(action.value))) };
    case 'trigger': return { ...state, trigger: action.value.slice(0, 60) };
    case 'note': return { ...state, note: action.value.slice(0, 500) };
    case 'step': return { ...state, step: action.step };
    case 'practice': return { ...state, practice: action.value, practiceStartedAt: null, endAt: null };
    case 'start_practice': return { ...state, practiceStartedAt: action.at, endAt: action.at + action.seconds * 1000 };
    case 'outcome': return { ...state, step: 'result', outcome: action.value };
    case 'saved': return { ...state, saved: true, endAt: null };
  }
}
export function cravingResultAction(state: CravingFlowState, at = Date.now()): JourneyAction {
  if (!state.outcome) throw new Error('Pilih hasilnya terlebih dahulu.');
  return {
    type: 'craving_event', occurredAt: new Date(state.startedAt).toISOString(), intensity: state.intensity,
    trigger: state.trigger.trim(), outcome: state.outcome,
    durationSec: Math.min(86400, Math.max(0, Math.floor((at - state.startedAt) / 1000))), note: state.note.trim(),
  };
}
export function breathingPhase(totalSeconds: number, left: number) {
  const cycle = Math.max(0, totalSeconds - left) % 10;
  return cycle < 4 ? { phase: 'inhale' as const, label: 'Tarik napas perlahan', count: 4 - cycle, seconds: 4 } : { phase: 'exhale' as const, label: 'Hembuskan perlahan', count: 10 - cycle, seconds: 6 };
}
export function countdownLabel(seconds: number) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`; }
