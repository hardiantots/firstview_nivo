import { JourneyState } from './domain';

export function hasJourneyMotivation(state: JourneyState) {
  return !!state.ownReason?.trim() || !!state.motivations?.some((reason) => reason.trim());
}

/** Use persisted journey data; a browser flag cannot finish another account's setup. */
export function needsJourneySetup(state: JourneyState) {
  const hasPlan = !!(state.targetQuitDate || state.actualQuitDate || state.reduceFirst);
  const hasSavedSetup =
    state.history.some((entry) => entry.type === 'reasons') &&
    state.history.some((entry) => entry.type === 'plan');
  // Existing users can keep their current flow, including intentionally cleared reasons.
  const hasActivity =
    Object.values(state.daily).some((record) => record.status === 'reported') ||
    state.checkins.length > 0 ||
    state.slips.length > 0 ||
    (state.cravingEvents?.length ?? 0) > 0 ||
    (state.lessonCompletions?.length ?? 0) > 0;
  return !(hasPlan && hasJourneyMotivation(state)) && !hasSavedSetup && !hasActivity;
}
