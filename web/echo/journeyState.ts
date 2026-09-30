export type JourneyPhase = 'welcome' | 'arrival' | 'flower' | 'wind' | 'complete';
export type JourneyStep = 'arrival' | 'flower' | 'wind';
export type JourneyInputMode = 'microphone' | 'touch';

export const WIND_ROUND_MS = 1200;
export const WIND_REST_MS = 1000;
export const WIND_ROUNDS = 3;

export interface JourneyState {
  phase: JourneyPhase;
  inputMode: JourneyInputMode;
  inputSources: JourneyInputMode[];
  progress: number;
  rounds: number;
  restMs: number;
  needsRelease: boolean;
  quietMs: number;
  sparks: number;
  completed: JourneyStep[];
  elapsedMs: number;
}

export interface SavedJourney {
  version: 1;
  phase: Exclude<JourneyPhase, 'welcome'>;
  inputMode: JourneyInputMode;
  inputSources: JourneyInputMode[];
  rounds: number;
  completed: JourneyStep[];
  elapsedSeconds: number;
}

export function initialJourney(): JourneyState {
  return { phase: 'welcome', inputMode: 'microphone', inputSources: [], progress: 0, rounds: 0,
    restMs: 0, needsRelease: false, quietMs: 0, sparks: 0, completed: [], elapsedMs: 0 };
}

/** Main start actions resume a saved chapter; only an explicit restart discards it. */
export function beginJourney(state: JourneyState, inputMode: JourneyInputMode, saved: SavedJourney | null = null): JourneyState {
  const base = state.phase === 'welcome' && saved ? resumeJourney(saved) : state;
  if (base.phase === 'complete') return base;
  return { ...base, phase: base.phase === 'welcome' ? 'arrival' : base.phase, inputMode, progress: 0 };
}

function usedInput(state: JourneyState): JourneyInputMode[] {
  return state.inputSources.includes(state.inputMode) ? state.inputSources : [...state.inputSources, state.inputMode];
}

export function awardJourneySpark(state: JourneyState): JourneyState {
  if (state.phase !== 'arrival') return state;
  return { ...state, phase: 'flower', sparks: 1, progress: 0, completed: ['arrival'], inputSources: usedInput(state) };
}

export function bloomJourneyFlower(state: JourneyState): JourneyState {
  if (state.phase !== 'flower' || state.sparks < 1 || state.completed.includes('flower')) return state;
  return { ...state, sparks: state.sparks - 1, completed: ['arrival', 'flower'] };
}

/** A short pause loses only the current breath, never completed rounds. */
export function advanceJourneyWind(state: JourneyState, active: boolean, deltaMs: number): JourneyState {
  if (state.phase !== 'wind' || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  // A stalled/background frame must never finish a breath on its own.
  const dt = Math.min(deltaMs, 100);
  if (state.needsRelease) {
    const quietMs = active ? 0 : state.quietMs + dt;
    return { ...state, progress: 0, restMs: Math.max(0, state.restMs - dt),
      quietMs, needsRelease: quietMs < 200 };
  }
  if (state.restMs > 0) return { ...state, progress: 0, restMs: Math.max(0, state.restMs - dt) };
  const progress = Math.max(0, state.progress + (active ? dt / WIND_ROUND_MS : -dt / 1600));
  if (progress + Number.EPSILON < 1) return { ...state, progress };
  const rounds = state.rounds + 1;
  if (rounds >= WIND_ROUNDS) {
    return { ...state, phase: 'complete', rounds: WIND_ROUNDS, progress: 1,
      restMs: 0, needsRelease: false, quietMs: 0, inputSources: usedInput(state),
      completed: ['arrival', 'flower', 'wind'] };
  }
  return { ...state, rounds, progress: 0, restMs: WIND_REST_MS,
    needsRelease: true, quietMs: 0, inputSources: usedInput(state) };
}

export function saveJourney(state: JourneyState): SavedJourney | null {
  if (state.phase === 'welcome') return null;
  return { version: 1, phase: state.phase, inputMode: state.inputMode, inputSources: [...state.inputSources],
    rounds: state.rounds, completed: [...state.completed],
    elapsedSeconds: Math.floor(state.elapsedMs / 1000) };
}

/** Read only coherent milestones; partial input and media never enter storage. */
export function readSavedJourney(raw: string | null): SavedJourney | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    if (item.version !== 1 || typeof item.phase !== 'string' || !['arrival', 'flower', 'wind', 'complete'].includes(item.phase) ||
      typeof item.inputMode !== 'string' || !['microphone', 'touch'].includes(item.inputMode) ||
      !Number.isInteger(item.rounds) || Number(item.rounds) < 0 || Number(item.rounds) > WIND_ROUNDS ||
      typeof item.elapsedSeconds !== 'number' || !Number.isFinite(item.elapsedSeconds) ||
      item.elapsedSeconds < 0 || item.elapsedSeconds > 86400 || !Array.isArray(item.completed)) return null;
    const steps = item.completed as unknown[];
    const sequence: JourneyStep[] = ['arrival', 'flower', 'wind'];
    if (steps.length > 3 || steps.some((step, i) => step !== sequence[i])) return null;
    if (item.phase === 'arrival' && (steps.length !== 0 || item.rounds !== 0)) return null;
    if (item.phase === 'flower' && (steps.length < 1 || steps.length > 2 || item.rounds !== 0)) return null;
    if (item.phase === 'wind' && (steps.length !== 2 || Number(item.rounds) >= WIND_ROUNDS)) return null;
    if (item.phase === 'complete' && (steps.length !== 3 || item.rounds !== WIND_ROUNDS)) return null;
    // Accept the first schema version while preserving the source of completed work.
    const sources = item.inputSources === undefined ? (steps.length ? [item.inputMode] : []) : item.inputSources;
    if (!Array.isArray(sources) || sources.length > 2 || new Set(sources).size !== sources.length ||
      sources.some((source) => source !== 'microphone' && source !== 'touch')) return null;
    if ((steps.length === 0) !== (sources.length === 0)) return null;
    if (item.phase === 'complete' && !sources.includes(item.inputMode)) return null;
    return { version: 1, phase: item.phase as SavedJourney['phase'],
      inputMode: item.inputMode as JourneyInputMode, rounds: Number(item.rounds),
      inputSources: sources as JourneyInputMode[], completed: steps as JourneyStep[], elapsedSeconds: Math.floor(item.elapsedSeconds) };
  } catch { return null; }
}

export function resumeJourney(saved: SavedJourney): JourneyState {
  return { ...initialJourney(), phase: saved.phase,
    inputMode: saved.phase === 'complete' ? saved.inputMode : 'touch', inputSources: [...saved.inputSources],
    completed: [...saved.completed], rounds: saved.rounds,
    needsRelease: saved.phase === 'wind' && saved.rounds > 0,
    restMs: saved.phase === 'wind' && saved.rounds > 0 ? WIND_REST_MS : 0,
    sparks: saved.completed.includes('arrival') && !saved.completed.includes('flower') ? 1 : 0,
    progress: saved.phase === 'complete' ? 1 : 0,
    elapsedMs: saved.elapsedSeconds * 1000 };
}

/** Quiet samples define the floor so a single clap during setup cannot spoil it. */
export function microphoneNoiseFloor(samples: number[]): number {
  const ordered = samples.filter((sample) => Number.isFinite(sample) && sample >= 0).sort((a, b) => a - b);
  if (!ordered.length) return 0.008;
  return Math.max(0.001, Math.min(0.08, ordered[Math.floor((ordered.length - 1) * 0.35)]));
}
